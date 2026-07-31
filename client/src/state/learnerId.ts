// STUB — ticket 012 / PRD v2 E2. Implementation pending.
//
// The anonymous device UUID (D2): generated on first visit, held in
// localStorage under LEARNER_ID_KEY, sent as `X-Learner-Id` on every API call.
// localStorage holds ONLY this uuid — never a graph or state mirror.

/** The single localStorage key this app is allowed to write. */
export const LEARNER_ID_KEY = 'lacasa.learnerId'

/** The header every API request must carry (E2 / E3). */
export const LEARNER_ID_HEADER = 'X-Learner-Id'

export function getLearnerId(): string {
  throw new Error('getLearnerId not implemented')
}
