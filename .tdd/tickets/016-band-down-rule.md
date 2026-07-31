---
id: 016
title: "F1/F3 — 2 consecutive misses = −1 band; record boundaries on miss"
status: green
depends_on: [013]
touches: [client/src/graph/SkillGraph.ts, client/src/graph/SkillGraph.test.ts, client/src/screens/LivingRoomScreen.tsx, client/src/screens/BedroomScreen.tsx]
iterations: 1
test_files: [client/src/graph/SkillGraph.test.ts, client/src/screens/LivingRoomScreen.test.tsx, client/src/screens/BedroomScreen.test.tsx]
branch: ""
---

## Scope

PRD §7 (Workstream F), criteria F1 and F3, implementing locked decision D9.

**F1** — band-down becomes **2 consecutive misses → −1 band**, floor 1. Today
`SkillGraph.ts:78` requires ≥3 misses in the last 5, but grace caps consecutive misses at
2, so bands ratchet up and realistically never fall. Since 2 consecutive misses is exactly
the grace trigger, the rule reads: *every graced item costs a band.*

Band-**up** is unchanged: slow, needs a 3-pass streak.

**F3** — call `recordItemBoundary()` on the **miss** branches in the living room and
bedroom, not only on pass/grace. Without this the new rule can never fire.

Net shape (PRD §7): up 1 slowly, down 1 immediately on a failed item. **A kid can never
get stranded** — this is what makes persistence safe to ship.

**Not in scope:** the bedroom fake pass and fridge misses (ticket 017).

## Acceptance criteria

- [ ] Two consecutive misses drop the band by exactly 1
- [ ] The drop is exactly 1 per call — hysteresis holds, a call never moves more than one band
- [ ] Miss, pass, miss does **not** drop the band — the misses must be consecutive
- [ ] A third consecutive miss followed by a boundary drops another band
- [ ] The band floors at 1 and never goes below, however many misses accumulate
- [ ] Band-up still requires a 3-pass streak and is capped at 10
- [ ] From band 7, two consecutive misses land at 6 (the stranding scenario the PRD names)
- [ ] The living room miss branch calls `recordItemBoundary()`
- [ ] The bedroom miss branch calls `recordItemBoundary()`
- [ ] Every pre-existing `SkillGraph.test.ts` case still passes, or is updated by the **test-writer** where it pinned the superseded ≥3-in-5 rule

## Test plan

_(test-writer fills in)_

## Attempt log
