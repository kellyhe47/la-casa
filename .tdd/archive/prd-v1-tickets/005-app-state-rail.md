---
id: "005"
title: "App state machine: rail, session seed, beat transitions"
status: pending
depends_on: ["002"]
touches:
  - client/src/state/
  - client/src/state/appStore.ts
  - client/src/state/appStore.test.ts
  - client/src/state/types.ts
test_files:
  - client/src/state/appStore.test.ts
iterations: 0
attempt_log: []
---

## Scope
React context / store for top-level app state: current beat/screen, session seed, mic state, independence band. Uses Zustand or React Context+useReducer.

## Acceptance Criteria
- AC1: App starts in `title` screen state
- AC2: `startSession()` rolls a random session seed (string), seeds skill graph from `demo-state.json`, sets independence to 3, transitions to title mic-permission flow
- AC3: Screen sequence enforced: title → (mic granted) → living-room → fridge → bedroom → off-ramp
- AC4: `advanceBeat()` transitions to next screen in order; calling it from bedroom goes to off-ramp
- AC5: Session seed is accessible from any component
- AC6: `micState` tracks: `idle | requesting | granted | denied | listening | thinking`
- AC7: Requesting mic permission sets micState to `requesting`; on grant → `granted`; on deny → `denied` (game does not start)
- AC8: State is fully in-memory; no localStorage, no sessionStorage reads or writes
- AC9: `currentIndependence` derived from skill graph; updates silently at item boundaries (R5.4)
