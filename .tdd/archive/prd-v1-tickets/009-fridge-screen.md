---
id: "009"
title: "Fridge screen: Dad's magnet spelling loop"
status: pending
depends_on: ["004", "005", "006", "007"]
touches:
  - client/src/screens/FridgeScreen.tsx
  - client/src/screens/FridgeScreen.test.tsx
  - client/src/components/MagnetTray.tsx
  - client/src/components/MagnetTray.test.tsx
  - client/src/components/NoteCard.tsx
test_files:
  - client/src/screens/FridgeScreen.test.tsx
  - client/src/components/MagnetTray.test.tsx
iterations: 0
attempt_log: []
---

## Scope
Full fridge magnet loop: Dad speaks the word, kid drags/taps magnets into slots, graded on completion, note sticks, loop continues.

## Acceptance Criteria
- AC1: Dad's prompt is audio-only — NO speech bubble, NO caption showing the target word (R4.4.1: all-spoken scene)
- AC2: Small speaker button on note card replays Dad saying the target word
- AC3: Magnet tray at bottom-center in Sofía's hands; ~9 letter magnets (lowercase), needed letters + ~4 distractors including the confusable (e.g. "ea" vs "ee" for beans)
- AC4: Each magnet hit area ≥96px padded (R3.9); tap-magnet-then-tap-slot fallback works everywhere drag does
- AC5: Drag: magnet scales to 1.1 and rides ~40px above finger; next empty slot glows as target; magnetic snap radius ~120px on release (R4.4.2)
- AC6: Single-touch policy: first touch wins; extra pointers during a drag ignored; `setPointerCapture` on dragged element; `touch-action: none` on scene root (R4.4.2)
- AC7: Wrong letter sits one beat then wobbles back to tray (CSS animation 0.9s); no red X (fiction absorption)
- AC8: Drop outside any slot returns ONLY that magnet; placed letters never reset (R4.4.2)
- AC9: Grading fires ONLY on word completion; `gradeSpelling(placed, target)` exact match after normalization
- AC10: On word complete: note sticks to fridge door with stickPop animation (0.5s); accumulates rotated ±2-4°; Dad hands next prompt
- AC11: Exit button "¡A dormir!" (Dad's theatrical yawn) appears only after first completed item (R3.10); dimmed during active drag/prompt
- AC12: Exit tap → Dad yawns animated (stretch + hand to mouth) + audio → bedroom transition (~1.8s)
- AC13: Living-scene wait when content is late (R8.4.3); no spinner
- AC14: `MagnetTray` component: tracks placed[], wobble state per letter, emits onWordComplete
- AC15: Target word selection: (1) words missed-then-graced in Abuela loop → (2) current frontier target → (3) mastered-pool word
