// STUB — implemented by ticket 003 (PRD v2 §2, criterion A3).
//
// In-process, deliberately NOT the events table: `/health` must still answer
// when Postgres is down. The timed-call helper in `upstream.js` records into
// this module.
//
// `resetProviderHealth()` exists for tests: module-global state would otherwise
// leak between cases.

export function resetProviderHealth() {}
