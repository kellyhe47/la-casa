import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'

import { createApp } from './app.js'
import { resetProviderHealth } from './providerHealth.js'

// ---------------------------------------------------------------------------
// TICKET 003 — PRD v2 §2 (Workstream A), criterion A3.
//
// Notes for the implementer
//
// * `server/providerHealth.js` MUST export `resetProviderHealth()`. Its state
//   is module-global and would otherwise leak between these tests.
// * `keyPresent` is derived live from the env var on every `/health` request,
//   never cached at module load — these tests mutate the env between requests
//   against the same process.
// * `/health` must not touch Postgres: it has to answer when the DB is down.
// ---------------------------------------------------------------------------

const API_KEY_VARS = ['ANTHROPIC_API_KEY', 'ELEVENLABS_API_KEY', 'OPENAI_API_KEY']
const PROVIDERS = ['anthropic', 'elevenlabs', 'openai']

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

let savedEnv

const jsonRes = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const textRes = (body, status) =>
  new Response(body, { status, headers: { 'content-type': 'text/plain' } })

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

const health = () => request(createApp()).get('/health')

describe('GET /health shape (A3)', () => {
  it('returns 200 with ok:true and a providers object keyed by the three providers', async () => {
    const res = await health()

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.providers).toBeTypeOf('object')
    expect(Object.keys(res.body.providers).sort()).toEqual([...PROVIDERS].sort())
  })

  it('reports keyPresent true for set env vars and false for unset ones', async () => {
    process.env.OPENAI_API_KEY = 'test-key'
    // ANTHROPIC_API_KEY and ELEVENLABS_API_KEY stay unset

    const res = await health()

    expect(res.body.providers.openai.keyPresent).toBe(true)
    expect(res.body.providers.anthropic.keyPresent).toBe(false)
    expect(res.body.providers.elevenlabs.keyPresent).toBe(false)
  })

  it('reports lastSuccess and lastFailure as null before any upstream call', async () => {
    const res = await health()

    for (const p of PROVIDERS) {
      expect(res.body.providers[p].lastSuccess).toBeNull()
      expect(res.body.providers[p].lastFailure).toBeNull()
    }
  })

  it('still responds 200 when every API key is unset', async () => {
    const res = await health()

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.providers).toBeTypeOf('object')
  })
})

describe('GET /health records upstream outcomes (A3)', () => {
  it('records lastSuccess for openai after a successful /image call', async () => {
    process.env.OPENAI_API_KEY = 'test-key'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonRes({ data: [{ url: 'https://example.test/manzana.png' }] }))
    )
    const app = createApp()

    const call = await request(app).post('/image').send({ word: 'manzana' })
    expect(call.status).toBe(200)

    const res = await request(app).get('/health')
    expect(res.body.providers.openai.lastSuccess).toMatch(ISO)
    expect(res.body.providers.openai.lastFailure).toBeNull()
  })

  it('records lastFailure for elevenlabs after a failing /tts call', async () => {
    process.env.ELEVENLABS_API_KEY = 'test-key'
    vi.stubGlobal('fetch', vi.fn(async () => textRes('invalid_api_key', 401)))
    const app = createApp()

    const call = await request(app)
      .post('/tts')
      .send({ text: 'Hola', voiceId: 'voice_abc', lang: 'es-MX' })
    expect(call.status).toBe(502)

    const res = await request(app).get('/health')
    expect(res.body.providers.elevenlabs.lastFailure).toMatch(ISO)
    expect(res.body.providers.elevenlabs.lastSuccess).toBeNull()
  })

  it("does not disturb one provider's success when another provider fails", async () => {
    process.env.OPENAI_API_KEY = 'test-key'
    process.env.ELEVENLABS_API_KEY = 'test-key'
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) =>
        String(url).includes('openai')
          ? jsonRes({ data: [{ url: 'https://example.test/manzana.png' }] })
          : textRes('invalid_api_key', 401)
      )
    )
    const app = createApp()

    await request(app).post('/image').send({ word: 'manzana' })
    await request(app)
      .post('/tts')
      .send({ text: 'Hola', voiceId: 'voice_abc', lang: 'es-MX' })

    const res = await request(app).get('/health')
    expect(res.body.providers.openai.lastSuccess).toMatch(ISO)
    expect(res.body.providers.openai.lastFailure).toBeNull()
    expect(res.body.providers.elevenlabs.lastFailure).toMatch(ISO)
  })
})
