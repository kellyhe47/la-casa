---
id: "012"
title: "House transition animation + off-ramp screen"
status: pending
depends_on: ["005", "006"]
touches:
  - client/src/screens/TransitionScreen.tsx
  - client/src/screens/OffRampScreen.tsx
  - client/src/screens/TransitionScreen.test.tsx
test_files:
  - client/src/screens/TransitionScreen.test.tsx
iterations: 0
attempt_log: []
---

## Scope
Between-room transition animation + the off-ramp (hard fail / session end).

## Acceptance Criteria
- AC1: `<TransitionScreen from="living-room" to="fridge" />` renders a first-person camera glide (parallax pan or doorway push-through CSS animation, ≥1s)
- AC2: Transition is skippable after 1s on any tap (R3.2)
- AC3: Transition auto-advances to next screen on completion
- AC4: `<OffRampScreen />` shows: warm dark house with lit window illustration; text "La familia está durmiendo... come back soon"; no error language, no retry button (R8.4.4)
- AC5: Off-ramp is the ONLY visible end-state from hard pipeline failure (R11.4)
- AC6: Session end (Bedroom "Buenas noches") also leads to off-ramp after lights-dim animation
- AC7: Transitions use CSS keyframes / WAAPI on SVG layer groups — transform+opacity only (R9 animation rules)
