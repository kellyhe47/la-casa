---
id: 021
title: "_allAttempts diverges from node.attempts across a reload"
status: green
depends_on: [013]
touches: [client/src/graph/SkillGraph.ts, client/src/graph/SkillGraph.test.ts]
iterations: 1
test_files: [client/src/graph/SkillGraph.test.ts]
branch: ""
---

> **Not a PRD criterion.** Found by the ticket-006 test-writer while building the
> band-7 driver. Ticketed because it undermines E8 ("exact band resume") in a way
> the PRD assumes away, and because F1 (ticket 016) computes the band-down rule
> directly from `_allAttempts`. **Must land before 016.**

## Scope

`SkillGraph.update(nodeIds, result)` maintains two structures that are supposed to
carry the same attempt history:

- `node.attempts` — pushed **once per node** in `toUpdate`
- `_allAttempts` — pushed **once per call**

For a single-node update these agree. For a multi-node pass — which is the normal
case, since a pass credits *every* node in `nodeIds` — they do not. A pass over 3
nodes appends 1 entry to `_allAttempts` but 3 entries across `node.attempts`.

The constructor rebuilds `_allAttempts` from `node.attempts`. So after a save and
reload, `_allAttempts` contains **three times as many entries** for that item as it
did in the live session.

### Why it matters

`recordItemBoundary()` reads `_allAttempts.slice(-20)` for accuracy, `slice(-5)` for
the down-rule and `slice(-3)` for the pass streak. If hydration changes what those
windows contain, then:

- E8's "exact band resume" restores the band *scalar* correctly (ticket 006 proved
  that) but the band's **subsequent movement** differs before vs. after a reload
- F1's "2 consecutive misses → −1 band" (ticket 016) is computed off this list, so
  the same play produces different band changes depending on whether the kid
  reloaded — precisely the stranding class of bug F exists to eliminate

## Decision needed

Two defensible fixes; pick one and state it in the ticket:

- **(a) One entry per item.** `_allAttempts` is an *item* history, not a *node*
  history — the window sizes (20/5/3) read like item counts, and `recordItemBoundary`
  is called once per item. Then the constructor cannot rebuild it from `node.attempts`
  and must serialize it separately.
- **(b) One entry per node.** Make `update()` push per-node into `_allAttempts` so it
  matches what rebuild produces. Cheaper, but it silently rescales every window: a
  3-node pass would fill 3 of the 5 down-rule slots.

**(a) is the better reading of the PRD** — §7's "2 consecutive misses" and "needs a
3-pass streak" are plainly about *items*, not nodes. But it changes the serialized
shape, so it interacts with E6 truncation (013). Sequence accordingly.

## Acceptance criteria

- [ ] After update → serialize → hydrate, the hydrated graph's band-relevant history is equivalent to the live graph's — a subsequent `recordItemBoundary()` produces the same band change either way
- [ ] A multi-node pass contributes the same amount of history as a single-node pass with the same result
- [ ] Ticket 006's round-trip tests still pass (band scalar still resumes exactly)
- [ ] Ticket 013's truncation still keeps ≥20 items of usable history after hydration
- [ ] The 3-pass streak rule counts three *items*, not three nodes touched by one item
- [ ] Existing `SkillGraph.test.ts` cases pass, or are updated by the test-writer where they pinned the divergent behaviour

## Test plan

_(test-writer fills in)_

## Attempt log
