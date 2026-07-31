---
id: "011"
title: "Debug overlay: live skill graph, band, seed, last grade"
status: pending
depends_on: ["002", "005"]
touches:
  - client/src/components/DebugOverlay.tsx
  - client/src/components/DebugOverlay.test.tsx
test_files:
  - client/src/components/DebugOverlay.test.tsx
iterations: 0
attempt_log: []
---

## Scope
Debug overlay panel togglable on any screen. Not scaffolding — this ships polished as the demo scaling story.

## Acceptance Criteria
- AC1: Toggle: Backspace ×3 within ~600ms; OR `?debug=1` URL param starts overlay open
- AC2: Translucent panel over right third of screen; game keeps running behind it (R6.5)
- AC3: Shows skill graph rendered visually: nodes as circles, mastery as fill (0=empty, 1=filled), frontier nodes ring-highlighted, locked nodes (prereqs not met) dimmed
- AC4: Shows current independence band (number 1–10)
- AC5: Shows session seed string
- AC6: Shows last graded event: e.g. `"beans" → pass → g_ee +0.14`
- AC7: When a node crosses 0.8 mastery, it visibly flips (CSS transition) and its unlocked children light up in the overlay
- AC8: Debug overlay never shows to kid during normal play (no kid-facing meters R11.6)
- AC9: Overlay does NOT block game interactions (pointer-events pass-through on the underlying scene)
- AC10: Graph layout matches `docs/skill-graph.html` node layout (same relative positions)
