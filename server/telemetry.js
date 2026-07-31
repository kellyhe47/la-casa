// Per-request telemetry context — PRD v2 §4 (Workstream C), C2.
//
// `callUpstream()` is the single seam every provider call passes through, but
// it is called from route handlers that know nothing about the request object.
// Rather than thread `req` (and a store) through every handler signature, the
// app installs one middleware that binds an AsyncLocalStorage context for the
// life of the request; `callUpstream` reads it at record time.
//
// That keeps `createApp` synchronous: the context carries a *function* that
// resolves the store promise lazily, so `getStore()` (async) is only awaited
// when a row is actually written, never during app construction.
//
// Ticket 010 extends this same context with cache lookups — a cache hit records
// `cache_hit: true` by passing it to `recordUpstreamEvent` from the cache seam.

import { AsyncLocalStorage } from 'node:async_hooks'

import { recordEventAsync } from './events.js'

const storage = new AsyncLocalStorage()

/**
 * Bind a telemetry context for the duration of `fn` (an Express `next`).
 *
 * context: { resolveStore: () => Promise<store>, route: string, learnerId: string|null }
 */
export function runWithTelemetry(context, fn) {
  return storage.run(context, fn)
}

/** The active request's telemetry context, or null outside a request. */
export function getTelemetryContext() {
  return storage.getStore() ?? null
}

/** Read `X-Learner-Id` off a request; null when absent or blank. */
export function learnerIdOf(req) {
  const raw = req?.get?.('x-learner-id') ?? req?.headers?.['x-learner-id']
  const value = Array.isArray(raw) ? raw[0] : raw
  return value ? String(value) : null
}

/**
 * Record exactly one `upstream` row for the in-flight request.
 *
 * Fire-and-forget: never awaited by the proxy, never rejects, never blocks the
 * response. A no-op outside a request context (e.g. a direct unit test of a
 * route module).
 */
export function recordUpstreamEvent({ provider, status, durationMs, error, cacheHit = false }) {
  const ctx = getTelemetryContext()
  if (!ctx) return Promise.resolve(null)

  const payload = {
    route: ctx.route,
    provider,
    status,
    duration_ms: Math.max(0, Number(durationMs) || 0),
    cache_hit: Boolean(cacheHit),
  }
  if (error) payload.error = String(error)

  return (async () => {
    try {
      const store = await ctx.resolveStore()
      return await recordEventAsync(store, {
        type: 'upstream',
        learner_id: ctx.learnerId ?? null,
        payload,
      })
    } catch {
      return null
    }
  })()
}
