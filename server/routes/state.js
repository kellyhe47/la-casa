// GET / PUT /state/:id — PRD v2 §6 (Workstream E), E1 + E3.
//
// The learner's skill graph and independence band, persisted server-side so a
// session survives a reload or a device change.
//
// Both routes are scoped by the `X-Learner-Id` header: it is required and must
// equal `:id`, so a learner can only ever read or write its own row. Rejected
// requests never touch the store.
//
// These MUST be mounted before the SPA catch-all (`app.get('*')`) — otherwise
// an unknown learner is answered 200 index.html instead of 404 (PRD §12).

import { learnerIdOf } from '../telemetry.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Validate the path id and the caller's header in one place.
 * Returns `{ id }` on success or `{ failure: {status, body} }`.
 */
function authorize(req) {
  const id = req.params?.id

  // A malformed uuid is 400, NOT 404: 404 means "this learner has no saved
  // state", which is a different answer the client acts on differently.
  if (typeof id !== 'string' || !UUID_RE.test(id)) {
    return { failure: { status: 400, body: { error: 'invalid_learner_id' } } }
  }

  const header = learnerIdOf(req)
  if (!header) {
    return { failure: { status: 400, body: { error: 'missing_learner_id' } } }
  }
  if (header !== id) {
    return { failure: { status: 403, body: { error: 'learner_mismatch' } } }
  }

  return { id }
}

const reject = (res, failure) => res.status(failure.status).json(failure.body)

/**
 * `resolveStore` is a zero-arg function returning a promise for the store, so
 * `createApp` stays synchronous.
 */
export function getStateHandler(resolveStore) {
  return async (req, res) => {
    const { id, failure } = authorize(req)
    if (failure) return reject(res, failure)

    const store = await resolveStore()
    const state = await store.getLearnerState(id)
    if (!state) return res.status(404).json({ error: 'not_found' })

    // Exactly `{graph, independence}` — the client hands this straight to the
    // SkillGraph constructor, so no extra keys.
    res.json({ graph: state.graph, independence: Number(state.independence) })
  }
}

export function putStateHandler(resolveStore) {
  return async (req, res) => {
    const { id, failure } = authorize(req)
    if (failure) return reject(res, failure)

    const { graph, independence } = req.body ?? {}

    const store = await resolveStore()
    // Refresh last_seen first (E1) — the learners row is the FK target.
    await store.upsertLearner(id)
    const saved = await store.putLearnerState(id, {
      graph: graph ?? null,
      // An integer band: 7 saved must read back as 7, never a default.
      independence: Number(independence),
    })

    res.status(200).json({
      graph: saved?.graph ?? graph ?? null,
      independence: Number(saved?.independence ?? independence),
    })
  }
}
