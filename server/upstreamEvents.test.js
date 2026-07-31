import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'

import { createApp } from './app.js'
import { createMemoryStore } from './store.js'
import { resetProviderHealth } from './providerHealth.js'

// ---------------------------------------------------------------------------
// TICKET 008 — PRD v2 §4 (Workstream C), criterion C2.
//
// Notes for the implementer
//
// * REQUIRED SIGNATURE: `createApp({ store } = {})`. An optional options object
//   whose `store` is used for telemetry; when omitted it must fall back to
//   `await getStore()` so `server/index.js`, `server/routes.test.js` and
//   `server/health.test.js` (all LOCKED, all calling `createApp()` bare) keep
//   working. The bare-call regression guard at the bottom of this file pins
//   that.
//
// * EVERY proxy call writes exactly ONE `upstream` row — successes included.
//   Without successes there is no success rate and no latency percentile.
//   Hook the recorder into the timed-call seam (`callUpstream` in
//   `server/upstream.js`) rather than into each route handler. The 503
//   `not_configured` guard in `app.js` never reaches `callUpstream`, so that
//   path needs its own record call.
//
// * Payload per PRD §4: `route`, `provider`, `status`, `duration_ms`,
//   `cache_hit`, plus `error` on failure. `cache_hit` is written as `false` for
//   now — ticket 010 makes it truthful, so nothing here asserts a true hit,
//   only that the key is present and boolean.
//
// * `learner_id` comes from the `X-Learner-Id` request header, null when absent.
//
// * Telemetry must never break the proxy: if the store throws while recording,
//   the client still gets its normal response, and the rejection must be
//   swallowed (an unhandled rejection fails this suite).
// ---------------------------------------------------------------------------

const API_KEY_VARS = ['ANTHROPIC_API_KEY', 'ELEVENLABS_API_KEY', 'OPENAI_API_KEY']
const LEARNER = '22222222-2222-4222-8222-222222222222'

let savedEnv

const jsonRes = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const textRes = (body, status) =>
  new Response(body, { status, headers: { 'content-type': 'text/plain' } })

const binRes = (u8, status = 200) =>
  new Response(u8, { status, headers: { 'content-type': 'audio/mpeg' } })

beforeEach(() => {
  savedEnv = Object.fromEntries(API_KEY_VARS.map((k) => [k, process.env[k]]))
  for (const k of API_KEY_VARS) delete process.env[k]
  vi.spyOn(console, 'error').mockImplementation(() => {})
  resetProviderHealth()
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

// --- scenario table ---------------------------------------------------------

const OK_IMAGE = {
  label: 'a successful /image call',
  route: '/image',
  provider: 'openai',
  envVar: 'OPENAI_API_KEY',
  body: { word: 'manzana' },
  fetch: () => jsonRes({ data: [{ url: 'https://example.test/manzana.png' }] }),
  expectHttp: 200,
  expectStatus: 200,
}

const OK_TTS = {
  label: 'a successful /tts call',
  route: '/tts',
  provider: 'elevenlabs',
  envVar: 'ELEVENLABS_API_KEY',
  body: { text: 'Hola', voiceId: 'voice_abc', lang: 'es-MX' },
  fetch: () => binRes(new Uint8Array([0x49, 0x44, 0x33, 0x04])),
  expectHttp: 200,
  expectStatus: 200,
}

const OK_GENERATE = {
  label: 'a successful /generate call',
  route: '/generate',
  provider: 'anthropic',
  envVar: 'ANTHROPIC_API_KEY',
  body: { prompt: 'hola' },
  fetch: () => jsonRes({ content: [{ type: 'text', text: 'Hola, mija.' }] }),
  expectHttp: 200,
  expectStatus: 200,
}

const FAIL_502_TTS = {
  label: 'a 502 (upstream non-2xx) /tts call',
  route: '/tts',
  provider: 'elevenlabs',
  envVar: 'ELEVENLABS_API_KEY',
  body: { text: 'Hola', voiceId: 'voice_abc', lang: 'es-MX' },
  fetch: () => textRes('elevenlabs invalid_api_key', 401),
  expectHttp: 502,
  expectStatus: 401,
}

const FAIL_504_IMAGE = {
  label: 'a 504 (fetch threw) /image call',
  route: '/image',
  provider: 'openai',
  envVar: 'OPENAI_API_KEY',
  body: { word: 'manzana' },
  fetch: () => {
    throw new Error('connect ECONNREFUSED 127.0.0.1:443')
  },
  expectHttp: 504,
}

const NOT_CONFIGURED = {
  label: 'a 503 not_configured /generate call',
  route: '/generate',
  provider: 'anthropic',
  envVar: null, // key deliberately left unset
  body: { prompt: 'hola' },
  fetch: () => {
    throw new Error('fetch must not be called without an API key')
  },
  expectHttp: 503,
  expectStatus: 503,
}

const ALL = [OK_IMAGE, OK_TTS, OK_GENERATE, FAIL_502_TTS, FAIL_504_IMAGE, NOT_CONFIGURED]
const SUCCESSES = [OK_IMAGE, OK_TTS, OK_GENERATE]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Read the upstream rows once they have settled. Recording may legitimately be
 * awaited before the response or fired-and-forgotten just after it, so poll for
 * the first row and then let the microtask queue drain before counting — that
 * way "exactly one" is a real assertion under either design.
 */
async function settledUpstreamRows(store) {
  for (let i = 0; i < 40 && (await store.queryEvents({ type: 'upstream' })).length === 0; i++) {
    await sleep(5)
  }
  await sleep(25)
  return store.queryEvents({ type: 'upstream' })
}

/** Run one scenario against a fresh app + memory store; return response + rows. */
async function run(scenario, { headers } = {}) {
  if (scenario.envVar) process.env[scenario.envVar] = 'test-key'
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => scenario.fetch())
  )

  const store = createMemoryStore()
  const req = request(createApp({ store })).post(scenario.route)
  for (const [k, v] of Object.entries(headers ?? {})) req.set(k, v)
  const res = await req.send(scenario.body)

  return { res, store, rows: await settledUpstreamRows(store) }
}

// --- C2: one upstream row per proxy call, successes included ----------------

describe.each(SUCCESSES)('$label writes an upstream event (C2)', (scenario) => {
  it('writes exactly one row with the right route, provider and status', async () => {
    const { res, rows } = await run(scenario)

    expect(res.status).toBe(scenario.expectHttp)
    expect(rows).toHaveLength(1)
    expect(rows[0].type).toBe('upstream')
    expect(rows[0].payload).toMatchObject({
      route: scenario.route,
      provider: scenario.provider,
      status: 200,
    })
    expect(typeof rows[0].payload.duration_ms).toBe('number')
  })
})

describe('failure paths write an upstream event (C2)', () => {
  it('a 502 /tts call records the upstream status and a non-empty error', async () => {
    const { res, rows } = await run(FAIL_502_TTS)

    expect(res.status).toBe(502)
    expect(rows).toHaveLength(1)
    expect(rows[0].payload).toMatchObject({
      route: '/tts',
      provider: 'elevenlabs',
      status: 401,
    })
    expect(rows[0].payload.error).toBeTruthy()
    expect(String(rows[0].payload.error).length).toBeGreaterThan(0)
  })

  it('a 504 /image call records provider openai and an error', async () => {
    const { res, rows } = await run(FAIL_504_IMAGE)

    expect(res.status).toBe(504)
    expect(rows).toHaveLength(1)
    expect(rows[0].payload).toMatchObject({ route: '/image', provider: 'openai' })
    expect(rows[0].payload.error).toBeTruthy()
  })

  it('a 503 not_configured call records the misconfiguration', async () => {
    const { res, rows } = await run(NOT_CONFIGURED)

    expect(res.status).toBe(503)
    expect(rows).toHaveLength(1)
    expect(rows[0].payload).toMatchObject({
      route: '/generate',
      provider: 'anthropic',
      status: 503,
    })
    expect(String(rows[0].payload.error)).toContain('not_configured')
  })
})

describe.each(ALL)('$label writes exactly one row (C2)', (scenario) => {
  it('never zero, never two', async () => {
    const { rows } = await run(scenario)

    expect(rows.length).toBe(1)
  })

  it('has a numeric duration_ms >= 0 and a boolean cache_hit', async () => {
    const { rows } = await run(scenario)

    expect(typeof rows[0].payload.duration_ms).toBe('number')
    expect(rows[0].payload.duration_ms).toBeGreaterThanOrEqual(0)
    expect(typeof rows[0].payload.cache_hit).toBe('boolean')
  })
})

// --- C2: learner id from the request header --------------------------------

describe('learner_id on upstream events (C2)', () => {
  it('is populated from the X-Learner-Id header', async () => {
    const { rows } = await run(OK_IMAGE, { headers: { 'X-Learner-Id': LEARNER } })

    expect(rows).toHaveLength(1)
    expect(rows[0].learner_id).toBe(LEARNER)
  })

  it('is null when the header is absent', async () => {
    const { rows } = await run(OK_IMAGE)

    expect(rows).toHaveLength(1)
    expect(rows[0].learner_id).toBeNull()
  })
})

// --- C2: telemetry must never break the proxy ------------------------------

describe('a store failure does not fail the proxy request (C2)', () => {
  const brokenStore = () => ({
    ...createMemoryStore(),
    insertEvent: vi.fn(async () => {
      throw new Error('db down')
    }),
  })

  it('/image still returns its 200 body when insertEvent rejects', async () => {
    process.env.OPENAI_API_KEY = 'test-key'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonRes({ data: [{ url: 'https://example.test/manzana.png' }] }))
    )
    const store = brokenStore()

    const res = await request(createApp({ store })).post('/image').send({ word: 'manzana' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ url: 'https://example.test/manzana.png' })
    await sleep(25)
    expect(store.insertEvent).toHaveBeenCalled()
  })

  it('/tts still returns its 502 when insertEvent rejects', async () => {
    process.env.ELEVENLABS_API_KEY = 'test-key'
    vi.stubGlobal('fetch', vi.fn(async () => textRes('invalid_api_key', 401)))

    const store = brokenStore()

    const res = await request(createApp({ store }))
      .post('/tts')
      .send({ text: 'Hola', voiceId: 'voice_abc', lang: 'es-MX' })

    expect(res.status).toBe(502)
    expect(res.body).toEqual({ error: 'upstream', provider: 'elevenlabs', status: 401 })
    await sleep(25)
    expect(store.insertEvent).toHaveBeenCalled()
  })
})

// --- regression guard: bare createApp() must keep working ------------------

describe('createApp() signature (regression guard — passes today)', () => {
  it('still builds a working app when called with no arguments', async () => {
    process.env.OPENAI_API_KEY = 'test-key'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonRes({ data: [{ url: 'https://example.test/manzana.png' }] }))
    )

    const app = createApp()

    const health = await request(app).get('/health')
    expect(health.status).toBe(200)

    const res = await request(app).post('/image').send({ word: 'manzana' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ url: 'https://example.test/manzana.png' })
  })
})
