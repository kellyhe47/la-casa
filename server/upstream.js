// Shared timed upstream call + three-way failure taxonomy.
// PRD v2 §2 (Workstream A), criteria A1 + A2.
//
// Every outbound provider call in `routes/` goes through `callUpstream()` so
// that timing, classification, failure logging and provider-health recording
// all happen at exactly one seam.
//
//   API key missing          -> 503 { error: 'not_configured', provider }
//   upstream responded !2xx  -> 502 { error: 'upstream', provider, status }
//   upstream threw / timed out -> 504 { error: 'upstream_unreachable', provider }

import {
  PROVIDER_ENV_VARS,
  isKeyPresent,
  recordProviderFailure,
  recordProviderSuccess,
} from './providerHealth.js'

/** Hard cap on how much upstream body text reaches the log. */
export const MAX_LOGGED_BODY = 500

export function apiKey(provider) {
  return process.env[PROVIDER_ENV_VARS[provider]]
}

export function hasApiKey(provider) {
  return isKeyPresent(provider)
}

/** The 503 payload for a provider whose key is not configured. */
export function notConfigured(provider) {
  return { status: 503, body: { error: 'not_configured', provider } }
}

/** Write a `{ status, body }` failure descriptor to an Express response. */
export function sendUpstreamFailure(res, failure) {
  return res.status(failure.status).json(failure.body)
}

/**
 * One structured line per failure: provider, numeric status, duration in ms and
 * the upstream body truncated to MAX_LOGGED_BODY chars.
 */
export function logUpstreamFailure({ provider, status, durationMs, body }) {
  const detail = String(body ?? '').slice(0, MAX_LOGGED_BODY)
  console.error(
    `[upstream] provider=${provider} status=${status} duration=${durationMs}ms body=${detail}`
  )
}

/**
 * Record + log a failure the route itself detected on an otherwise-2xx response
 * (e.g. a 200 whose payload is unusable). Returns a failure descriptor.
 */
export function noteUpstreamFailure({ provider, status, durationMs = 0, body }) {
  logUpstreamFailure({ provider, status, durationMs, body })
  recordProviderFailure(provider)
  return { status: 502, body: { error: 'upstream', provider, status } }
}

/**
 * Timed, classified fetch.
 *
 * Resolves to either
 *   { ok: true,  response, durationMs }            — caller reads the body
 *   { ok: false, failure: { status, body }, durationMs }
 *
 * On the failure path the response body has already been consumed for the log,
 * so the caller must not touch it. On the success path the body is untouched.
 */
export async function callUpstream({ provider, url, init }) {
  const startedAt = Date.now()

  let response
  try {
    response = await fetch(url, init)
  } catch (e) {
    const durationMs = Date.now() - startedAt
    logUpstreamFailure({
      provider,
      status: 0,
      durationMs,
      body: e?.message ?? String(e),
    })
    recordProviderFailure(provider)
    return {
      ok: false,
      durationMs,
      failure: { status: 504, body: { error: 'upstream_unreachable', provider } },
    }
  }

  const durationMs = Date.now() - startedAt

  if (!response.ok) {
    // Read the body exactly once, here, for the log.
    const body = await response.text().catch(() => '')
    logUpstreamFailure({ provider, status: response.status, durationMs, body })
    recordProviderFailure(provider)
    return {
      ok: false,
      durationMs,
      failure: {
        status: 502,
        body: { error: 'upstream', provider, status: response.status },
      },
    }
  }

  recordProviderSuccess(provider)
  return { ok: true, response, durationMs }
}
