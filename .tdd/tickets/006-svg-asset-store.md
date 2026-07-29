---
id: "006"
title: "SVG AssetStore: lift mock SVG layers into React components"
status: pending
depends_on: ["001"]
touches:
  - client/src/assets/
  - client/src/assets/AssetStore.tsx
  - client/src/assets/scenes/TitleScene.tsx
  - client/src/assets/scenes/LivingRoomScene.tsx
  - client/src/assets/scenes/FridgeScene.tsx
  - client/src/assets/scenes/BedroomScene.tsx
  - client/src/assets/scenes/TransitionScene.tsx
test_files: []
iterations: 0
attempt_log: []
---

## Scope
Extract SVG layer groups from the four `.dc.html` design mocks and wrap them as React components via the AssetStore seam. Strip dev chrome (state rails, notes strips, support.js). Keep each scene's layers as separable SVG groups (`#layer-bg`, `#layer-mid`, character groups, `#layer-hands`).

This ticket is VISUAL/LIFT — no unit tests (SVG rendering isn't unit-testable in jsdom). The acceptance criteria are verified by opening `npm run dev` in Chrome.

## Acceptance Criteria (visual, verified manually)
- AC1: `<TitleScene />` renders the house exterior SVG with all layers visible (no blank screen)
- AC2: `<LivingRoomScene />` renders the coral living room SVG with TV, couch, Abuela photos, cat
- AC3: `<FridgeScene />` renders the butter-yellow kitchen with fridge, stove, Dad character
- AC4: `<BedroomScene />` renders the dim lavender bedroom with crib, baby, lamp, mobile
- AC5: All scenes use inline SVG in the DOM (not `<img src=...>` or canvas)
- AC6: Dev chrome stripped from all scenes (no state rails, no notes strips, no support.js references)
- AC7: `AssetStore` exports all four scenes; future art swap only touches `AssetStore.tsx`
- AC8: Scene root fills viewport width; background layers have ~80px vertical bleed (R3.11)
- AC9: Each scene's layer groups are individually addressable (can be animated via transform/opacity)
- AC10: `<TransitionScene />` placeholder component for house transition animation

## Note
No test file for this ticket. Visual verification only.
test_files: []
