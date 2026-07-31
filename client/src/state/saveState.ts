// TICKET 012 / PRD v2 E4 — fire-and-forget state writes at every item
// boundary (D13). ~30 writes/session of ~6KB. A failed save turns into a
// `client_error` event and NEVER interrupts gameplay, and one failure never
// disables later saves — every boundary issues its own independent PUT.

import type { SkillGraph } from '../graph/SkillGraph'
import { apiHeaders, getLearnerId } from './learnerId'
import { emitEvent } from '../pipeline/telemetry'

function reportFailure(route: string, detail: Record<string, unknown>): void {
  emitEvent('client_error', { kind: 'fetch', route, ...detail })
}

/** Persist the learner's graph + independence band. Returns immediately. */
export function saveLearnerState(graph: SkillGraph): void {
  let route = '/state/'
  try {
    if (typeof fetch !== 'function') return
    route = `/state/${getLearnerId()}`
    const body = JSON.stringify({
      graph: graph.toJSON(),
      independence: graph.independence(),
    })

    fetch(route, {
      method: 'PUT',
      headers: apiHeaders(),
      body,
    }).then(
      (res) => {
        if (!res || !res.ok) {
          reportFailure(route, { status: res?.status ?? 0, message: 'state save rejected' })
        }
      },
      (err: unknown) => {
        reportFailure(route, { message: err instanceof Error ? err.message : String(err) })
      },
    ).catch(() => {
      // Belt and braces: nothing downstream of the save may surface as an
      // unhandled rejection.
    })
  } catch (err) {
    reportFailure(route, { message: err instanceof Error ? err.message : String(err) })
  }
}
