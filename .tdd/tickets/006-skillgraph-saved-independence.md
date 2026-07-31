---
id: 006
title: "E5 — SkillGraph constructor accepts a saved independence value"
status: pending
depends_on: []
touches: [client/src/graph/SkillGraph.ts, client/src/graph/SkillGraph.test.ts]
iterations: 0
test_files: []
branch: ""
---

## Scope

PRD §6, criterion E5 — **the highest-risk line in the PRD** (§12 risk table: "build first,
explicit test: save at band 7, reload, assert 7").

`SkillGraph.ts:11` hardcodes `this._independence = 3`. `toJSON()` writes the band out but
nothing can read it back. Without this fix, persistence silently half-fails: nodes resume,
band always snaps to 3.

Change the constructor to accept an optional saved independence value and use it when
provided, falling back to 3 when absent (E8: new players default to 3, preserving the
MVP's `R5.3`). The value must survive a full `toJSON()` → construct round-trip.

Keep the existing `_allAttempts` rebuild from `node.attempts` — band computation depends on it.

**Not in scope:** attempts truncation (ticket 013), any server or network work, and any
change to how independence *moves* (ticket 016).

## Acceptance criteria

The headline test, stated explicitly:

- [ ] **Round-trip:** build a graph, drive it to independence 7, `JSON.parse(JSON.stringify(g.toJSON()))`, construct a new `SkillGraph` from the serialized `nodes` + `independence`, and assert `independence() === 7`
- [ ] Constructing with no independence argument yields `independence() === 3` (new-player default)
- [ ] Constructing with an explicit `1` yields 1, and with `10` yields 10 (band floor/ceiling values round-trip)
- [ ] A hydrated graph's `nodes` and per-node `mastery` values match the serialized source
- [ ] `_allAttempts` is still rebuilt from `node.attempts` after hydration — a hydrated graph's next `recordItemBoundary()` sees the restored attempt history, not an empty one
- [ ] `toJSON()` still emits both `nodes` and `independence`
- [ ] Every pre-existing `SkillGraph.test.ts` case still passes

## Test plan

_(test-writer fills in)_

## Attempt log
