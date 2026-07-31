import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'

import { createApp } from './app.js'

// ---------------------------------------------------------------------------
// TICKET 002 — PRD v2 §2 (Workstream A), criteria A1 + A2.
//
// Notes for the implementer
//
// * Every upstream call is mocked at the global `fetch` seam. Nothing in this
//   file may touch the network, and no real API key is ever required.
//   `/generate` MUST therefore be converted off `@anthropic-ai/sdk` onto plain
//   `fetch` (POST https://api.anthropic.com/v1/messages, headers `x-api-key`
//   and `anthropic-version: 2023-06-01`, model id `claude-haiku-4-5`).
// * The mocks hand back REAL `Response` objects, so the implementation is free
//   to read `.ok` / `.status` / `.json()` / `.text()` / `.arrayBuffer()`. It
//   must not read the body twice — a Response body can only be consumed once.
// * Failure log lines are asserted loosely: the joined `console.error`
//   arguments must contain the provider name, the numeric status, a duration
//   matching /\d+\s*ms/, and the (truncated) upstream body. Format is free.
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url))

const API_KEY_VARS = ['ANTHROPIC_API_KEY', 'ELEVENLABS_API_KEY', 'OPENAI_API_KEY']

let savedEnv
let errSpy

const jsonRes = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const textRes = (body, status) =>
  new Response(body, { status, headers: { 'content-type': 'text/plain' } })

const binRes = (u8, status = 200) =>
  new Response(u8, { status, headers: { 'content-type': 'audio/mpeg' } })

/** Joined text of every console.error call so far. */
const loggedText = () =>
  errSpy.mock.calls.map((call) => call.map((a) => String(a)).join(' ')).join('\n')

beforeEach(() => {
  // The repo root has a real .env with live-looking keys and `server/index.js`
  // loads dotenv. These tests must control the env explicitly — snapshot and
  // clear, restore in afterEach so nothing leaks into store.test.js.
  savedEnv = Object.fromEntries(API_KEY_VARS.map((k) => [k, process.env[k]]))
  for (const k of API_KEY_VARS) delete process.env[k]
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  for (const k of API_KEY_VARS) {
    if (savedEnv[k] === undefined) delete process.env[k]
    else process.env[k] = savedEnv[k]
  }
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const ROUTES = [
  {
    label: '/generate',
    path: '/generate',
    provider: 'anthropic',
    envVar: 'ANTHROPIC_API_KEY',
    reqBody: { prompt: 'Say hola in one word' },
    upstreamStatus: 500,
    upstreamBody: 'anthropic overloaded_error',
  },
  {
    label: '/tts',
    path: '/tts',
    provider: 'elevenlabs',
    envVar: 'ELEVENLABS_API_KEY',
    reqBody: { text: 'Hola mija', voiceId: 'voice_abc', lang: 'es-MX' },
    upstreamStatus: 401,
    upstreamBody: 'elevenlabs invalid_api_key',
  },
  {
    label: '/image',
    path: '/image',
    provider: 'openai',
    envVar: 'OPENAI_API_KEY',
    reqBody: { word: 'manzana' },
    upstreamStatus: 429,
    upstreamBody: 'openai rate_limit_exceeded',
  },
]

// --- A1: three-way taxonomy, table-driven across all three routes ----------

describe.each(ROUTES)('$label upstream failure taxonomy (A1)', (route) => {
  it(`returns 503 not_configured/${route.provider} when the API key is missing`, async () => {
    // key deliberately NOT set by beforeEach
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('fetch must not be called without an API key')
      })
    )

    const res = await request(createApp()).post(route.path).send(route.reqBody)

    expect(res.status).toBe(503)
    expect(res.body).toEqual({ error: 'not_configured', provider: route.provider })
  })

  it(`returns 502 upstream/${route.provider} with status when upstream responds ${route.upstreamStatus}`, async () => {
    process.env[route.envVar] = 'test-key'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => textRes(route.upstreamBody, route.upstreamStatus))
    )

    const res = await request(createApp()).post(route.path).send(route.reqBody)

    expect(res.status).toBe(502)
    expect(res.body).toEqual({
      error: 'upstream',
      provider: route.provider,
      status: route.upstreamStatus,
    })
  })

  it(`returns 504 upstream_unreachable/${route.provider} when fetch rejects`, async () => {
    process.env[route.envVar] = 'test-key'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('connect ECONNREFUSED 127.0.0.1:443')
      })
    )

    const res = await request(createApp()).post(route.path).send(route.reqBody)

    expect(res.status).toBe(504)
    expect(res.body).toEqual({ error: 'upstream_unreachable', provider: route.provider })
  })
})

// --- A2: timed calls + structured failure logging --------------------------

describe('upstream failure logging (A2)', () => {
  it('logs provider, status, duration in ms and the upstream body on a non-2xx', async () => {
    process.env.OPENAI_API_KEY = 'test-key'
    vi.stubGlobal('fetch', vi.fn(async () => textRes('openai rate_limit_exceeded', 429)))

    await request(createApp()).post('/image').send({ word: 'manzana' })

    expect(errSpy).toHaveBeenCalled()
    const logged = loggedText()
    expect(logged).toContain('openai')
    expect(logged).toContain('429')
    expect(logged).toMatch(/\d+\s*ms/i)
    expect(logged).toContain('rate_limit_exceeded')
  })

  it('logs provider and a duration when the upstream call throws', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('connect ECONNREFUSED 127.0.0.1:443')
      })
    )

    await request(createApp()).post('/generate').send({ prompt: 'hola' })

    expect(errSpy).toHaveBeenCalled()
    const logged = loggedText()
    expect(logged).toContain('anthropic')
    expect(logged).toMatch(/\d+\s*ms/i)
  })

  it('truncates an upstream body longer than 500 chars to at most 500 chars', async () => {
    process.env.OPENAI_API_KEY = 'test-key'
    const longBody = 'x'.repeat(2000)
    vi.stubGlobal('fetch', vi.fn(async () => textRes(longBody, 500)))

    await request(createApp()).post('/image').send({ word: 'manzana' })

    expect(errSpy).toHaveBeenCalled()
    const logged = loggedText()
    // 500 chars of the body may appear; 501 may not.
    expect(logged).toContain('x'.repeat(500))
    expect(logged).not.toContain('x'.repeat(501))
  })
})

// --- Regression guards: success paths and existing behaviour ---------------

describe('success paths still work', () => {
  it('/generate returns { content } from the Anthropic Messages API', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    const fetchMock = vi.fn(async () =>
      jsonRes({
        id: 'msg_01',
        type: 'message',
        role: 'assistant',
        model: 'claude-haiku-4-5',
        content: [{ type: 'text', text: 'Hola, mija.' }],
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const res = await request(createApp()).post('/generate').send({ prompt: 'hola' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ content: 'Hola, mija.' })
    expect(String(fetchMock.mock.calls[0][0])).toContain('api.anthropic.com')
  })

  it('/image returns { url }', async () => {
    process.env.OPENAI_API_KEY = 'test-key'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonRes({ data: [{ url: 'https://example.test/manzana.png' }] }))
    )

    const res = await request(createApp()).post('/image').send({ word: 'manzana' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ url: 'https://example.test/manzana.png' })
  })

  it('/tts returns audio bytes with Content-Type audio/mpeg', async () => {
    process.env.ELEVENLABS_API_KEY = 'test-key'
    const audio = new Uint8Array([0x49, 0x44, 0x33, 0x04])
    vi.stubGlobal('fetch', vi.fn(async () => binRes(audio)))

    const res = await request(createApp())
      .post('/tts')
      .send({ text: 'Hola', voiceId: 'voice_abc', lang: 'es-MX' })

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/audio\/mpeg/)
    expect(Number(res.headers['content-length'])).toBe(audio.length)
  })

  it('/generate with no prompt still returns 400 missing prompt', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    const fetchMock = vi.fn(async () => jsonRes({ content: [{ type: 'text', text: 'x' }] }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await request(createApp()).post('/generate').send({})

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'missing prompt' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('generate.js is off the Anthropic SDK', () => {
  it('no longer imports @anthropic-ai/sdk', () => {
    const src = readFileSync(join(__dirname, 'routes', 'generate.js'), 'utf8')
    expect(src).not.toContain('@anthropic-ai/sdk')
  })
})
