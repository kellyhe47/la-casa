---
id: 013
title: "E6 — truncate node attempts to the last 50 on serialize"
status: green
depends_on: [006]
touches: [client/src/graph/SkillGraph.ts, client/src/graph/SkillGraph.test.ts]
iterations: 1
test_files: [client/src/graph/SkillGraph.test.ts]
branch: ""
---

## Scope

PRD §6, criterion E6. `GraphNode.attempts` is append-only and unbounded, but
`recordItemBoundary` only ever reads the last 20. Truncate to the **last 50 per node**
on serialize to keep the payload flat at ~6KB forever.

⚠️ **Stated coupling (PRD §6 E6):** `_allAttempts` is rebuilt from `node.attempts` in the
constructor, so truncating below ~20 would corrupt band computation. 50 is the floor with
margin — the tests must pin that the *most recent* attempts are the ones kept.

Truncation happens **on serialize**, not on record — the in-memory graph keeps its full
history for the life of the session.

## Acceptance criteria

- [ ] A node with 120 attempts serializes with exactly 50
- [ ] The 50 kept are the **most recent** 50 — the newest attempt survives and the oldest does not
- [ ] Attempt order is preserved (oldest-to-newest) within the kept window
- [ ] A node with fewer than 50 attempts is serialized unchanged
- [ ] A node with exactly 50 is serialized unchanged
- [ ] Truncation does not mutate the live in-memory graph — after `toJSON()`, the node still holds all 120 attempts
- [ ] Round-trip safety: serialize a heavily-exercised graph, hydrate it, and `recordItemBoundary()` still sees ≥20 attempts of history
- [ ] Independence still round-trips correctly through a truncating serialize (ticket 006 must not regress)

## Test plan

_(test-writer fills in)_

## Attempt log
