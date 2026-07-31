---
id: 017
title: "F2/F4 — delete bedroom fake pass; record fridge misses once per scene"
status: pending
depends_on: [016]
touches: [client/src/screens/BedroomScreen.tsx, client/src/screens/FridgeScreen.tsx]
iterations: 0
test_files: []
branch: ""
---

## Scope

PRD §7, criteria F2 and F4.

**F2** — delete the fake pass at `BedroomScreen.tsx:153`. After a double failure,
`graph.update(uniqueNodeIds, 1)` credits **every node in the sentence at full mastery**
for a sentence the kid could not read. That inverts "generous credit, precise blame" and
is a straight correctness bug independent of bands. The grace *experience* (Mom models the
line, the story moves on) stays — only the mastery credit goes.

**F4** — fridge misses, implementing locked decision D10. `handleWordComplete` currently
returns early on a wrong letter (`FridgeScreen.tsx:106`) and records nothing. New behaviour:
the **first** word in a fridge scene where the kid places **2+ wrong letters** records one
failure event (2 misses → one band down), then a **scene-level flag disables all further
miss recording**. Subsequent misses change nothing.

**No fridge grace path** (§11, hard boundary) — the tray always permits eventual success,
so there is no stuck state.

## Acceptance criteria

- [ ] After a bedroom double failure, no node is credited with a pass — mastery does not rise
- [ ] The bedroom grace UX still runs: Mom appears, models the line, and the book advances
- [ ] A bedroom double failure still ends the item (the page is completed, not stuck)
- [ ] 2 wrong letters on a fridge word records exactly one failure event
- [ ] That one failure event is worth 2 misses and drops the band by 1
- [ ] A **second** word with 2+ wrong letters in the same fridge scene records **nothing** — max one per scene (D10)
- [ ] A single wrong letter does not record a failure
- [ ] After the scene flag trips, further misses leave the band unchanged
- [ ] A correct spelling still records a pass normally, before and after the flag trips
- [ ] No grace path is introduced in the fridge — the kid is never auto-passed
- [ ] Existing `FridgeScreen.test.tsx` and `BedroomScreen.test.tsx` cases still pass, or are updated by the **test-writer** where they pinned the fake pass

## Test plan

_(test-writer fills in)_

## Attempt log
