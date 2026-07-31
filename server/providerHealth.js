// Per-provider upstream health, PRD v2 §2 criterion A3.
//
// In-process, deliberately NOT the events table: `/health` must still answer
// when Postgres is down. The timed-call helper in `upstream.js` records into
// this module.
//
// `resetProviderHealth()` exists for tests: module-global state would otherwise
// leak between cases.

export const PROVIDER_ENV_VARS = {
  anthropic: 'ANTHROPIC_API_KEY',
  elevenlabs: 'ELEVENLABS_API_KEY',
  openai: 'OPENAI_API_KEY',
}

export const PROVIDERS = Object.keys(PROVIDER_ENV_VARS)

const blank = () => ({ lastSuccess: null, lastFailure: null })

let state = Object.fromEntries(PROVIDERS.map((p) => [p, blank()]))

export function resetProviderHealth() {
  state = Object.fromEntries(PROVIDERS.map((p) => [p, blank()]))
}

function slot(provider) {
  if (!state[provider]) state[provider] = blank()
  return state[provider]
}

export function recordProviderSuccess(provider, at = new Date()) {
  slot(provider).lastSuccess = at.toISOString()
}

export function recordProviderFailure(provider, at = new Date()) {
  slot(provider).lastFailure = at.toISOString()
}

/** Key presence is read LIVE from the env on every call — never cached. */
export function isKeyPresent(provider) {
  return Boolean(process.env[PROVIDER_ENV_VARS[provider]])
}

/** Snapshot for `GET /health`. Touches no I/O — safe with Postgres down. */
export function getProviderHealth() {
  return Object.fromEntries(
    PROVIDERS.map((p) => [
      p,
      {
        keyPresent: isKeyPresent(p),
        lastSuccess: slot(p).lastSuccess,
        lastFailure: slot(p).lastFailure,
      },
    ])
  )
}
