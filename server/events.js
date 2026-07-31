// Event recorder + retention sweep — PRD v2 §4 (Workstream C), C1 + C4.
//
// A thin, forgiving layer over the store. Everything that writes telemetry goes
// through `recordEvent` so type validation lives in exactly one place.
//
// Forgiving on purpose: telemetry must never be the reason a request fails.
// `recordEvent` resolves `null` for anything it will not write instead of
// throwing — POST /events (C3) must never 500 on partial garbage, and the proxy
// (C2) must never break because the database is down.

/** The only types the events table accepts (PRD §4, C1). */
export const EVENT_TYPES = ['upstream', 'grade', 'client_error']

/** Types a client is allowed to submit — `upstream` is server-owned (C2). */
export const CLIENT_EVENT_TYPES = ['grade', 'client_error']

/** Retention window for the boot sweep (C4). */
export const RETENTION_DAYS = 30

const DAY_MS = 24 * 60 * 60 * 1000

export function isEventType(type) {
  return EVENT_TYPES.includes(type)
}

/**
 * Write one event.
 *
 * recordEvent(store, { type, payload, learner_id?, ts? }) -> row | null
 *
 * Resolves the inserted row, or `null` when the type is unknown/missing or the
 * store refused the write. Never throws, never rejects.
 */
export async function recordEvent(store, { type, payload, learner_id = null, ts } = {}) {
  if (!store || typeof store.insertEvent !== 'function') return null
  if (!isEventType(type)) return null

  try {
    return await store.insertEvent({
      learner_id: learner_id ?? null,
      type,
      payload: payload && typeof payload === 'object' ? payload : {},
      ...(ts ? { ts } : {}),
    })
  } catch (e) {
    console.error(`[events] insert failed type=${type} error=${e?.message ?? String(e)}`)
    return null
  }
}

/**
 * Fire-and-forget wrapper: records without making the caller wait and without
 * ever surfacing an unhandled rejection. Returns the promise so callers that
 * *do* want to await (tests, POST /events) still can.
 */
export function recordEventAsync(store, event) {
  const p = recordEvent(store, event).catch(() => null)
  return p
}

/**
 * Delete events older than the retention window. Resolves the number deleted.
 * Callable without booting the server; `server/index.js` runs it on boot.
 */
export async function pruneEvents(store) {
  if (!store || typeof store.deleteEventsOlderThan !== 'function') return 0
  const cutoff = new Date(Date.now() - RETENTION_DAYS * DAY_MS)
  try {
    return (await store.deleteEventsOlderThan(cutoff)) ?? 0
  } catch (e) {
    console.error(`[events] prune failed error=${e?.message ?? String(e)}`)
    return 0
  }
}
