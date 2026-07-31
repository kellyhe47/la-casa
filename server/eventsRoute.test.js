import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'

import { createApp } from './app.js'
import { createMemoryStore } from './store.js'
import { resetProviderHealth } from './providerHealth.js'

// ---------------------------------------------------------------------------
// TICKET 009 — PRD v2 §4 (Workstream C), criterion C3.
//
// Notes for the implementer
//
// * REQUIRED SIGNATURE: `createApp({ store } = {})` — same as ticket 008. The
//   bare `createApp()` call must keep working (see the guard in
//   `server/upstreamEvents.test.js`).
//
// * `POST /events` takes `{ events: [{ type, payload }, ...] }` and writes each
//   accepted entry through the ticket-007 recorder.
//
// * Only `grade` and `client_error` may come from a client. `upstream` is
//   server-owned (ticket 008) and must be rejected here — the client must not
//   be able to forge proxy telemetry.
//
// * Fire-and-forget from the client: the endpoint must be fast and must NEVER
//   500 on partial garbage. A malformed entry is skipped, its valid siblings
//   are still written, and the response is still 2xx.
//
// * RESPONSE BODY: `{ accepted: <number> }` — how many events were written.
//   Extra keys are fine; `accepted` must be present and numeric.
//
// * `learner_id` comes from the `X-Learner-Id` request header, on every row of
//   the batch.
//
// * Mount `/events` above the SPA catch-all in `app.js`.
//
// * Not in scope: the client-side emitter (ticket 012).
// ---------------------------------------------------------------------------

const API_KEY_VARS = ['ANTHROPIC_API_KEY', 'ELEVENLABS_API_KEY', 'OPENAI_API_KEY']
const LEARNER = '33333333-3333-4333-8333-333333333333'

const GRADE = {
  type: 'grade',
  payload: {
    word: 'manzana',
    node_ids: ['n1'],
    result: 'pass',
    similarity: 0.91,
    band_before: 2,
    band_after: 3,
    screen: 'cocina',
  },
}

const CLIENT_ERROR = {
  type: 'client_error',
  payload: { kind: 'speech', message: 'no-speech', screen: 'cocina' },
}

let savedEnv
let store

beforeEach(() => {
  savedEnv = Object.fromEntries(API_KEY_VARS.map((k) => [k, process.env[k]]))
  for (const k of API_KEY_VARS) delete process.env[k]
  vi.spyOn(console, 'error').mockImplementation(() => {})
  resetProviderHealth()
  store = createMemoryStore()
  // Nothing in this file may reach the network.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new Error('POST /events must not make an upstream call')
    })
  )
})

afterEach(() => {
  for (const k of API_KEY_VARS) {
    if (savedEnv[k] === undefined) delete process.env[k]
    else process.env[k] = savedEnv[k]
  }
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  resetProviderHealth()
})

/** POST a batch, optionally with a learner header. Returns the response. */
const postEvents = (body, { learner } = {}) => {
  const req = request(createApp({ store })).post('/events')
  if (learner) req.set('X-Learner-Id', learner)
  return req.send(body)
}

const is2xx = (res) => {
  expect(res.status).toBeGreaterThanOrEqual(200)
  expect(res.status).toBeLessThan(300)
}

// --- C3: the happy path -----------------------------------------------------

describe('POST /events accepts client batches (C3)', () => {
  it('returns 2xx and writes one row for a single grade event', async () => {
    const res = await postEvents({ events: [GRADE] })

    is2xx(res)
    const rows = await store.queryEvents({ type: 'grade' })
    expect(rows).toHaveLength(1)
    expect(rows[0].payload).toMatchObject(GRADE.payload)
  })

  it('writes 3 rows for a batch of 3', async () => {
    const res = await postEvents({
      events: [GRADE, CLIENT_ERROR, { type: 'grade', payload: { word: 'pan' } }],
    })

    is2xx(res)
    expect(await store.queryEvents({})).toHaveLength(3)
  })

  it('reports how many events were accepted', async () => {
    const res = await postEvents({ events: [GRADE, CLIENT_ERROR] })

    is2xx(res)
    expect(res.body.accepted).toBe(2)
  })
})

// --- C3: the server owns `upstream` ----------------------------------------

describe('POST /events rejects server-owned types (C3)', () => {
  it('does not write an upstream event submitted by a client', async () => {
    const res = await postEvents({
      events: [
        { type: 'upstream', payload: { route: '/tts', provider: 'elevenlabs', status: 200 } },
      ],
    })

    is2xx(res)
    expect(await store.queryEvents({ type: 'upstream' })).toHaveLength(0)
    expect(res.body.accepted).toBe(0)
  })

  it('still writes the valid siblings of a forged upstream entry', async () => {
    const res = await postEvents({
      events: [{ type: 'upstream', payload: { route: '/tts' } }, GRADE],
    })

    is2xx(res)
    expect(await store.queryEvents({ type: 'upstream' })).toHaveLength(0)
    expect(await store.queryEvents({ type: 'grade' })).toHaveLength(1)
    expect(res.body.accepted).toBe(1)
  })
})

// --- C3: partial garbage must not 500 --------------------------------------

describe('POST /events survives partial garbage (C3)', () => {
  it('skips malformed entries, writes the valid ones, and still answers 2xx', async () => {
    const res = await postEvents({
      events: [
        null,
        GRADE,
        'not an object',
        { payload: { word: 'no type here' } },
        { type: 'nonsense', payload: {} },
        CLIENT_ERROR,
        42,
      ],
    })

    is2xx(res)
    expect(await store.queryEvents({ type: 'grade' })).toHaveLength(1)
    expect(await store.queryEvents({ type: 'client_error' })).toHaveLength(1)
    expect(await store.queryEvents({})).toHaveLength(2)
    expect(res.body.accepted).toBe(2)
  })

  it.each([
    ['an empty batch', { events: [] }],
    ['a body with no events key', {}],
    ['a non-array events value', { events: 'grade' }],
  ])('returns 2xx and writes nothing for %s', async (_label, body) => {
    const res = await postEvents(body)

    is2xx(res)
    expect(await store.queryEvents({})).toHaveLength(0)
    expect(res.body.accepted).toBe(0)
  })
})

// --- C3: learner id ---------------------------------------------------------

describe('POST /events learner attribution (C3)', () => {
  it('stamps X-Learner-Id onto every row in the batch', async () => {
    const res = await postEvents({ events: [GRADE, CLIENT_ERROR] }, { learner: LEARNER })

    is2xx(res)
    const rows = await store.queryEvents({})
    expect(rows).toHaveLength(2)
    for (const row of rows) expect(row.learner_id).toBe(LEARNER)
  })

  it('writes a null learner_id when the header is absent', async () => {
    await postEvents({ events: [GRADE] })

    const rows = await store.queryEvents({})
    expect(rows[0].learner_id).toBeNull()
  })
})
