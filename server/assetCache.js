// Global, permanent asset cache — PRD v2 §5 (Workstream D), D1 + D2 + D3.
//
// One seam for both binary-producing proxies (`/image`, `/tts`). Text/LLM is
// deliberately NOT cached (D4): variety is a feature on `/generate`.
//
// Keys are content-addressed and carry no learner id, so the cache is global
// (D3) — learner A's fish photo serves learner B. Nothing expires (D6); the
// only bust mechanism is the `ASSET_CACHE_VERSION` env var, read PER CALL so a
// bust needs no redeploy.
//
//   imageCacheKey('fish')                -> 'img:fish'
//   ttsCacheKey({text, voiceId, lang})   -> 'tts:<sha256(text|voiceId|lang)>'
//   ASSET_CACHE_VERSION=v2               -> 'v2:img:fish', 'v2:tts:<sha>'
//
// The store is reached through the per-request telemetry context, the same way
// `callUpstream` reaches it, so route handler signatures stay unchanged.
//
// A hit skips `callUpstream` entirely, so `readAsset` writes the one `upstream`
// row for the request itself with `cache_hit: true` — that column is what
// ticket 019's dashboard divides to get the hit rate, so every hit and every
// miss must produce exactly one row.

import { createHash } from 'node:crypto'

import { getTelemetryContext, recordUpstreamEvent } from './telemetry.js'

/** Current cache version, read per call. Unset/blank means "no prefix". */
export function cacheVersion() {
  const raw = process.env.ASSET_CACHE_VERSION
  const value = raw === undefined || raw === null ? '' : String(raw).trim()
  return value
}

/** Prepend `<version>:` verbatim when a version is configured. */
function versioned(key) {
  const version = cacheVersion()
  return version ? `${version}:${key}` : key
}

/** PRD §5.1: an image is keyed by the word it illustrates. */
export function imageCacheKey(word) {
  return versioned(`img:${word}`)
}

/**
 * PRD §5.1: TTS is keyed by the sha256 of the joined triple, lowercase hex.
 * The string is hashed as utf8 — accented text must not collide with its
 * unaccented twin.
 */
export function ttsCacheKey({ text, voiceId, lang }) {
  const digest = createHash('sha256').update(`${text}|${voiceId}|${lang}`, 'utf8').digest('hex')
  return versioned(`tts:${digest}`)
}

/** The in-flight request's store, or null outside a request context. */
async function contextStore() {
  const ctx = getTelemetryContext()
  if (!ctx?.resolveStore) return null
  try {
    return await ctx.resolveStore()
  } catch {
    return null
  }
}

/**
 * Look the key up. On a hit, record the request's `upstream` row with
 * `cache_hit: true` (nothing else will — `callUpstream` is never reached) and
 * return the row; on a miss return null and record nothing.
 *
 * A cache that is down must never fail a request: any error is a miss.
 */
export async function readAsset({ key, provider }) {
  const startedAt = Date.now()

  const store = await contextStore()
  if (!store?.getAsset) return null

  let asset
  try {
    asset = await store.getAsset(key)
  } catch {
    return null
  }
  if (!asset?.bytes) return null

  recordUpstreamEvent({
    provider,
    status: 200,
    durationMs: Date.now() - startedAt,
    cacheHit: true,
  })
  return asset
}

/**
 * Store bytes under `key`. Only ever called with a usable 2xx payload — an
 * upstream failure is never cached, so a retry after a 502 reaches the
 * provider again.
 */
export async function writeAsset({ key, kind, mime, bytes }) {
  const store = await contextStore()
  if (!store?.putAsset) return null
  try {
    return await store.putAsset({ key, kind, mime, bytes: Buffer.from(bytes) })
  } catch {
    // A write-through cache that cannot write still served the request.
    return null
  }
}
