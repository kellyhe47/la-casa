import { describe, it, expect } from "vitest";
import { getLine, tierForBand, type Tier } from "./lines";
import { lines } from "../../../content/lines.json";

/* ------------------------------------------------------------------ *
 * TICKET 018 — Workstream G1/G2: band-tiered Mom/Dad dialogue
 *
 * "The world turns English as the band rises" is currently two stray `if`s.
 * G1 authors `content/lines.json` — for every MOM and DAD line, three variants
 * keyed by tier. G2 adds `getLine(key, band)`, which resolves band → tier →
 * variant and replaces the hardcoded `dadPrompts` tables and Mamá's literals.
 *
 * Locked decision D8 (PRD-v2 §8):
 *   bands 1–4  → "spanish-first"   (most support)
 *   bands 5–6  → "bilingual"
 *   bands 7–10 → "english-only"    (least support)
 * Monotonically increasing English — never the other way.
 *
 * TESTING POSTURE (orchestrator directive): this file asserts TIER SELECTION
 * and STRUCTURE. It never asserts the prose of a line — the Spanish and English
 * wording is authored content and will churn. The one place a variant's *text*
 * is touched is the "monotonically increasing English" check below, and even
 * there the assertion is only that two tiers DIFFER, never what they say.
 *
 * G3 IS A HARD BOUNDARY (PRD-v2 §8.3): Abuela (Spanish always, by design) and
 * the baby's babble stay exactly as they are. They must never appear here.
 * ------------------------------------------------------------------ */

/** The authored table, structurally typed. Prose is never read from it. */
const LINES = lines as unknown as Record<string, Record<string, string>>;

const TIERS: Tier[] = ["spanish-first", "bilingual", "english-only"];

/** D8, table-driven: every band in range and the tier it must resolve to. */
const BAND_TIERS: Array<[number, Tier]> = [
  [1, "spanish-first"],
  [2, "spanish-first"],
  [3, "spanish-first"],
  [4, "spanish-first"],
  [5, "bilingual"],
  [6, "bilingual"],
  [7, "english-only"],
  [8, "english-only"],
  [9, "english-only"],
  [10, "english-only"],
];

/**
 * The keys the ticket's acceptance criteria pin: the eight fridge Dad prompts
 * that replace `dadPrompts` (FridgeScreen.tsx ~line 87) and Mamá's bedroom
 * arrival line that replaces the `independence >= 7` ternary.
 *
 * `lines.json` MAY carry more Mom/Dad keys (Dad's success and goodnight lines,
 * Mamá's grace and goodnight lines) — everything present is held to the same
 * structural bar below. These nine are the ones that MUST exist.
 */
const REQUIRED_KEYS = [
  "dad.fridge.prompt.fish",
  "dad.fridge.prompt.beans",
  "dad.fridge.prompt.milk",
  "dad.fridge.prompt.shop",
  "dad.fridge.prompt.stop",
  "dad.fridge.prompt.the",
  "dad.fridge.prompt.van",
  "dad.fridge.prompt.default",
  "mom.bedroom.arrival",
];

/** Keys whose variants are whole sentences, so the tiers must actually differ. */
const FULL_SENTENCE_KEYS = ["dad.fridge.prompt.fish", "mom.bedroom.arrival"];

describe("018 G2: getLine resolves band → tier", () => {
  it.each(BAND_TIERS)("band %i resolves to the %s tier", (band, tier) => {
    expect(tierForBand(band)).toBe(tier);
  });

  it("BOUNDARY 4→5: band 4 is spanish-first, band 5 is bilingual", () => {
    expect(tierForBand(4)).toBe("spanish-first");
    expect(tierForBand(5)).toBe("bilingual");
  });

  it("BOUNDARY 6→7: band 6 is bilingual, band 7 is english-only", () => {
    expect(tierForBand(6)).toBe("bilingual");
    expect(tierForBand(7)).toBe("english-only");
  });

  it("out-of-range bands CLAMP rather than throw — 0 reads as band 1, 11 as band 10", () => {
    expect(() => tierForBand(0)).not.toThrow();
    expect(() => tierForBand(11)).not.toThrow();
    expect(tierForBand(0)).toBe(tierForBand(1));
    expect(tierForBand(11)).toBe(tierForBand(10));
    // and further out, in both directions
    expect(tierForBand(-5)).toBe("spanish-first");
    expect(tierForBand(99)).toBe("english-only");
  });

  it("getLine returns exactly the variant for the band's tier, for every key × band 1–10", () => {
    for (const key of REQUIRED_KEYS) {
      for (const [band, tier] of BAND_TIERS) {
        const variant = LINES[key]?.[tier];
        expect(variant, `lines.json is missing ${key}.${tier}`).toBeTruthy();
        expect(getLine(key, band), `${key} @ band ${band}`).toBe(variant);
      }
    }
  });

  it("getLine returns a non-empty string for every key × band 1–10", () => {
    for (const key of REQUIRED_KEYS) {
      for (const [band] of BAND_TIERS) {
        const line = getLine(key, band);
        expect(typeof line, `${key} @ band ${band}`).toBe("string");
        expect(line.trim().length, `${key} @ band ${band}`).toBeGreaterThan(0);
      }
    }
  });

  it("getLine clamps out-of-range bands instead of throwing or returning undefined", () => {
    for (const key of REQUIRED_KEYS) {
      expect(() => getLine(key, 0)).not.toThrow();
      expect(getLine(key, 0), `${key} @ band 0`).toBeTruthy();
      expect(getLine(key, 11), `${key} @ band 11`).toBeTruthy();
      expect(getLine(key, 0)).toBe(getLine(key, 1));
      expect(getLine(key, 11)).toBe(getLine(key, 10));
    }
  });

  it("an unknown key FAILS LOUDLY — it never leaks undefined into the UI", () => {
    let returned: unknown;
    let threw = false;
    try {
      returned = getLine("dad.fridge.prompt.definitely-not-a-real-key", 5);
    } catch {
      threw = true;
    }
    if (threw) return; // throwing is loud enough
    // Otherwise it must be a defined, non-empty string sentinel — never
    // undefined/null/"" , which is what would silently reach TTS today.
    expect(returned).toBeDefined();
    expect(returned).not.toBeNull();
    expect(typeof returned).toBe("string");
    expect(String(returned).trim().length).toBeGreaterThan(0);
  });
});

describe("018 G1: content/lines.json is structurally complete", () => {
  it("carries the Mom/Dad keys the screens need", () => {
    expect(Object.keys(LINES).length).toBeGreaterThan(0);
    for (const key of REQUIRED_KEYS) {
      expect(LINES[key], `missing key: ${key}`).toBeDefined();
    }
  });

  it("every key has all three tier variants, each a non-empty string", () => {
    const keys = Object.keys(LINES);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      const variants = LINES[key];
      expect(typeof variants, key).toBe("object");
      expect(Object.keys(variants).sort(), key).toEqual([...TIERS].sort());
      for (const tier of TIERS) {
        expect(typeof variants[tier], `${key}.${tier}`).toBe("string");
        expect(variants[tier].trim().length, `${key}.${tier}`).toBeGreaterThan(0);
      }
    }
  });

  it("D8 monotonic English: a full-sentence line reads differently in all three tiers", () => {
    // Structural, not prose: we assert the three tiers are DIFFERENT strings,
    // never what any of them says. (Short keys — e.g. a replay that is just the
    // word — are exempt; only whole sentences are held to this.)
    for (const key of FULL_SENTENCE_KEYS) {
      const variants = TIERS.map((t) => LINES[key]?.[t]);
      variants.forEach((v, i) => expect(v, `${key}.${TIERS[i]}`).toBeTruthy());
      expect(new Set(variants).size, `${key}: tiers must differ`).toBe(3);
    }
  });
});

describe("018 G3 BOUNDARY: Abuela and the baby are out of scope", () => {
  // GUARD — passes today and must keep passing. Abuela speaks Spanish always,
  // by design (PRD-v2 §8.3), and the baby's babble is pre-baked. Neither is
  // band-tiered, so neither belongs in lines.json.
  it("GUARD: lines.json has no abuela or baby keys — only mom.* and dad.*", () => {
    for (const key of Object.keys(LINES)) {
      expect(key, `out-of-scope key: ${key}`).not.toMatch(/abuela|baby|bebe|hermanito|babble|giggle/i);
      expect(key, `unexpected owner: ${key}`).toMatch(/^(mom|dad)\./);
    }
  });
});
