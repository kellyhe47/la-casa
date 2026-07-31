import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'

import { createApp } from './app.js'
import { createMemoryStore } from './store.js'

// ---------------------------------------------------------------------------
// TICKET 011 — PRD v2 §6 (Workstream E), criteria E1 + E3.
//
// Notes for the implementer
//
// * Two routes, mounted in `app.js` BEFORE the SPA catch-all (`app.get('*')`),
//   otherwise an unknown learner answers 200 index.html instead of 404:
//       GET /state/:id -> 200 { graph, independence }  | 404 when nothing saved
//       PUT /state/:id -> upsert  (200 | 201 | 204)
//
// * Both are scoped by the `X-Learner-Id` header. The header is REQUIRED, and
//   it must equal `:id`. A mismatch is 400 or 403 and must not read or write
//   state — a learner may only touch its own row.
//
// * A malformed uuid in the path is 400 (NOT 404 — 404 means "this learner has
//   no saved state", which is a different answer) and must not touch the store.
//
// * `PUT` upserts the `learners` row first (store.upsertLearner refreshes
//   last_seen), then `store.putLearnerState(id, {graph, independence})`.
//
// * `independence` is an INTEGER and must survive the round trip exactly. This
//   is the server-side twin of the E5 bug (`SkillGraph` hardcoding 3): if 7 is
//   saved, 7 comes back — never a default.
//
// * The GET body is exactly `{graph, independence}` — no extra keys, so the
//   client can hand it straight to the SkillGraph constructor.
//
// * The `learners` / `learner_state` DDL already exists in schema.sql and is
//   asserted by store.test.js — deliberately not re-asserted here.
// ---------------------------------------------------------------------------

const LEARNER = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'

const GRAPH = {
  nodes: [
    { id: 'pez', mastery: 0.8, attempts: [1, 0, 1] },
    { id: 'manzana', mastery: 0.4, attempts: [0, 0, 1] },
  ],
  version: 2,
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let savedEnv

beforeEach(() => {
  savedEnv = process.env.DATABASE_URL
  delete process.env.DATABASE_URL
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  if (savedEnv === undefined) delete process.env.DATABASE_URL
  else process.env.DATABASE_URL = savedEnv
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** Memory store with every learner-facing method observable. */
function spyStore() {
  const base = createMemoryStore()
  return {
    ...base,
    upsertLearner: vi.fn(base.upsertLearner),
    getLearnerState: vi.fn(base.getLearnerState),
    putLearnerState: vi.fn(base.putLearnerState),
  }
}

const untouched = (store) => {
  expect(store.getLearnerState).not.toHaveBeenCalled()
  expect(store.putLearnerState).not.toHaveBeenCalled()
  expect(store.upsertLearner).not.toHaveBeenCalled()
}

const getState = (app, id, learner = id) => {
  const req = request(app).get(`/state/${id}`)
  if (learner !== null) req.set('X-Learner-Id', learner)
  return req
}

const putState = (app, id, body, learner = id) => {
  const req = request(app).put(`/state/${id}`)
  if (learner !== null) req.set('X-Learner-Id', learner)
  return req.send(body)
}

const OK_PUT = [200, 201, 204]

// --- E3: read / write round trip -------------------------------------------

describe('GET /state/:id (E3)', () => {
  it('returns 404 for a learner with no saved state', async () => {
    const store = spyStore()

    const res = await getState(createApp({ store }), LEARNER)

    expect(res.status).toBe(404)
  })
})

describe('PUT then GET /state/:id (E3)', () => {
  it('returns exactly what was written', async () => {
    const store = spyStore()
    const app = createApp({ store })

    const put = await putState(app, LEARNER, { graph: GRAPH, independence: 7 })
    expect(OK_PUT).toContain(put.status)

    const res = await getState(app, LEARNER)

    expect(res.status).toBe(200)
    expect(res.body.graph).toEqual(GRAPH)
    expect(res.body.independence).toBe(7)
    expect(Object.keys(res.body).sort()).toEqual(['graph', 'independence'])
  })

  it('a second PUT overwrites — no duplicate row, GET reflects the new value', async () => {
    const store = spyStore()
    const app = createApp({ store })

    await putState(app, LEARNER, { graph: GRAPH, independence: 7 })
    const updated = { nodes: [{ id: 'pez', mastery: 1, attempts: [1, 1, 1] }], version: 3 }
    await putState(app, LEARNER, { graph: updated, independence: 9 })

    const res = await getState(app, LEARNER)

    expect(res.status).toBe(200)
    expect(res.body.graph).toEqual(updated)
    expect(res.body.independence).toBe(9)

    // The store holds one row, not two: reading it directly agrees with the API.
    expect(await store.getLearnerState(LEARNER)).toMatchObject({
      graph: updated,
      independence: 9,
    })

    // ...and the learner itself was upserted, not re-created.
    const rows = await Promise.all(store.upsertLearner.mock.results.map((r) => r.value))
    expect(rows.length).toBeGreaterThanOrEqual(2)
    expect(new Date(rows[0].created_at).getTime()).toBe(new Date(rows[1].created_at).getTime())
  })

  it('does not leak one learner’s state to another', async () => {
    const store = spyStore()
    const app = createApp({ store })

    await putState(app, LEARNER, { graph: GRAPH, independence: 7 })

    const res = await getState(app, OTHER)

    expect(res.status).toBe(404)
  })
})

// --- E1: the learners row ---------------------------------------------------

describe('PUT /state/:id maintains the learners row (E1)', () => {
  it('creates the learner row when it does not exist yet', async () => {
    const store = spyStore()

    await putState(createApp({ store }), LEARNER, { graph: GRAPH, independence: 5 })

    expect(store.upsertLearner).toHaveBeenCalledWith(LEARNER)
    const row = await store.upsertLearner.mock.results[0].value
    expect(row.id).toBe(LEARNER)
    expect(row.created_at).toBeTruthy()
  })

  it('refreshes last_seen on every write', async () => {
    const store = spyStore()
    const app = createApp({ store })

    await putState(app, LEARNER, { graph: GRAPH, independence: 5 })
    await sleep(15)
    await putState(app, LEARNER, { graph: GRAPH, independence: 6 })

    const rows = await Promise.all(store.upsertLearner.mock.results.map((r) => r.value))
    expect(rows.length).toBeGreaterThanOrEqual(2)

    const first = rows[0]
    const second = rows[rows.length - 1]
    expect(new Date(second.last_seen).getTime()).toBeGreaterThan(
      new Date(first.last_seen).getTime()
    )
    expect(new Date(second.created_at).getTime()).toBe(new Date(first.created_at).getTime())
  })
})

// --- E3: header scoping -----------------------------------------------------

const SCOPED = [
  { label: 'GET', call: (app, id, learner) => getState(app, id, learner) },
  {
    label: 'PUT',
    call: (app, id, learner) => putState(app, id, { graph: GRAPH, independence: 7 }, learner),
  },
]

describe.each(SCOPED)('$label /state/:id is scoped by X-Learner-Id (E3)', ({ call }) => {
  it('rejects a header that does not match the path id, and touches nothing', async () => {
    const store = spyStore()

    const res = await call(createApp({ store }), LEARNER, OTHER)

    expect([400, 403]).toContain(res.status)
    untouched(store)
  })

  it('rejects a request with no X-Learner-Id header at all', async () => {
    const store = spyStore()

    const res = await call(createApp({ store }), LEARNER, null)

    expect([400, 401, 403]).toContain(res.status)
    untouched(store)
  })
})

describe('a mismatched header cannot read another learner’s saved state (E3)', () => {
  it('does not return the row that exists for the path id', async () => {
    const store = spyStore()
    const app = createApp({ store })

    await putState(app, LEARNER, { graph: GRAPH, independence: 7 })

    const res = await getState(app, LEARNER, OTHER)

    expect([400, 403]).toContain(res.status)
    expect(JSON.stringify(res.body ?? {})).not.toContain('manzana')
  })

  it('a mismatched PUT does not overwrite the path learner’s row', async () => {
    const store = spyStore()
    const app = createApp({ store })

    await putState(app, LEARNER, { graph: GRAPH, independence: 7 })
    await putState(app, LEARNER, { graph: { nodes: [] }, independence: 1 }, OTHER)

    const res = await getState(app, LEARNER)
    expect(res.status).toBe(200)
    expect(res.body.independence).toBe(7)
    expect(res.body.graph).toEqual(GRAPH)
  })
})

// --- E3: uuid validation ----------------------------------------------------

const MALFORMED = ['not-a-uuid', '12345', 'abc-def-ghi', '11111111111141118111111111111111']

describe.each(MALFORMED)('a malformed learner id (%s) is rejected (E3)', (bad) => {
  it('answers 400 on GET without touching the store', async () => {
    const store = spyStore()

    const res = await getState(createApp({ store }), bad)

    expect(res.status).toBe(400)
    untouched(store)
  })

  it('answers 400 on PUT without touching the store', async () => {
    const store = spyStore()

    const res = await putState(createApp({ store }), bad, { graph: GRAPH, independence: 7 })

    expect(res.status).toBe(400)
    untouched(store)
  })
})

// --- E3 / E5 twin: independence must round-trip as a number -----------------

describe('independence round-trips exactly (the server-side twin of the E5 bug)', () => {
  it('saving 7 reads back 7 — NOT the default 3', async () => {
    const store = spyStore()
    const app = createApp({ store })

    await putState(app, LEARNER, { graph: GRAPH, independence: 7 })
    const res = await getState(app, LEARNER)

    expect(res.status).toBe(200)
    expect(res.body.independence).toBe(7)
    expect(res.body.independence).not.toBe(3)
    expect(typeof res.body.independence).toBe('number')
  })

  it.each([1, 2, 3, 5, 9, 10])('band %i survives the round trip', async (band) => {
    const store = spyStore()
    const app = createApp({ store })

    await putState(app, LEARNER, { graph: GRAPH, independence: band })
    const res = await getState(app, LEARNER)

    expect(res.status).toBe(200)
    expect(res.body.independence).toBe(band)
    expect(typeof res.body.independence).toBe('number')
  })
})
