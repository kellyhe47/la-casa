// TICKET 012 / PRD v2 C3 + E4.
//
// Fire-and-forget client telemetry: posts `grade` / `client_error` batches to
// POST /events. It never throws into a caller, swallows its own network
// failures, and leaks no unhandled rejection — telemetry is never worth
// interrupting gameplay.

import { apiHeaders } from '../state/learnerId'

export type ClientEventType = 'grade' | 'client_error'

const noop = (): void => {}

export function emitEvent(type: ClientEventType, payload: Record<string, unknown>): void {
  try {
    if (typeof fetch !== 'function') return
    const body = JSON.stringify({ events: [{ type, payload }] })
    // Both handlers are attached in the same `then`, so no rejected promise is
    // ever left without a handler.
    fetch('/events', {
      method: 'POST',
      headers: apiHeaders(),
      body,
    }).then(noop, noop)
  } catch {
    // A serialization failure or a synchronously-throwing fetch: drop the event.
  }
}
