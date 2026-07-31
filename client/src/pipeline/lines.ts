/**
 * Band-tiered Mom and Dad dialogue (PRD-v2 §8, locked decisions D7 + D8).
 *
 * "The world turns English as the band rises" used to be a couple of stray
 * `if`s — a gloss threshold here, an `independence >= 7` ternary there. It is
 * now one authored table (`content/lines.json`) and one resolver.
 *
 * The variants are AUTHORED, never generated (D7; PRD-v2 §11 puts LLM character
 * dialogue out of scope) — nothing in this module calls a model.
 *
 * Abuela and the baby are deliberately absent (PRD-v2 §8.3, G3): Abuela speaks
 * Spanish always, by design, and the baby's babble is pre-baked. Neither is
 * band-tiered, so neither is resolved here.
 */
import { lines } from "../../../content/lines.json";

export type Tier = "spanish-first" | "bilingual" | "english-only";

/** The authored table. Prose lives in JSON; only structure lives here. */
const TABLE = lines as unknown as Record<string, Partial<Record<Tier, string>>>;

const MIN_BAND = 1;
const MAX_BAND = 10;

/**
 * Band (clamped to 1–10) → authored tier. D8: monotonically increasing English.
 * Out-of-range bands clamp rather than throw — a band is a derived number and a
 * bad one must never take the scene down mid-story.
 *
 * Deliberately NOT unified with `getIndependenceRule` in storyBible.ts: that
 * splits 1-2/3-4/5-6/7-8/9-10 for LLM prompt rule text, this splits
 * 1-4/5-6/7-10 for authored dialogue. Collapsing them breaks the 4→5 boundary.
 */
export function tierForBand(band: number): Tier {
  const clamped = Math.min(MAX_BAND, Math.max(MIN_BAND, Math.floor(band)));
  if (clamped <= 4) return "spanish-first";
  if (clamped <= 6) return "bilingual";
  return "english-only";
}

/** Is `key` authored? Lets callers fall back to a `.default` key deliberately. */
export function hasLine(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(TABLE, key);
}

/**
 * Resolve an authored Mom/Dad line for a band.
 *
 * Throws on an unknown key or a missing variant: a silent `undefined` here
 * would reach TTS and be spoken as nothing at all, which is far harder to
 * notice than a loud failure at the call site.
 */
export function getLine(key: string, band: number): string {
  const variants = TABLE[key];
  if (!variants) {
    throw new Error(`getLine: unknown line key "${key}" — not in content/lines.json`);
  }
  const tier = tierForBand(band);
  const line = variants[tier];
  if (!line) {
    throw new Error(`getLine: "${key}" has no "${tier}" variant in content/lines.json`);
  }
  return line;
}
