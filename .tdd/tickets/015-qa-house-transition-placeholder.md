---
id: "015"
title: "QA: House transition is gradient placeholder, not house glide"
status: green
depends_on: ["012", "006"]
touches:
  - client/src/screens/TransitionScreen.tsx
  - client/src/assets/scenes/TransitionScene.tsx
test_files:
  - client/src/screens/TransitionScreen.test.tsx
iterations: 0
attempt_log: []
source: qa
---

## Scope

Replace the cream/peach gradient "Tap to skip" interstitial with a first-person house travel transition (parallax / doorway push-through) using SVG layer transforms (transform+opacity only), skippable after 1s.

## Acceptance criteria

- [ ] Between rail beats, camera glide through the house is visible (not a flat color wash alone)
- [ ] Skippable after 1s on tap
- [ ] Animation uses CSS/WAAPI transform+opacity on SVG layers (no canvas)

## Observed evidence (QA-028)

- Transition appears and skip works (`"Tap to skip"` → living room)
- Visual is a soft cream→peach diagonal gradient with centered "Tap to skip" only
- Screenshot: `.qa/evidence/QA-028-transition.png`

## Requirement (verbatim)

"Between beats, a first-person travel transition: the camera glides through the house (parallax pan across the cross-section / doorway push-through) from room to room. It is a transition, not a menu — no taps required, skippable after 1s." (PRD R3.2)
