// STUB — ticket 007 (PRD v2 §4, C1 + C4). Not implemented yet.
//
// Thin recorder over the store: validates `type` and shapes the payload per the
// PRD §4 table, plus the 30-day boot retention sweep.

export async function recordEvent() {
  throw new Error('recordEvent: not implemented (ticket 007)')
}

export async function pruneEvents() {
  throw new Error('pruneEvents: not implemented (ticket 007)')
}
