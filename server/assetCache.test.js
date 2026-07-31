import { createHash } from 'node:crypto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'

import { createApp } from './app.js'
import { createMemoryStore } from './store.js'
import { resetProviderHealth } from './providerHealth.js'

// ---------------------------------------------------------------------------
// TICKET 010 — PRD v2 §5 (Workstream D), criteria D1 + D2 + D3.
//
// Notes for the implementer
//
// * `/image` and `/tts` check `store.getAsset(key)` BEFORE calling the provider.
//   On a miss they call, `store.putAsset({key, kind, mime, bytes})`, and return.
//   On a hit they must not touch the network at all.
//
// * KEY FORMAT is fixed by PRD §5.1 and asserted here byte-for-byte:
//       image -> `img:<word>`
//       tts   -> `tts:` + sha256(`${text}|${voiceId}|${lang}`) as lowercase hex
//   (utf8 digest — the fixture text carries accents on purpose).
//
// * CACHE VERSION (D3) is the env var `ASSET_CACHE_VERSION`, chosen over a
//   module constant so a bust needs no redeploy. It must be read PER REQUEST,
//   not captured at module load. Unset or empty => NO prefix, so the default
//   keys are exactly `img:fish` / `tts:<sha>` above. Set to e.g. `v2` => the
//   key becomes `v2:img:fish`, i.e. `<version>:` is prepended verbatim.
//
// * The cache is GLOBAL (D3): keyed only on content, never on the learner. Two
//   different `X-Learner-Id`s — and two different `createApp` instances sharing
//   one store — share every entry.
//
// * IMAGES are cached from the base64 payload (`b64_json`), which is what
//   `gpt-image-1-mini` actually returns; the stored `mime` is `image/png` and
//   the response shape stays `{ url: 'data:image/png;base64,...' }` on hit and
//   miss alike. An upstream response carrying only a remote `url` has no bytes
//   to store — return it untouched and do NOT fetch it (a guard below pins
//   this, and `routes.test.js` depends on it).
//
// * `cache_hit` in the `upstream` event row becomes truthful here. A hit skips
//   `callUpstream` entirely, so it must call `recordUpstreamEvent({provider,
//   status: 200, durationMs, cacheHit: true})` directly — route and learner
//   attribution come from the telemetry context for free.
//
// * NOT CACHED: `/generate`. Variety is a feature (PRD §5). Leave it alone.
//
// * FAILURES ARE NOT CACHED: nothing is stored unless the provider returned a
//   usable 2xx payload.
//
// * The `asset_cache` DDL already exists in schema.sql and is asserted by
//   store.test.js — deliberately not re-asserted here.
// ---------------------------------------------------------------------------

const API_KEY_VARS = ['ANTHROPIC_API_KEY', 'ELEVENLABS_API_KEY', 'OPENAI_API_KEY']
const ENV_VARS = [...API_KEY_VARS, 'ASSET_CACHE_VERSION']

const LEARNER_A = '11111111-1111-4111-8111-111111111111'
const LEARNER_B = '22222222-2222-4222-8222-222222222222'

// --- fixtures ---------------------------------------------------------------

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01, 0x02])
const PNG_B64 = PNG.toString('base64')
const PNG_DATA_URL = `data:image/png;base64,${PNG_B64}`

const AUDIO = Buffer.from([0x49, 0x44, 0x33, 0x04, 0x00, 0x77])

// Accents on purpose: pins the digest to a utf8 encoding of the joined string.
const TTS = { text: 'Mija, ¿qué dice aquí?', voiceId: 'voice_abuela', lang: 'es-MX' }

const ttsKey = ({ text, voiceId, lang }) =>
  `tts:${createHash('sha256').update(`${text}|${voiceId}|${lang}`).digest('hex')}`

const jsonRes = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const textRes = (body, status) =>
  new Response(body, { status, headers: { 'content-type': 'text/plain' } })

const binRes = (buf, status = 200) =>
  new Response(buf, { status, headers: { 'content-type': 'audio/mpeg' } })

const imageRes = () => jsonRes({ data: [{ b64_json: PNG_B64 }] })

// --- harness ----------------------------------------------------------------

let savedEnv

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_VARS.map((k) => [k, process.env[k]]))
  for (const k of ENV_VARS) delete process.env[k]
  for (const k of API_KEY_VARS) process.env[k] = 'test-key'
  vi.spyOn(console, 'error').mockImplementation(() => {})
  resetProviderHealth()
})

afterEach(() => {
  for (const k of ENV_VARS) {
    if (savedEnv[k] === undefined) delete process.env[k]
    else process.env[k] = savedEnv[k]
  }
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  resetProviderHealth()
})

/** Memory store with the two cache methods observable. */
function spyStore() {
  const base = createMemoryStore()
  return {
    ...base,
    getAsset: vi.fn(base.getAsset),
    putAsset: vi.fn(base.putAsset),
  }
}

const putKeys = (store) => store.putAsset.mock.calls.map((c) => c[0]?.key)
const getKeys = (store) => store.getAsset.mock.calls.map((c) => c[0])

/** Stub global fetch with a queue-or-constant responder; returns the mock. */
function stubFetch(responder) {
  const mock = vi.fn(async () => responder())
  vi.stubGlobal('fetch', mock)
  return mock
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Upstream recording is fire-and-forget (see upstreamEvents.test.js), so poll
 * until `expected` rows have landed, then let the microtask queue drain so
 * "exactly N" is a real assertion.
 */
async function settledUpstreamRows(store, expected = 1) {
  for (let i = 0; i < 60; i++) {
    if ((await store.queryEvents({ type: 'upstream' })).length >= expected) break
    await sleep(5)
  }
  await sleep(25)
  return store.queryEvents({ type: 'upstream' })
}

const postImage = (app, word, learner) => {
  const req = request(app).post('/image')
  if (learner) req.set('X-Learner-Id', learner)
  return req.send({ word })
}

const postTts = (app, body, learner) => {
  const req = request(app).post('/tts').responseType('blob')
  if (learner) req.set('X-Learner-Id', learner)
  return req.send(body)
}

// --- D2: /image miss then hit ----------------------------------------------

describe('/image cache (D2)', () => {
  it('first call for a word calls the provider once and stores the bytes', async () => {
    const fetchMock = stubFetch(imageRes)
    const store = spyStore()

    const res = await postImage(createApp({ store }), 'fish')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ url: PNG_DATA_URL })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const stored = await store.getAsset('img:fish')
    expect(stored).toBeTruthy()
    expect(stored.kind).toBe('image')
    expect(stored.mime).toBe('image/png')
    expect(Buffer.from(stored.bytes).equals(PNG)).toBe(true)
  })

  it('second call for the same word makes no provider call and returns identical bytes', async () => {
    const fetchMock = stubFetch(imageRes)
    const store = spyStore()
    const app = createApp({ store })

    const first = await postImage(app, 'fish')
    const second = await postImage(app, 'fish')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(second.status).toBe(200)
    expect(second.body).toEqual(first.body)
    expect(second.body).toEqual({ url: PNG_DATA_URL })
  })

  it('a different word is a different key and does call the provider', async () => {
    const fetchMock = stubFetch(imageRes)
    const store = spyStore()
    const app = createApp({ store })

    await postImage(app, 'fish')
    await postImage(app, 'manzana')

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(putKeys(store)).toEqual(['img:fish', 'img:manzana'])
  })

  it('uses the exact key `img:<word>` for both the lookup and the store', async () => {
    stubFetch(imageRes)
    const store = spyStore()
    const app = createApp({ store })

    await postImage(app, 'fish')
    await postImage(app, 'fish')

    expect(putKeys(store)).toEqual(['img:fish'])
    expect(getKeys(store)).toEqual(['img:fish', 'img:fish'])
  })
})

// --- D3: the cache is global across users -----------------------------------

describe('the asset cache is global, not per-learner (D3)', () => {
  it('a second /image from a different X-Learner-Id still hits the cache', async () => {
    const fetchMock = stubFetch(imageRes)
    const store = spyStore()
    const app = createApp({ store })

    const a = await postImage(app, 'fish', LEARNER_A)
    const b = await postImage(app, 'fish', LEARNER_B)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(b.body).toEqual(a.body)
    expect(putKeys(store)).toEqual(['img:fish'])
  })

  it('a second app instance sharing the store also hits the cache', async () => {
    const fetchMock = stubFetch(imageRes)
    const store = spyStore()

    const a = await postImage(createApp({ store }), 'fish', LEARNER_A)
    const b = await postImage(createApp({ store }), 'fish', LEARNER_B)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(b.body).toEqual(a.body)
  })

  it('a /tts hit is shared across learners too', async () => {
    const fetchMock = stubFetch(() => binRes(AUDIO))
    const store = spyStore()
    const app = createApp({ store })

    const a = await postTts(app, TTS, LEARNER_A)
    const b = await postTts(app, TTS, LEARNER_B)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(Buffer.from(b.body).equals(Buffer.from(a.body))).toBe(true)
  })
})

// --- D2: /tts miss then hit, and the sha256 key -----------------------------

describe('/tts cache (D2)', () => {
  it('first call for a (text, voiceId, lang) triple calls the provider and stores the audio', async () => {
    const fetchMock = stubFetch(() => binRes(AUDIO))
    const store = spyStore()

    const res = await postTts(createApp({ store }), TTS)

    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(Buffer.from(res.body).equals(AUDIO)).toBe(true)

    const stored = await store.getAsset(ttsKey(TTS))
    expect(stored).toBeTruthy()
    expect(stored.kind).toBe('tts')
    expect(stored.mime).toBe('audio/mpeg')
    expect(Buffer.from(stored.bytes).equals(AUDIO)).toBe(true)
  })

  it('the second identical call makes no provider call and returns the same bytes', async () => {
    const fetchMock = stubFetch(() => binRes(AUDIO))
    const store = spyStore()
    const app = createApp({ store })

    const first = await postTts(app, TTS)
    const second = await postTts(app, TTS)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(second.status).toBe(200)
    expect(second.headers['content-type']).toMatch(/audio\/mpeg/)
    expect(Buffer.from(second.body).equals(AUDIO)).toBe(true)
    expect(Buffer.from(second.body).equals(Buffer.from(first.body))).toBe(true)
  })

  it('keys the entry as `tts:` + sha256(text|voiceId|lang)', async () => {
    stubFetch(() => binRes(AUDIO))
    const store = spyStore()
    const app = createApp({ store })

    await postTts(app, TTS)
    await postTts(app, TTS)

    const expected = ttsKey(TTS)
    // Belt and braces: the digest is pinned literally, not just recomputed.
    expect(expected).toMatch(/^tts:[0-9a-f]{64}$/)
    expect(putKeys(store)).toEqual([expected])
    expect(getKeys(store)).toEqual([expected, expected])
  })
})

// --- D2: every component of the tts key matters -----------------------------

const TTS_VARIANTS = [
  { label: 'text', body: { ...TTS, text: 'Mija, ¿qué dice aqui?' } },
  { label: 'voiceId', body: { ...TTS, voiceId: 'voice_mama' } },
  { label: 'lang', body: { ...TTS, lang: 'en-US' } },
]

describe.each(TTS_VARIANTS)('changing $label produces a different tts key (D2)', ({ body }) => {
  it('misses the cache and calls the provider again', async () => {
    const fetchMock = stubFetch(() => binRes(AUDIO))
    const store = spyStore()
    const app = createApp({ store })

    await postTts(app, TTS)
    await postTts(app, body)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(putKeys(store)).toEqual([ttsKey(TTS), ttsKey(body)])
    expect(new Set(putKeys(store)).size).toBe(2)
  })
})

// --- D2: cache_hit in the upstream event row --------------------------------

describe('cache_hit on the upstream event (D2)', () => {
  it('a /image cache hit writes an upstream row with cache_hit true', async () => {
    stubFetch(imageRes)
    const store = spyStore()
    const app = createApp({ store })

    await postImage(app, 'fish', LEARNER_A)
    await postImage(app, 'fish', LEARNER_B)

    const rows = await settledUpstreamRows(store, 2)
    expect(rows).toHaveLength(2)

    const hits = rows.filter((r) => r.payload.cache_hit === true)
    const misses = rows.filter((r) => r.payload.cache_hit === false)
    expect(hits).toHaveLength(1)
    expect(misses).toHaveLength(1)
    expect(hits[0].payload).toMatchObject({
      route: '/image',
      provider: 'openai',
      status: 200,
    })
    expect(typeof hits[0].payload.duration_ms).toBe('number')
    expect(hits[0].learner_id).toBe(LEARNER_B)
  })

  it('a /tts cache hit writes an upstream row with cache_hit true', async () => {
    stubFetch(() => binRes(AUDIO))
    const store = spyStore()
    const app = createApp({ store })

    await postTts(app, TTS)
    await postTts(app, TTS)

    const rows = await settledUpstreamRows(store, 2)
    expect(rows).toHaveLength(2)
    expect(rows.filter((r) => r.payload.cache_hit === true)).toHaveLength(1)
    expect(rows.filter((r) => r.payload.cache_hit === true)[0].payload).toMatchObject({
      route: '/tts',
      provider: 'elevenlabs',
      status: 200,
    })
  })

  it('a cache MISS still writes cache_hit false (regression guard — passes today)', async () => {
    stubFetch(imageRes)
    const store = spyStore()

    await postImage(createApp({ store }), 'fish')

    const rows = await settledUpstreamRows(store, 1)
    expect(rows).toHaveLength(1)
    expect(rows[0].payload.cache_hit).toBe(false)
  })
})

// --- D3: cache_version is the manual bust mechanism -------------------------

describe('ASSET_CACHE_VERSION busts the cache (D3)', () => {
  it('changing the version prefix sends the next call back to the provider', async () => {
    const fetchMock = stubFetch(imageRes)
    const store = spyStore()

    await postImage(createApp({ store }), 'fish')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // Same store, same word — only the version moved.
    process.env.ASSET_CACHE_VERSION = 'v2'
    const res = await postImage(createApp({ store }), 'fish')

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(res.status).toBe(200)
    expect(putKeys(store)).toEqual(['img:fish', 'v2:img:fish'])
  })

  it('within one version the cache still hits, and the old entry survives', async () => {
    const fetchMock = stubFetch(imageRes)
    const store = spyStore()

    await postImage(createApp({ store }), 'fish')

    process.env.ASSET_CACHE_VERSION = 'v2'
    await postImage(createApp({ store }), 'fish')
    await postImage(createApp({ store }), 'fish')

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(await store.getAsset('img:fish')).toBeTruthy()
    expect(await store.getAsset('v2:img:fish')).toBeTruthy()
  })

  it('prefixes the tts key the same way', async () => {
    stubFetch(() => binRes(AUDIO))
    const store = spyStore()

    process.env.ASSET_CACHE_VERSION = 'v2'
    await postTts(createApp({ store }), TTS)

    expect(putKeys(store)).toEqual([`v2:${ttsKey(TTS)}`])
  })
})

// --- D2: failures are never cached ------------------------------------------

const FAILURE_CASES = [
  {
    label: '/image',
    fail: () => textRes('openai rate_limit_exceeded', 429),
    ok: imageRes,
    send: (app) => postImage(app, 'fish'),
    key: 'img:fish',
  },
  {
    label: '/tts',
    fail: () => textRes('elevenlabs invalid_api_key', 401),
    ok: () => binRes(AUDIO),
    send: (app) => postTts(app, TTS),
    key: ttsKey(TTS),
  },
]

describe.each(FAILURE_CASES)('$label does not cache an upstream failure (D2)', (c) => {
  it('retries against the provider after a 502 and stores only the success', async () => {
    let mode = 'fail'
    const fetchMock = stubFetch(() => (mode === 'fail' ? c.fail() : c.ok()))
    const store = spyStore()
    const app = createApp({ store })

    const bad = await c.send(app)
    expect(bad.status).toBe(502)
    expect(await store.getAsset(c.key)).toBeNull()

    mode = 'ok'
    const good = await c.send(app)

    expect(good.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(putKeys(store)).toEqual([c.key])
  })
})

// --- D4: text/LLM is never cached (guard) -----------------------------------

describe('/generate is never cached (D4 — guard, passes today)', () => {
  it('two identical /generate calls both reach the provider', async () => {
    const fetchMock = stubFetch(() => jsonRes({ content: [{ type: 'text', text: 'Hola, mija.' }] }))
    const store = spyStore()
    const app = createApp({ store })

    const first = await request(app).post('/generate').send({ prompt: 'una frase' })
    const second = await request(app).post('/generate').send({ prompt: 'una frase' })

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(store.putAsset).not.toHaveBeenCalled()
    expect(store.getAsset).not.toHaveBeenCalled()
  })
})

// --- guard: an /image response with only a remote url is passed through -----

describe('/image with a remote url response (guard — passes today)', () => {
  it('returns the url unchanged and never fetches it', async () => {
    const fetchMock = stubFetch(() => jsonRes({ data: [{ url: 'https://example.test/fish.png' }] }))
    const store = spyStore()

    const res = await postImage(createApp({ store }), 'fish')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ url: 'https://example.test/fish.png' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
