import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'

import { createApp } from './app.js'
import { createMemoryStore } from './store.js'

// ---------------------------------------------------------------------------
// TICKET 019 — PRD v2 §9 (Workstream H), criteria H1, H2, H4.
//
// H3 (the Chart.js rendering) is ticket 020 and is MANUAL-VERIFY — there are no
// canvas/pixel assertions in this file. What is pinned here is the data the
// charts read and the gate that protects it.
//
// ===========================================================================
// CONTRACT THE IMPLEMENTER MUST MATCH
// ===========================================================================
//
// --- H1. The gate -----------------------------------------------------------
//
// * Shared secret lives in the `OBSERVABILITY_KEY` environment variable, and is
//   read PER REQUEST (not captured at createApp time) — a test flips it on an
//   already-constructed app.
// * Callers present it as the `key` query param: `/observability?key=…`.
// * The same gate covers `/observability` AND every `/debug/*` path
//   (PRD §12: "Debug routes leak learner data → shared-secret gate").
// * CLOSED BY DEFAULT: when `OBSERVABILITY_KEY` is unset or empty, every gated
//   route is denied. An unconfigured deploy must not become an open window onto
//   learner data.
// * Denials answer 401 or 403 (either is accepted) and must NEVER be the SPA.
//
// * ROUTE ORDER: these routes must be registered ABOVE `app.get('*')` in
//   `server/app.js`. `client/dist` exists in this repo, so the catch-all IS
//   active while these tests run — see the "SPA catch-all is live" guard below.
//
// * The dashboard document must contain the marker `id="observability-dashboard"`
//   and must NOT contain the SPA's `id="root"`.
//
// --- H2. GET /debug/metrics?window=1h ---------------------------------------
//
// Content-Type: application/json. Response envelope, EXACTLY these keys
// (extra keys are tolerated, these must be present):
//
//   {
//     window: '1h',                         // echo of the resolved window
//     bucket_ms: 300000,                    // 1h -> 5 min, 24h -> 60 min
//     from: '2026-07-31T11:00:00.000Z',     // ISO, = to - windowMs
//     to:   '2026-07-31T12:00:00.000Z',     // ISO, = request time
//     series: {
//       upstream: [ { bucket, provider, p95_ms, failures, count }, … ],
//       cache:    [ { bucket, provider, hits, misses, hit_rate }, … ],
//       learning: [ { bucket, attempts, passes, pass_rate, band }, … ],
//     }
//   }
//
//   - `bucket` is an ISO timestamp of the bucket START, floored to the bucket
//     size against the epoch: floor(ts / bucket_ms) * bucket_ms.
//   - Each series is a FLAT ARRAY OF BUCKET ROWS, ascending by `bucket`.
//     `upstream` and `cache` carry one row per (bucket, provider) pair.
//   - ONLY BUCKETS THAT HAVE DATA APPEAR. An empty events table therefore
//     yields three empty arrays inside a well-formed envelope — never a 500.
//   - Window filter: `from <= ts <= to`. Rows outside are excluded entirely.
//   - `window` accepts '1h' and '24h'. Missing or unrecognised -> '1h'.
//
//   p95_ms — NEAREST-RANK, no interpolation:
//     sort the bucket's `duration_ms` values ascending, take the value at
//     1-indexed position ceil(0.95 * N). Computed over ALL `upstream` rows for
//     that provider in that bucket, FAILURES INCLUDED. (The seeded distribution
//     below is chosen so that interpolating, or dropping failures, gives a
//     different number.)
//
//   failures — an `upstream` row is a failure when `payload.status >= 400`
//     OR `payload.error` is present. `count` is all rows in the bucket.
//
//   cache — `hits` = rows with `payload.cache_hit === true`, `misses` = the
//     rest; `hit_rate` = hits / (hits + misses).
//
//   learning — over `grade` rows: `attempts` = rows in bucket, `passes` = rows
//     with `payload.result === 'pass'`, `pass_rate` = passes / attempts, and
//     `band` = `payload.band_after` of the LAST grade row in the bucket by ts.
//
// --- H4. GET /debug/logs?key=… ----------------------------------------------
//
// text/html. Last 200 event rows, NEWEST FIRST, as a table. Each data row is a
// `<tr>` carrying `data-event-id="<events.id>"`. Error rows additionally carry
// the CSS class `error` on that same `<tr>`; non-error rows must not.
// A row is an error when it is a `client_error` event, or an `upstream` event
// with `payload.status >= 400` or a `payload.error`. No window filter.
// ---------------------------------------------------------------------------

const KEY_VAR = 'OBSERVABILITY_KEY'
const SECRET = 'shared-secret-for-observability'

// Date is frozen so bucket boundaries are exact and assertable. Only Date is
// faked — supertest/express still need real timers.
const NOW = new Date('2026-07-31T12:00:00.000Z')
const MIN = 60 * 1000
const BUCKET_1H = 5 * MIN
const BUCKET_24H = 60 * MIN

const at = (offsetMs) => new Date(NOW.getTime() + offsetMs)

// 11:32:00Z -> 1h bucket 11:30:00Z, 24h bucket 11:00:00Z
const T_A = at(-28 * MIN)
const BUCKET_A = '2026-07-31T11:30:00.000Z'
// 11:47:00Z -> 1h bucket 11:45:00Z
const T_B = at(-13 * MIN)
const BUCKET_B = '2026-07-31T11:45:00.000Z'
// 10:30:00Z — outside the 1h window, inside 24h
const T_OLD = at(-90 * MIN)

let savedKey
let store

beforeEach(() => {
  savedKey = process.env[KEY_VAR]
  process.env[KEY_VAR] = SECRET
  vi.useFakeTimers({ toFake: ['Date'], now: NOW })
  vi.spyOn(console, 'error').mockImplementation(() => {})
  store = createMemoryStore()
})

afterEach(() => {
  if (savedKey === undefined) delete process.env[KEY_VAR]
  else process.env[KEY_VAR] = savedKey
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const app = () => createApp({ store })

const get = (path) => request(app()).get(path)

const seedUpstream = (
  { provider, status = 200, durationMs = 100, cacheHit = false, error, ts, route = '/tts' },
) =>
  store.insertEvent({
    type: 'upstream',
    ts,
    payload: {
      route,
      provider,
      status,
      duration_ms: durationMs,
      cache_hit: cacheHit,
      ...(error ? { error } : {}),
    },
  })

const seedGrade = ({ result = 'pass', bandAfter = 3, ts, word = 'manzana' }) =>
  store.insertEvent({
    type: 'grade',
    ts,
    payload: {
      word,
      node_ids: ['n1'],
      result,
      similarity: 0.9,
      band_before: bandAfter - 1,
      band_after: bandAfter,
      screen: 'cocina',
    },
  })

const metrics = (query = '') => get(`/debug/metrics?key=${SECRET}${query}`)

const rowFor = (rows, bucket, provider) =>
  rows.find((r) => r.bucket === bucket && r.provider === provider)

const isSpa = (res) => typeof res.text === 'string' && res.text.includes('id="root"')

const isDenied = (res) => {
  expect([401, 403]).toContain(res.status)
  expect(isSpa(res)).toBe(false)
}

// ===========================================================================
// GUARD — passes today and must keep passing. It proves the SPA catch-all is
// really mounted, which is what makes every route-order assertion meaningful.
// ===========================================================================

describe('GUARD: the SPA catch-all is live in this test environment', () => {
  it('serves index.html for an unknown path', async () => {
    const res = await get('/definitely-not-a-real-route')

    expect(res.status).toBe(200)
    expect(isSpa(res)).toBe(true)
  })
})

// ===========================================================================
// H1 — route + shared-secret gate
// ===========================================================================

describe('H1: /observability is gated by the shared secret', () => {
  it('denies a request with no key, and does not fall through to the SPA', async () => {
    isDenied(await get('/observability'))
  })

  it('denies a request with the wrong key', async () => {
    isDenied(await get('/observability?key=not-the-secret'))
  })

  it('denies every gated route when OBSERVABILITY_KEY is unset (closed by default)', async () => {
    delete process.env[KEY_VAR]

    isDenied(await get('/observability'))
    isDenied(await get(`/observability?key=${SECRET}`))
    isDenied(await get('/debug/metrics'))
    isDenied(await get('/debug/logs'))
  })

  it('reads the secret per request, not at createApp time', async () => {
    const built = app()
    process.env[KEY_VAR] = 'rotated-secret'

    isDenied(await request(built).get(`/observability?key=${SECRET}`))
    expect((await request(built).get('/observability?key=rotated-secret')).status).toBe(200)
  })
})

describe('H1: /observability serves the dashboard, not the game', () => {
  it('returns the dashboard document with the correct key', async () => {
    const res = await get(`/observability?key=${SECRET}`)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/html/)
    expect(res.text).toContain('id="observability-dashboard"')
  })

  // The regression this whole ticket exists to prevent: registering the route
  // below `app.get('*')` returns 200 index.html and looks fine to a naive test.
  it('is NOT shadowed by the SPA catch-all', async () => {
    const res = await get(`/observability?key=${SECRET}`)

    expect(isSpa(res)).toBe(false)
    expect(res.text).not.toContain('<title>La Casa</title>')
  })
})

describe('H1: the same gate covers /debug/*', () => {
  it('denies /debug/metrics without the key', async () => {
    isDenied(await get('/debug/metrics'))
    isDenied(await get('/debug/metrics?key=nope&window=1h'))
  })

  it('denies /debug/logs without the key', async () => {
    isDenied(await get('/debug/logs'))
    isDenied(await get('/debug/logs?key=nope'))
  })

  it('denies an arbitrary /debug/* path rather than serving the SPA', async () => {
    isDenied(await get('/debug/anything-else'))
  })
})

// ===========================================================================
// H2 — /debug/metrics aggregation
// ===========================================================================

describe('H2: /debug/metrics returns buckets, not raw rows', () => {
  it('answers JSON with the pinned envelope', async () => {
    await seedUpstream({ provider: 'elevenlabs', durationMs: 100, ts: T_A })

    const res = await metrics('&window=1h')

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/application\/json/)
    expect(res.body).toMatchObject({
      window: '1h',
      bucket_ms: BUCKET_1H,
      from: '2026-07-31T11:00:00.000Z',
      to: '2026-07-31T12:00:00.000Z',
    })
    expect(Array.isArray(res.body.series.upstream)).toBe(true)
    expect(Array.isArray(res.body.series.cache)).toBe(true)
    expect(Array.isArray(res.body.series.learning)).toBe(true)
  })

  it('emits bucket rows and never leaks raw event rows', async () => {
    await seedUpstream({ provider: 'openai', durationMs: 420, ts: T_A })

    const { series } = (await metrics('&window=1h')).body
    const row = series.upstream[0]

    expect(row).toMatchObject({ bucket: BUCKET_A, provider: 'openai' })
    expect(row).toHaveProperty('p95_ms')
    expect(row).toHaveProperty('failures')
    // Raw-row leakage: any of these means the endpoint returned events, not a series.
    expect(row).not.toHaveProperty('id')
    expect(row).not.toHaveProperty('ts')
    expect(row).not.toHaveProperty('payload')
    expect(row).not.toHaveProperty('duration_ms')
  })

  it('gives 1h and 24h different bucket ranges', async () => {
    await seedUpstream({ provider: 'anthropic', ts: T_A })

    const oneHour = (await metrics('&window=1h')).body
    const day = (await metrics('&window=24h')).body

    expect(oneHour.bucket_ms).toBe(BUCKET_1H)
    expect(day.bucket_ms).toBe(BUCKET_24H)
    expect(oneHour.from).toBe('2026-07-31T11:00:00.000Z')
    expect(day.from).toBe('2026-07-30T12:00:00.000Z')
    expect(day.to).toBe('2026-07-31T12:00:00.000Z')
    // Same event, coarser bucket.
    expect(oneHour.series.upstream[0].bucket).toBe(BUCKET_A)
    expect(day.series.upstream[0].bucket).toBe('2026-07-31T11:00:00.000Z')
  })

  it('defaults to the 1h window when it is missing or unrecognised', async () => {
    expect((await metrics()).body).toMatchObject({ window: '1h', bucket_ms: BUCKET_1H })
    expect((await metrics('&window=banana')).body).toMatchObject({
      window: '1h',
      bucket_ms: BUCKET_1H,
    })
  })

  it('excludes events outside the requested window', async () => {
    await seedUpstream({ provider: 'openai', durationMs: 111, ts: T_OLD })
    await seedGrade({ result: 'pass', bandAfter: 5, ts: T_OLD })

    const oneHour = (await metrics('&window=1h')).body
    expect(oneHour.series.upstream).toHaveLength(0)
    expect(oneHour.series.cache).toHaveLength(0)
    expect(oneHour.series.learning).toHaveLength(0)

    // …but they are inside 24h, so this is a window filter and not a dropped row.
    const day = (await metrics('&window=24h')).body
    expect(day.series.upstream).toHaveLength(1)
    expect(day.series.learning).toHaveLength(1)
  })

  it('returns an empty-but-well-formed series for an empty events table', async () => {
    const res = await metrics('&window=1h')

    expect(res.status).toBe(200)
    expect(res.body.series).toEqual({ upstream: [], cache: [], learning: [] })
    expect(res.body.from).toBe('2026-07-31T11:00:00.000Z')
  })
})

describe('H2: upstream health series', () => {
  // NEAREST-RANK p95 over 20 rows: ceil(0.95 * 20) = 19 -> the 19th smallest.
  // Values are 100 (the failure) then 200,300,…,2000 => 19th smallest = 1900.
  //   - linear interpolation (R7) would give 1905
  //   - excluding the failed row would give 2000
  // so this distribution pins both the method and the failures-included rule.
  it('computes p95 latency per provider by nearest rank, failures included', async () => {
    await seedUpstream({
      provider: 'elevenlabs',
      status: 502,
      durationMs: 100,
      error: 'upstream_error',
      ts: T_A,
    })
    for (let d = 200; d <= 2000; d += 100) {
      await seedUpstream({ provider: 'elevenlabs', durationMs: d, ts: T_A })
    }
    // A second provider must not contaminate the first.
    await seedUpstream({ provider: 'anthropic', durationMs: 50, ts: T_A })

    const { series } = (await metrics('&window=1h')).body

    expect(rowFor(series.upstream, BUCKET_A, 'elevenlabs')).toMatchObject({
      p95_ms: 1900,
      count: 20,
    })
    expect(rowFor(series.upstream, BUCKET_A, 'anthropic')).toMatchObject({ p95_ms: 50, count: 1 })
  })

  it('reports failure counts per provider and per bucket', async () => {
    await seedUpstream({ provider: 'openai', status: 500, error: 'boom', ts: T_A })
    await seedUpstream({ provider: 'openai', status: 429, ts: T_A })
    await seedUpstream({ provider: 'openai', status: 200, ts: T_A })
    await seedUpstream({ provider: 'openai', status: 503, ts: T_B })
    await seedUpstream({ provider: 'anthropic', status: 200, ts: T_A })

    const { series } = (await metrics('&window=1h')).body

    expect(rowFor(series.upstream, BUCKET_A, 'openai')).toMatchObject({ failures: 2, count: 3 })
    expect(rowFor(series.upstream, BUCKET_B, 'openai')).toMatchObject({ failures: 1, count: 1 })
    expect(rowFor(series.upstream, BUCKET_A, 'anthropic')).toMatchObject({ failures: 0, count: 1 })
  })

  it('orders bucket rows ascending by bucket', async () => {
    await seedUpstream({ provider: 'openai', ts: T_B })
    await seedUpstream({ provider: 'openai', ts: T_A })

    const buckets = (await metrics('&window=1h')).body.series.upstream.map((r) => r.bucket)

    expect(buckets).toEqual([BUCKET_A, BUCKET_B])
  })
})

describe('H2: cache hit rate series', () => {
  it('derives hit rate from cache_hit on upstream rows (3 hits + 1 miss = 0.75)', async () => {
    for (let i = 0; i < 3; i += 1) {
      await seedUpstream({ provider: 'elevenlabs', cacheHit: true, ts: T_A })
    }
    await seedUpstream({ provider: 'elevenlabs', cacheHit: false, ts: T_A })

    const { series } = (await metrics('&window=1h')).body

    expect(rowFor(series.cache, BUCKET_A, 'elevenlabs')).toMatchObject({
      hits: 3,
      misses: 1,
      hit_rate: 0.75,
    })
  })

  it('splits hit rate per provider and per bucket', async () => {
    await seedUpstream({ provider: 'openai', cacheHit: true, ts: T_A })
    await seedUpstream({ provider: 'openai', cacheHit: false, ts: T_A })
    await seedUpstream({ provider: 'openai', cacheHit: false, ts: T_B })

    const { series } = (await metrics('&window=1h')).body

    expect(rowFor(series.cache, BUCKET_A, 'openai')).toMatchObject({
      hits: 1,
      misses: 1,
      hit_rate: 0.5,
    })
    expect(rowFor(series.cache, BUCKET_B, 'openai')).toMatchObject({
      hits: 0,
      misses: 1,
      hit_rate: 0,
    })
  })
})

describe('H2: learning signal series', () => {
  it('derives pass rate from grade rows and the band from band_after', async () => {
    await seedGrade({ result: 'pass', bandAfter: 3, ts: at(-28 * MIN) })
    await seedGrade({ result: 'pass', bandAfter: 4, ts: at(-28 * MIN + 1000) })
    await seedGrade({ result: 'fail', bandAfter: 4, ts: at(-28 * MIN + 2000) })
    await seedGrade({ result: 'pass', bandAfter: 5, ts: at(-28 * MIN + 3000) })

    const { series } = (await metrics('&window=1h')).body
    const bucket = series.learning.find((r) => r.bucket === BUCKET_A)

    expect(bucket).toMatchObject({ attempts: 4, passes: 3, pass_rate: 0.75 })
    // The band is the LAST band_after in the bucket, not the first or an average.
    expect(bucket.band).toBe(5)
  })

  it('tracks the band across buckets over the session timeline', async () => {
    await seedGrade({ result: 'fail', bandAfter: 2, ts: T_A })
    await seedGrade({ result: 'pass', bandAfter: 6, ts: T_B })

    const { series } = (await metrics('&window=1h')).body

    expect(series.learning.map((r) => [r.bucket, r.band, r.pass_rate])).toEqual([
      [BUCKET_A, 2, 0],
      [BUCKET_B, 6, 1],
    ])
  })

  it('ignores non-grade events when computing pass rate', async () => {
    await seedUpstream({ provider: 'openai', status: 500, ts: T_A })
    await seedGrade({ result: 'pass', bandAfter: 4, ts: T_A })

    const { series } = (await metrics('&window=1h')).body

    expect(series.learning).toHaveLength(1)
    expect(series.learning[0]).toMatchObject({ attempts: 1, passes: 1, pass_rate: 1 })
  })
})

// ===========================================================================
// H4 — /debug/logs HTML table
// ===========================================================================

const logRowIds = (html) => [...html.matchAll(/data-event-id="(\d+)"/g)].map((m) => Number(m[1]))

const errorRowIds = (html) =>
  [...html.matchAll(/<tr[^>]*data-event-id="(\d+)"[^>]*>/g)]
    .filter((m) => /class="[^"]*\berror\b[^"]*"/.test(m[0]))
    .map((m) => Number(m[1]))

describe('H4: GET /debug/logs renders the last rows as an HTML table', () => {
  it('returns an HTML table, not the SPA', async () => {
    await seedUpstream({ provider: 'openai', ts: T_A })

    const res = await get(`/debug/logs?key=${SECRET}`)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/html/)
    expect(res.text).toContain('<table')
    expect(isSpa(res)).toBe(false)
  })

  it('caps the table at 200 rows', async () => {
    for (let i = 0; i < 250; i += 1) {
      await seedUpstream({ provider: 'openai', durationMs: i, ts: at(-(250 - i) * 1000) })
    }

    const res = await get(`/debug/logs?key=${SECRET}`)

    expect(logRowIds(res.text)).toHaveLength(200)
  })

  it('returns rows newest-first', async () => {
    for (let i = 0; i < 5; i += 1) {
      await seedUpstream({ provider: 'openai', durationMs: i, ts: at(-(10 - i) * 1000) })
    }

    const res = await get(`/debug/logs?key=${SECRET}`)

    // ids 1..5 were inserted oldest -> newest, so newest-first is 5,4,3,2,1.
    expect(logRowIds(res.text)).toEqual([5, 4, 3, 2, 1])
  })

  it('marks error rows distinguishably from success rows', async () => {
    const ok1 = await seedUpstream({ provider: 'openai', status: 200, ts: at(-5000) })
    const bad = await seedUpstream({
      provider: 'openai',
      status: 502,
      error: 'upstream_error',
      ts: at(-4000),
    })
    const ok2 = await seedGrade({ result: 'fail', bandAfter: 3, ts: at(-3000) })
    const clientErr = await store.insertEvent({
      type: 'client_error',
      ts: at(-2000),
      payload: { kind: 'speech', message: 'no-speech', screen: 'cocina' },
    })

    const res = await get(`/debug/logs?key=${SECRET}`)
    const flagged = errorRowIds(res.text)

    expect(new Set(flagged)).toEqual(new Set([bad.id, clientErr.id]))
    expect(flagged).not.toContain(ok1.id)
    // A failed *grade* is pedagogy, not an error — it must not be highlighted.
    expect(flagged).not.toContain(ok2.id)
  })
})
