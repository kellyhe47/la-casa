// STUB — ticket 012 / PRD v2 C3 + E4. Implementation pending.
//
// Fire-and-forget client telemetry: posts `grade` / `client_error` batches to
// POST /events. It must never throw into a caller and must swallow its own
// network failures — telemetry is never worth interrupting gameplay.

export type ClientEventType = 'grade' | 'client_error'

export function emitEvent(_type: ClientEventType, _payload: Record<string, unknown>): void {
  throw new Error('emitEvent not implemented')
}
