import { describe, it, expect, beforeEach } from 'vitest'

import { createMemoryStore } from './store.js'
import { recordEvent, pruneEvents } from './events.js'

// ---------------------------------------------------------------------------
// TICKET 007 — PRD v2 §4 (Workstream C), criteria C1 + C4.
//
// Notes for the implementer
//
// * The DDL is NOT re-asserted here — `server/schema.sql` already has the
//   events table and `server/store.test.js` already covers it. This file only
//   pins `server/events.js`, the thin recorder over the store.
//
// * Required exports from `server/events.js`:
//
//     recordEvent(store, { type, payload, learner_id?, ts? }) -> Promise<row|null>
//       - `type` must be one of 'upstream' | 'grade' | 'client_error'.
//       - An unknown type RESOLVES TO null and writes nothing. It must NOT
//         throw: ticket 009's POST /events is fire-and-forget and must never
//         500 on partial garbage, and ticket 008 must never fail a proxy
//         request because of telemetry.
//       - `learner_id` is optional and defaults to null.
//       - The payload is shaped per the PRD §4 table; the listed keys must
//         round-trip through the store unchanged.
//
//     pruneEvents(store) -> Promise<number>
//       - Deletes events older than 30 days, returns the number deleted.
//       - Callable without booting the server (server/index.js calls it on
//         boot; that wiring is not asserted here).
//
// * No env, no network, no Postgres — a memory store is passed in directly.
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000
const daysAgo = (n) => new Date(Date.now() - n * DAY_MS)

const LEARNER = '11111111-1111-4111-8111-111111111111'

let store

beforeEach(() => {
  store = createMemoryStore()
})

// --- C1: recorder accepts the three types, rejects everything else ----------

describe('recordEvent type validation (C1)', () => {
  it('inserts an upstream event that is retrievable via queryEvents', async () => {
    await recordEvent(store, {
      type: 'upstream',
      payload: { route: '/tts', provider: 'elevenlabs', status: 200 },
    })

    const rows = await store.queryEvents({ type: 'upstream' })
    expect(rows).toHaveLength(1)
    expect(rows[0].type).toBe('upstream')
    expect(rows[0].payload.route).toBe('/tts')
  })

  it.each(['upstream', 'grade', 'client_error'])('accepts type %s', async (type) => {
    const row = await recordEvent(store, { type, payload: {} })

    expect(row).toBeTruthy()
    expect(await store.queryEvents({ type })).toHaveLength(1)
  })

  it.each([
    ['an unknown string', 'not_a_real_type'],
    ['a server-ish typo', 'upstreams'],
    ['undefined', undefined],
    ['null', null],
  ])('rejects %s: resolves null and writes no row', async (_label, type) => {
    const row = await recordEvent(store, { type, payload: { route: '/tts' } })

    expect(row).toBeNull()
    expect(await store.queryEvents({})).toHaveLength(0)
  })
})

// --- C1: payload shapes per the PRD §4 table -------------------------------

describe('recordEvent payload round-trips (C1)', () => {
  it('round-trips an upstream payload', async () => {
    const payload = {
      route: '/tts',
      provider: 'elevenlabs',
      status: 503,
      duration_ms: 1234,
      cache_hit: false,
      error: 'upstream_unreachable',
    }

    await recordEvent(store, { type: 'upstream', payload })

    const [row] = await store.queryEvents({ type: 'upstream' })
    expect(row.payload).toMatchObject(payload)
  })

  it('round-trips a grade payload', async () => {
    const payload = {
      word: 'manzana',
      node_ids: ['n1', 'n2'],
      result: 'fail',
      similarity: 0.42,
      band_before: 3,
      band_after: 2,
      screen: 'cocina',
    }

    await recordEvent(store, { type: 'grade', payload })

    const [row] = await store.queryEvents({ type: 'grade' })
    expect(row.payload).toMatchObject(payload)
    expect(row.payload.node_ids).toEqual(['n1', 'n2'])
  })

  it('round-trips a client_error payload', async () => {
    const payload = { kind: 'speech', message: 'no-speech', screen: 'cocina' }

    await recordEvent(store, { type: 'client_error', payload })

    const [row] = await store.queryEvents({ type: 'client_error' })
    expect(row.payload).toMatchObject(payload)
  })

  it('records the learner id when one is supplied', async () => {
    await recordEvent(store, {
      type: 'grade',
      learner_id: LEARNER,
      payload: { word: 'manzana' },
    })

    const [row] = await store.queryEvents({ type: 'grade' })
    expect(row.learner_id).toBe(LEARNER)
  })

  it('inserts with a null learner_id when none is supplied', async () => {
    const row = await recordEvent(store, { type: 'grade', payload: { word: 'pan' } })

    expect(row).toBeTruthy()
    const [stored] = await store.queryEvents({ type: 'grade' })
    expect(stored.learner_id).toBeNull()
  })
})

// --- C4: 30-day retention sweep --------------------------------------------

describe('pruneEvents 30-day retention (C4)', () => {
  const seed = async () => {
    await store.insertEvent({ type: 'upstream', payload: { age: 'ancient' }, ts: daysAgo(400) })
    await store.insertEvent({ type: 'grade', payload: { age: 'old' }, ts: daysAgo(31) })
    await store.insertEvent({ type: 'grade', payload: { age: 'young' }, ts: daysAgo(29) })
    await store.insertEvent({ type: 'client_error', payload: { age: 'fresh' }, ts: new Date() })
  }

  it('deletes rows older than 30 days and leaves newer rows untouched', async () => {
    await seed()

    await pruneEvents(store)

    const ages = (await store.queryEvents({})).map((r) => r.payload.age).sort()
    expect(ages).toEqual(['fresh', 'young'])
  })

  it('returns the number of rows deleted', async () => {
    await seed()

    expect(await pruneEvents(store)).toBe(2)
  })

  it('returns 0 and deletes nothing when every row is inside the window', async () => {
    await store.insertEvent({ type: 'grade', payload: { age: 'young' }, ts: daysAgo(1) })

    expect(await pruneEvents(store)).toBe(0)
    expect(await store.queryEvents({})).toHaveLength(1)
  })
})
