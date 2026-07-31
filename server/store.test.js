import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, it, expect, beforeEach } from 'vitest'

import { createMemoryStore, createPgStore, getStore } from './store.js'

// ---------------------------------------------------------------------------
// Notes for the implementer
//
// * These tests never open a database connection. `createPgStore` is asserted
//   to exist but is never invoked.
// * `insertEvent` MUST accept an OPTIONAL `ts` (Date) to let callers pin an
//   event's timestamp. Without it, ordering / `since` / `deleteEventsOlderThan`
//   are only testable against wall-clock ties. When `ts` is omitted the store
//   assigns "now".
// * `upsertLearner(id)` MUST return the learner row `{id, created_at, last_seen}`.
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url))

const LEARNER_A = '11111111-1111-4111-8111-111111111111'
const LEARNER_B = '22222222-2222-4222-8222-222222222222'

// Fixed, explicitly-ordered timestamps. Never rely on wall-clock ties.
const T1 = new Date('2026-01-01T01:00:00.000Z')
const T2 = new Date('2026-01-01T02:00:00.000Z')
const T3 = new Date('2026-01-01T03:00:00.000Z')
const BETWEEN_T1_T2 = new Date('2026-01-01T01:30:00.000Z')
const BETWEEN_T2_T3 = new Date('2026-01-01T02:30:00.000Z')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const STORE_METHODS = [
  'insertEvent',
  'queryEvents',
  'deleteEventsOlderThan',
  'getAsset',
  'putAsset',
  'upsertLearner',
  'getLearnerState',
  'putLearnerState',
]

describe('store interface surface', () => {
  it('createMemoryStore() returns an object implementing every store method', () => {
    const store = createMemoryStore()
    expect(store).toBeTypeOf('object')
    expect(store).not.toBeNull()
    for (const method of STORE_METHODS) {
      expect(store[method], `missing store method: ${method}`).toBeTypeOf('function')
    }
    // createPgStore is deliberately NOT invoked anywhere in this suite:
    // calling it would open a pg pool. Only its existence is asserted.
    expect(createPgStore).toBeTypeOf('function')
  })
})

describe('events', () => {
  let store
  beforeEach(() => {
    store = createMemoryStore()
  })

  it('insertEvent assigns an id and a ts, and round-trips the row', async () => {
    const payload = { model: 'claude', cache_hit: false, nested: { ok: [1, 2] } }
    const row = await store.insertEvent({
      learner_id: LEARNER_A,
      type: 'upstream',
      payload,
    })

    expect(row.id).toBeDefined()
    expect(row.id).not.toBeNull()
    expect(row.ts).toBeInstanceOf(Date)
    expect(row.learner_id).toBe(LEARNER_A)
    expect(row.type).toBe('upstream')
    expect(row.payload).toEqual(payload)
  })

  it('insertEvent assigns distinct ids across inserts', async () => {
    const a = await store.insertEvent({ learner_id: LEARNER_A, type: 'grade', payload: {} })
    const b = await store.insertEvent({ learner_id: LEARNER_A, type: 'grade', payload: {} })
    expect(a.id).not.toBe(b.id)
  })

  it('queryEvents returns matching rows newest-first', async () => {
    // Inserted out of order on purpose; ordering must come from ts, not arrival.
    await store.insertEvent({ learner_id: LEARNER_A, type: 'grade', payload: { n: 2 }, ts: T2 })
    await store.insertEvent({ learner_id: LEARNER_A, type: 'grade', payload: { n: 1 }, ts: T1 })
    await store.insertEvent({ learner_id: LEARNER_A, type: 'grade', payload: { n: 3 }, ts: T3 })

    const rows = await store.queryEvents({})
    expect(rows.map((r) => r.payload.n)).toEqual([3, 2, 1])
    expect(rows.map((r) => r.ts.getTime())).toEqual([T3.getTime(), T2.getTime(), T1.getTime()])
  })

  it('queryEvents filters by type', async () => {
    await store.insertEvent({ learner_id: LEARNER_A, type: 'upstream', payload: { n: 1 }, ts: T1 })
    await store.insertEvent({ learner_id: LEARNER_A, type: 'grade', payload: { n: 2 }, ts: T2 })
    await store.insertEvent({ learner_id: LEARNER_B, type: 'client_error', payload: { n: 3 }, ts: T3 })

    const rows = await store.queryEvents({ type: 'grade' })
    expect(rows).toHaveLength(1)
    expect(rows[0].type).toBe('grade')
    expect(rows[0].payload).toEqual({ n: 2 })
  })

  it('queryEvents filters by since', async () => {
    await store.insertEvent({ learner_id: LEARNER_A, type: 'grade', payload: { n: 1 }, ts: T1 })
    await store.insertEvent({ learner_id: LEARNER_A, type: 'grade', payload: { n: 2 }, ts: T2 })
    await store.insertEvent({ learner_id: LEARNER_A, type: 'grade', payload: { n: 3 }, ts: T3 })

    // Cutoff sits strictly between events, so > and >= agree.
    const rows = await store.queryEvents({ since: BETWEEN_T1_T2 })
    expect(rows.map((r) => r.payload.n)).toEqual([3, 2])
  })

  it('queryEvents caps results at limit, keeping the newest', async () => {
    await store.insertEvent({ learner_id: LEARNER_A, type: 'grade', payload: { n: 1 }, ts: T1 })
    await store.insertEvent({ learner_id: LEARNER_A, type: 'grade', payload: { n: 2 }, ts: T2 })
    await store.insertEvent({ learner_id: LEARNER_A, type: 'grade', payload: { n: 3 }, ts: T3 })

    const rows = await store.queryEvents({ limit: 2 })
    expect(rows.map((r) => r.payload.n)).toEqual([3, 2])
  })

  it('queryEvents combines type, since and limit', async () => {
    await store.insertEvent({ learner_id: LEARNER_A, type: 'grade', payload: { n: 1 }, ts: T1 })
    await store.insertEvent({ learner_id: LEARNER_A, type: 'grade', payload: { n: 2 }, ts: T2 })
    await store.insertEvent({ learner_id: LEARNER_A, type: 'upstream', payload: { n: 9 }, ts: T3 })
    await store.insertEvent({ learner_id: LEARNER_A, type: 'grade', payload: { n: 3 }, ts: T3 })

    const rows = await store.queryEvents({ type: 'grade', since: BETWEEN_T1_T2, limit: 1 })
    expect(rows.map((r) => r.payload.n)).toEqual([3])
  })

  it('deleteEventsOlderThan removes only rows older than the cutoff and returns the count', async () => {
    await store.insertEvent({ learner_id: LEARNER_A, type: 'grade', payload: { n: 1 }, ts: T1 })
    await store.insertEvent({ learner_id: LEARNER_A, type: 'grade', payload: { n: 2 }, ts: T2 })
    await store.insertEvent({ learner_id: LEARNER_A, type: 'grade', payload: { n: 3 }, ts: T3 })

    // Cutoff sits strictly between T2 and T3: only T1 and T2 are "older".
    const deleted = await store.deleteEventsOlderThan(BETWEEN_T2_T3)
    expect(deleted).toBe(2)

    const rows = await store.queryEvents({})
    expect(rows.map((r) => r.payload.n)).toEqual([3])
  })

  it('deleteEventsOlderThan returns 0 when nothing is older than the cutoff', async () => {
    await store.insertEvent({ learner_id: LEARNER_A, type: 'grade', payload: { n: 3 }, ts: T3 })
    const deleted = await store.deleteEventsOlderThan(T1)
    expect(deleted).toBe(0)
    expect(await store.queryEvents({})).toHaveLength(1)
  })
})

describe('asset_cache', () => {
  let store
  beforeEach(() => {
    store = createMemoryStore()
  })

  it('getAsset returns null on a miss', async () => {
    expect(await store.getAsset('img:fish')).toBeNull()
  })

  it('putAsset stores an asset retrievable by getAsset with the full shape', async () => {
    const asset = {
      key: 'img:fish',
      kind: 'image',
      mime: 'image/png',
      bytes: Buffer.from('a fish', 'utf8'),
    }
    await store.putAsset(asset)

    const got = await store.getAsset('img:fish')
    expect(got).not.toBeNull()
    expect(got.key).toBe('img:fish')
    expect(got.kind).toBe('image')
    expect(got.mime).toBe('image/png')
  })

  it('bytes round-trips as a byte-identical Buffer', async () => {
    // Includes a NUL, a high byte, and a PNG magic run: anything that
    // stringifies the payload will corrupt at least one of these.
    const bytes = Buffer.from([0x00, 0xff, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x7f, 0x80])
    await store.putAsset({ key: 'tts:abc123', kind: 'tts', mime: 'audio/mpeg', bytes })

    const got = await store.getAsset('tts:abc123')
    expect(Buffer.isBuffer(got.bytes)).toBe(true)
    expect(got.bytes.length).toBe(bytes.length)
    expect(got.bytes.equals(bytes)).toBe(true)
    expect([...got.bytes]).toEqual([...bytes])
  })

  it('putAsset keys are independent and a second put on the same key overwrites', async () => {
    await store.putAsset({ key: 'k1', kind: 'image', mime: 'image/png', bytes: Buffer.from([1]) })
    await store.putAsset({ key: 'k2', kind: 'tts', mime: 'audio/mpeg', bytes: Buffer.from([2]) })
    await store.putAsset({ key: 'k1', kind: 'image', mime: 'image/webp', bytes: Buffer.from([3]) })

    const k1 = await store.getAsset('k1')
    const k2 = await store.getAsset('k2')
    expect(k1.mime).toBe('image/webp')
    expect(k1.bytes.equals(Buffer.from([3]))).toBe(true)
    expect(k2.bytes.equals(Buffer.from([2]))).toBe(true)
  })
})

describe('learners', () => {
  let store
  beforeEach(() => {
    store = createMemoryStore()
  })

  it('upsertLearner creates a learner row', async () => {
    const row = await store.upsertLearner(LEARNER_A)
    expect(row.id).toBe(LEARNER_A)
    expect(row.created_at).toBeInstanceOf(Date)
    expect(row.last_seen).toBeInstanceOf(Date)
  })

  it('upsertLearner called again refreshes last_seen and does not duplicate the row', async () => {
    const first = await store.upsertLearner(LEARNER_A)
    await store.putLearnerState(LEARNER_A, { graph: { a: 1 }, independence: 2 })

    await sleep(20)
    const second = await store.upsertLearner(LEARNER_A)

    // Same row: created_at is preserved (a duplicate insert would reset it).
    expect(second.id).toBe(LEARNER_A)
    expect(second.created_at.getTime()).toBe(first.created_at.getTime())
    // last_seen advanced.
    expect(second.last_seen.getTime()).toBeGreaterThan(first.last_seen.getTime())
    // The learner's existing state survived — it was an update, not a re-insert.
    expect(await store.getLearnerState(LEARNER_A)).toEqual({ graph: { a: 1 }, independence: 2 })
  })
})

describe('learner_state', () => {
  let store
  beforeEach(async () => {
    store = createMemoryStore()
    await store.upsertLearner(LEARNER_A)
    await store.upsertLearner(LEARNER_B)
  })

  it('getLearnerState returns null when absent', async () => {
    expect(await store.getLearnerState(LEARNER_A)).toBeNull()
  })

  it('putLearnerState stores {graph, independence} retrievable by getLearnerState', async () => {
    const graph = { nodes: { fish: { mastery: 0.4 } }, edges: [] }
    await store.putLearnerState(LEARNER_A, { graph, independence: 1 })

    expect(await store.getLearnerState(LEARNER_A)).toEqual({ graph, independence: 1 })
  })

  it('putLearnerState upserts — a second call with a different band overwrites, not appends', async () => {
    await store.putLearnerState(LEARNER_A, { graph: { v: 1 }, independence: 1 })
    await store.putLearnerState(LEARNER_A, { graph: { v: 2 }, independence: 3 })

    const state = await store.getLearnerState(LEARNER_A)
    expect(Array.isArray(state)).toBe(false)
    expect(state).toEqual({ graph: { v: 2 }, independence: 3 })
  })

  it('learner states are scoped per learner', async () => {
    await store.putLearnerState(LEARNER_A, { graph: { who: 'a' }, independence: 0 })
    await store.putLearnerState(LEARNER_B, { graph: { who: 'b' }, independence: 4 })

    expect(await store.getLearnerState(LEARNER_A)).toEqual({ graph: { who: 'a' }, independence: 0 })
    expect(await store.getLearnerState(LEARNER_B)).toEqual({ graph: { who: 'b' }, independence: 4 })
  })
})

describe('getStore()', () => {
  it('returns a working memory store when DATABASE_URL is unset', async () => {
    const saved = process.env.DATABASE_URL
    delete process.env.DATABASE_URL
    try {
      const store = await getStore()
      for (const method of STORE_METHODS) {
        expect(store[method], `missing store method: ${method}`).toBeTypeOf('function')
      }
      // Proof it is the memory implementation: a full round-trip with no
      // database process running and no network.
      await store.insertEvent({ learner_id: LEARNER_A, type: 'grade', payload: { n: 1 }, ts: T1 })
      const rows = await store.queryEvents({ type: 'grade' })
      expect(rows).toHaveLength(1)
      expect(rows[0].payload).toEqual({ n: 1 })
    } finally {
      if (saved === undefined) delete process.env.DATABASE_URL
      else process.env.DATABASE_URL = saved
    }
  })
})

describe('schema.sql', () => {
  // Read defensively so a missing schema.sql surfaces as failing assertions
  // rather than a suite-collection crash that hides every other test.
  let sql = ''
  try {
    sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8').toLowerCase()
  } catch {
    sql = ''
  }

  // Collapse whitespace so column assertions are formatting-independent.
  const flat = sql.replace(/\s+/g, ' ')

  const blockFor = (table) => {
    const m = flat.match(new RegExp(`create table (?:if not exists )?${table} \\((.*?)\\);`))
    return m ? m[1] : null
  }

  const TABLES = {
    events: [
      /id +bigserial +primary key/,
      /ts +timestamptz +not null +default now\(\)/,
      /learner_id +uuid/,
      /type +text +not null/,
      /payload +jsonb +not null/,
    ],
    asset_cache: [
      /key +text +primary key/,
      /kind +text +not null/,
      /mime +text +not null/,
      /bytes +bytea +not null/,
      /created_at +timestamptz +not null +default now\(\)/,
    ],
    learners: [
      /id +uuid +primary key/,
      /created_at +timestamptz +not null +default now\(\)/,
      /last_seen +timestamptz +not null +default now\(\)/,
    ],
    learner_state: [
      /learner_id +uuid +primary key +references learners\(id\)/,
      /graph +jsonb +not null/,
      /independence +int +not null/,
      /updated_at +timestamptz +not null +default now\(\)/,
    ],
  }

  for (const [table, columns] of Object.entries(TABLES)) {
    describe(table, () => {
      it('has a create table statement', () => {
        expect(blockFor(table), `no "create table ${table} (...)" found`).not.toBeNull()
      })

      it.each(columns.map((re) => [re.source, re]))(
        'declares column matching %s',
        (_label, re) => {
          const block = blockFor(table)
          expect(block, `no "create table ${table} (...)" found`).not.toBeNull()
          expect(block).toMatch(re)
        },
      )
    })
  }

  it('declares the events indexes from PRD §4.1', () => {
    expect(flat).toMatch(/create index[^;]*on events \(ts desc\)/)
    expect(flat).toMatch(/create index[^;]*on events \(type, ts desc\)/)
  })
})
