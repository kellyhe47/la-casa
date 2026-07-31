---
id: "014"
title: "QA: Fridge magnet tap-tap cannot complete a word"
status: green
depends_on: ["009"]
touches:
  - client/src/components/MagnetTray.tsx
  - client/src/screens/FridgeScreen.tsx
test_files:
  - client/src/components/MagnetTray.test.tsx
iterations: 0
attempt_log: []
source: qa
---

## Scope

Make fridge magnet encoding completable via the required tap-tap path (tap magnet → tap slot). After a correct full spelling, the note should stick and `¡A dormir!` should become available (R3.10 / R4.4.2).

## Acceptance criteria

- [ ] Spelling `beans` (or current target) via tap-tap fills all slots and fires word-complete
- [ ] Wrong letter does not stay in the slot and shows no red X
- [ ] After first completed note, diegetic exit `¡A dormir!` appears

## Observed evidence (QA-022)

- Wrong letter: `redX:false`, slot not wrongly filled — OK
- Correct sequence for `beans` with delays: slots ended as `"b"` only; `exit:false`; no sticky note text
- Magnets present including needed letters (`b,e,a,n,s,…`)
- Screenshot: `.qa/evidence/QA-022-fridge-spell.png`

Known bugs:
- `!word.includes("")` is always false in JS — completion never fires
- Duplicate letters (beans has two e's) need multiple tray copies

## Requirement (verbatim)

"tap-tap alternative always live (tap magnet → tap slot), not a mode; grading fires only on word completion (exact match)." (PRD R4.4.2)

"in every loop scene, the diegetic exit appears only after the first completed item" (PRD R3.10)
