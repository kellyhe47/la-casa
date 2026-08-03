---
id: 024
title: "No grade events are ever emitted — learning signal chart is empty by construction"
status: tests-written
depends_on: [012, 019, 022]
touches: [client/src/state/appStore.ts, client/src/screens/LivingRoomScreen.tsx, client/src/screens/FridgeScreen.tsx, client/src/screens/BedroomScreen.tsx]
iterations: 0
test_files: [client/src/state/gradeTelemetry.test.tsx]
branch: ""
---

> **Found by the user:** the Learning signal chart on `/observability` shows no
> data.

## The defect

`emitEvent` is called from exactly ONE place in the whole client —
`client/src/state/saveState.ts:11`, and only for `client_error`. **Nothing ever
emits a `grade` event.**

The chart is wired correctly and its aggregation is tested (ticket 019 seeds
`grade` rows directly into the store and asserts pass rate and band). But no
`grade` row is ever produced by the running app, so `series.learning` is empty
by construction.

This is the same shape as ticket 022: the mechanism was built (C3's `POST
/events` accepts `grade`; `emitEvent` can send it) and never wired to gameplay.

PRD §9 calls the learning signal *"the differentiated chart"* and says to
protect it if time runs short — it is the one chart that is evidence the
pedagogy works rather than ops telemetry.

## Fix

`commitItemBoundary(graph)` (ticket 022) already runs at **every** item boundary
in all three screens and is the single place that closes an item. Extend it to
also emit the grade event, capturing the band on both sides of the boundary:

```ts
commitItemBoundary(graph, grade?: { word, nodeIds, result, screen })
// band_before = graph.independence() BEFORE recordItemBoundary()
// band_after  = graph.independence() AFTER  recordItemBoundary()
```

Screens pass the grade info they already have. Exactly one `grade` event per
item boundary, fire-and-forget, and a telemetry failure must never interrupt
gameplay.

Payload per PRD §4: `word`, `node_ids`, `result`, `similarity`, `band_before`,
`band_after`, `screen`. `similarity` is only meaningful for the ASR-graded
screens; omit or null it where there is none.

⚠️ `result` is numeric `0 | 1` — the encoding the whole codebase uses, and the
one ticket 019's aggregation counts (`Number(result) === 1`). Do not send
strings; that bug already cost one iteration.

## Acceptance criteria

- [ ] A living-room pass emits one `grade` event with `result: 1`
- [ ] A living-room miss emits one `grade` event with `result: 0`
- [ ] A fridge correct spelling emits one `grade` event with `result: 1`
- [ ] A fridge scene failure emits one `grade` event with `result: 0`
- [ ] A bedroom page pass and a bedroom miss each emit one `grade` event
- [ ] `band_before` and `band_after` straddle the boundary — on a band-down item they differ by 1
- [ ] `screen` identifies which scene produced the event
- [ ] `word` and `node_ids` are populated
- [ ] `result` is the **number** 0 or 1, never a string
- [ ] Exactly one `grade` event per item boundary — no duplicates on a graced item
- [ ] A failing `/events` post does not interrupt gameplay
- [ ] End-to-end: playing produces rows that make `/debug/metrics` `series.learning` non-empty with a correct `pass_rate`

## Test plan

`client/src/state/gradeTelemetry.test.tsx` — 8 tests, all RED. Same harness shape
as 022's `saveCadence.test.tsx`: every test renders a real screen, performs a real
interaction, and asserts on the body of `POST /events`. No test names `emitEvent`,
`commitItemBoundary` or any store action.

| Criterion | Test |
| --- | --- |
| living-room pass → one `grade`, `result: 1`; `screen`/`word`/`node_ids` populated; numeric result | a living-room PASS posts one grade event with numeric result 1 |
| living-room miss → one `grade`, `result: 0`; numeric, never a string | a living-room MISS posts one grade event with numeric result 0 |
| `band_before`/`band_after` straddle the boundary (differ by 1 on band-down); exactly one event per boundary, no duplicate on a graced item | band_before/band_after straddle the boundary, one event per item |
| a failing `/events` post does not interrupt gameplay | a rejected /events post never interrupts gameplay |
| fridge correct spelling → one `grade`, `result: 1` | a correct spelling at the fridge posts one grade event with numeric result 1 |
| fridge scene failure → exactly one `grade`, `result: 0` (F4 makes 2 updates, 1 boundary) | a fridge scene failure posts exactly ONE grade event with numeric result 0 |
| bedroom page pass → one `grade` | a bedroom page PASS posts one grade event with numeric result 1 |
| bedroom miss → one `grade` | a bedroom page MISS posts one grade event with numeric result 0 |

Constraints pinned by the tests: `screen` is exactly `"living-room"` / `"fridge"` /
`"bedroom"` (the `Screen` union in `state/types.ts`); `result` is `typeof
"number"`; `node_ids` is a non-empty array and, on the two word-graded passes,
exactly `getNodesForWord(word)`; `band_before` is read BEFORE
`recordItemBoundary()` and `band_after` AFTER it.

NOT covered here: the final end-to-end criterion (`/debug/metrics`
`series.learning` non-empty with a correct `pass_rate`) is a server assertion and
this ticket does not touch `server/`. The client-side proof is the numeric
`result` + numeric `band_after` on the wire, which is exactly what
`server/metrics.js` aggregates. `similarity` is also unasserted: `grade()`
returns only `{pass, matchedWord}`, so surfacing a score would mean editing
`grading/grade.ts`, which is outside this ticket's `touches` and outside its ACs.

## Attempt log
