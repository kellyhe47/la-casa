---
id: 015
title: "D14 — new game: warm-seed reset, fresh UUID, confirm dialog"
status: pending
depends_on: [014]
touches: [client/src/state/appStore.ts, client/src/screens/TitleScreen.tsx, client/src/state/learnerId.ts]
iterations: 0
test_files: []
branch: ""
---

## Scope

PRD §10 step 6, implementing locked decision D14. A "new game" affordance that:

- performs a **warm-seed reset** (back to the demo seed graph at band 3)
- mints a **fresh UUID** — the old learner row is **preserved** server-side, not deleted
- is behind a **confirm dialog**
- is **hidden for first-time players** (nothing to lose ⇒ nothing to offer)

## Acceptance criteria

- [ ] The new-game control is **not rendered** when there is no saved state (first-time player)
- [ ] It **is** rendered when saved state exists
- [ ] Clicking it opens a confirm dialog and changes no state on its own
- [ ] Cancelling the dialog leaves the learner id and the graph untouched
- [ ] Confirming mints a **new** uuid, different from the previous one, and persists it to localStorage
- [ ] Confirming resets the graph to the warm demo seed at band 3
- [ ] Confirming issues **no** delete request — the old learner row is preserved
- [ ] After confirming, the app is in a playable fresh-session state

## Test plan

_(test-writer fills in)_

## Attempt log
