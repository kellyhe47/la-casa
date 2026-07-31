---
id: 018
title: "G1/G2 — content/lines.json + getLine(key, band) tier resolution"
status: tests-written
depends_on: [017]
touches: [content/lines.json, client/src/pipeline/lines.ts, client/src/pipeline/lines.test.ts, client/src/screens/FridgeScreen.tsx, client/src/screens/BedroomScreen.tsx]
iterations: 0
test_files: [client/src/pipeline/lines.test.ts, client/src/screens/FridgeScreen.test.tsx, client/src/screens/BedroomScreen.test.tsx]
branch: ""
---

## Scope

PRD §8 (Workstream G), criteria G1 and G2, implementing locked decisions D7 and D8.

**G1** — new `content/lines.json`: for every **Mom and Dad** line, three authored variants
keyed by tier. Authored JSON, **not** LLM-generated (D7 — and §11 lists LLM-generated
character dialogue as out of scope).

| Tier | Bands | Form |
|---|---|---|
| `spanish-first` | 1–4 | Spanish; English only for the target word. Most support. |
| `bilingual` | 5–6 | Full line in Spanish, then full line in English. |
| `english-only` | 7–10 | No Spanish. Least support. |

**G2** — `getLine(key, band)` resolves tier → variant. It replaces the hardcoded
`dadPrompts` tables (`FridgeScreen.tsx:87` and `:146`) and Mamá's literals
(including the `independence >= 7` arrival-line ternary at `BedroomScreen.tsx:219`).

**G3 is a hard boundary:** Abuela (Spanish always, by design) and the baby's babble are
**out of scope** — their strings stay exactly as they are.

**Testing note:** test that `getLine` resolves the right *tier* at the boundaries, not the
prose of the lines themselves.

## Acceptance criteria

Boundary resolution is the point — bands 4/5 and 6/7 are where tiers change:

- [ ] Bands 1, 2, 3, 4 all resolve to `spanish-first`
- [ ] Bands 5 and 6 resolve to `bilingual`
- [ ] Bands 7, 8, 9, 10 all resolve to `english-only`
- [ ] **Boundary 4→5:** band 4 is `spanish-first` and band 5 is `bilingual`
- [ ] **Boundary 6→7:** band 6 is `bilingual` and band 7 is `english-only`
- [ ] Out-of-range bands clamp rather than throw — 0 resolves as band 1, 11 as band 10
- [ ] An unknown key fails loudly (throws or returns a defined sentinel) rather than returning `undefined` into the UI
- [ ] Every key in `lines.json` has all three tier variants present and non-empty (D8: monotonically increasing English — assert structurally, not by prose)
- [ ] `getLine` returns a string for every key × every band 1–10
- [ ] Fridge Dad prompts come from `getLine`, and the hardcoded `dadPrompts` tables are gone
- [ ] Mamá's bedroom arrival line comes from `getLine`, and the `independence >= 7` ternary is gone
- [ ] **G3 boundary:** Abuela's strings and the baby babble arrays are unchanged and still not routed through `getLine`

## Test plan

_(test-writer fills in)_

## Attempt log
