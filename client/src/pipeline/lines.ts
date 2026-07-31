/**
 * STUB — created by the 018/G test-writer so `lines.test.ts` and the screen
 * tests can import this module. It deliberately implements NOTHING: every
 * export returns `undefined` so the ticket's tests are genuinely red.
 *
 * The implementer replaces this file with the real tier resolver
 * (see `client/src/pipeline/lines.test.ts` for the pinned contract).
 */

export type Tier = "spanish-first" | "bilingual" | "english-only";

/** Band (1–10, clamped) → authored tier. */
export function tierForBand(_band: number): Tier {
  return undefined as unknown as Tier;
}

/** Resolve an authored Mom/Dad line for a band. */
export function getLine(_key: string, _band: number): string {
  return undefined as unknown as string;
}
