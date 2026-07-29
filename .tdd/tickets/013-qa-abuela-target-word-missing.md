---
id: "013"
title: "QA: Abuela target word missing when image stubbed"
status: pending
depends_on: ["008"]
touches:
  - client/src/components/ChatThread.tsx
  - client/src/screens/LivingRoomScreen.tsx
test_files: []
iterations: 0
attempt_log: []
source: qa
---

## Scope

Fix Abuela loop so the English reading target is always client-rendered at ≥40px, even when `/image` fails or is stubbed (R4.2.5). Do not require a successful image URL to show the word.

## Acceptance criteria

- [ ] Living room chat shows the frontier English target word as DOM text (≥40px Baloo) when `/image` returns 503
- [ ] Polaroid/image frame may be empty or waiting, but the word is still visible and glossable
- [ ] Word is never only inside a generated raster

## Observed evidence (QA-002 / QA-019)

With no `OPENAI_API_KEY` (POST `/image` → 503 stub):

- Chat thread text: voice-note bubbles only (`▶ nota de voz`)
- DOM probe: `imgs: []`, `targetEls: []` (no fish/milk/beans text nodes)
- Screenshot: `.qa/evidence/QA-019-abuela-word.png`

Likely cause: `ChatThread` renders the word only when `msg.imageUrl && msg.targetWord`.

## Requirement (verbatim)

"The readable English word is always client-rendered (Baloo, ≥40 px, the reading target) — deterministic, glossable, never at the mercy of a model's text rendering." (PRD R4.2.5)
