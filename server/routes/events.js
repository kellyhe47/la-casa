// POST /events — PRD v2 §4 (Workstream C), C3.
//
// Accepts a client-side batch of `grade` / `client_error` events. The client
// fires and forgets, so this endpoint must be fast and must NEVER 500: a
// malformed entry is skipped, its valid siblings are still written, and the
// response is still 2xx.
//
// `upstream` is server-owned (C2) and is rejected here — a client must not be
// able to forge proxy telemetry.

import { CLIENT_EVENT_TYPES, recordEvent } from '../events.js'
import { learnerIdOf } from '../telemetry.js'

/**
 * Build the handler. `resolveStore` is a zero-arg function returning a promise
 * for the store, so `createApp` stays synchronous.
 */
export function eventsHandler(resolveStore) {
  return async (req, res) => {
    const batch = req.body?.events
    if (!Array.isArray(batch) || batch.length === 0) {
      return res.json({ accepted: 0 })
    }

    const learner_id = learnerIdOf(req)

    let store
    try {
      store = await resolveStore()
    } catch {
      // Telemetry is never worth a 5xx.
      return res.json({ accepted: 0 })
    }

    // recordEvent resolves null for anything it will not write, so garbage
    // entries simply do not count towards `accepted`.
    const written = await Promise.all(
      batch.map((entry) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null
        if (!CLIENT_EVENT_TYPES.includes(entry.type)) return null
        return recordEvent(store, { type: entry.type, payload: entry.payload, learner_id })
      })
    )

    res.json({ accepted: written.filter(Boolean).length })
  }
}
