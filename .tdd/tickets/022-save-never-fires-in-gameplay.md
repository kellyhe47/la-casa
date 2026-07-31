---
id: 022
title: "E4 save never fires during real gameplay"
status: green
depends_on: [012, 014]
touches: [client/src/state/appStore.ts, client/src/screens/LivingRoomScreen.tsx, client/src/screens/FridgeScreen.tsx, client/src/screens/BedroomScreen.tsx]
iterations: 1
test_files: [client/src/state/saveCadence.test.tsx]
branch: ""
---

> **Regression found by the user during manual testing**, after the run reported
> complete. Refreshing the app loses all progress.

## The defect

`saveLearnerState(graph)` is called from exactly one place —
`appStore.recordGrade` (`appStore.ts:138`). **No screen calls `recordGrade`.**

All three screens own their grading and update the graph directly:

| Screen | `recordGrade` | `recordWordResult` | `graph.update` |
|---|---|---|---|
| LivingRoomScreen | 0 | 2 | 2 |
| FridgeScreen | 0 | 1 | 3 |
| BedroomScreen | 0 | 0 | 2 |

`recordWordResult` only appends to `sessionMissedWords` / `sessionPassedWords`
— it does not save. So `recordGrade` is effectively dead code in the shipped
app, and **E4's write cadence (D13: every item boundary, fire-and-forget) never
happens.**

Hydration (E7/E8) works correctly — verified live by seeding a row via curl.
The read path is fine; the **write path is missing**, so there is never anything
to read back.

## Why the suite missed it

Ticket 012's test asserted "a state save is issued on each item boundary" by
calling `store.recordGrade(...)` directly. That is a unit test of an action the
screens bypass. No test drives a save *through a screen*, and the browser probe
seeded state with curl rather than by playing.

## Fix

`graph.recordItemBoundary()` **is** the item boundary, and the screens already
call it at every one. Add an explicit store action that pairs the boundary with
the save, and route every screen call site through it:

```ts
commitItemBoundary(): void   // graph.recordItemBoundary(); saveLearnerState(graph)
```

Replace every direct `graph.recordItemBoundary()` in the three screens with it.
Explicit and greppable — no monkey-patching the graph, and `SkillGraph` stays
framework-free with no knowledge of the network.

Keep `recordGrade` working (it still saves) so ticket 012's locked tests pass.

## Acceptance criteria

- [ ] A pass in the **living room** issues a `PUT /state/:id`
- [ ] A miss in the living room issues a `PUT /state/:id`
- [ ] A correct spelling in the **fridge** issues a `PUT /state/:id`
- [ ] A fridge scene failure (2+ wrong letters) issues a `PUT /state/:id`
- [ ] A bedroom page pass issues a `PUT /state/:id`
- [ ] A bedroom miss issues a `PUT /state/:id`
- [ ] The PUT body carries the band **after** the boundary ticked, not before
- [ ] No direct `graph.recordItemBoundary()` call remains in any screen
- [ ] A rejected save still does not interrupt gameplay (E4) and still emits `client_error{kind:'fetch'}`
- [ ] Exactly one save per item boundary — a graced item does not save twice
- [ ] Ticket 016's "exactly one boundary per item" guarantee still holds
- [ ] `recordGrade` still saves (ticket 012's locked tests keep passing)

## Test plan

_(test-writer fills in)_

## Attempt log
