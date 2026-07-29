---
id: "017"
title: "QA-101 guard: polaroid SVG illustration fallback when /image stubbed"
status: in-progress
depends_on: ["013"]
touches:
  - client/src/components/ChatThread.test.tsx
  - client/src/components/AbuelaArt.test.tsx
test_files: []
iterations: 0
attempt_log: []
source: qa
---

## Scope

QA-101 (checks.md run 2) verified two behaviors in the live app; only the first is
pinned by locked tests (ticket 013). This ticket locks the second with regression
guards. Test-only — the implementation shipped in commit 895e9f0
(`WordIllustration` fallback branch in ChatThread + AbuelaArt.tsx) and is
QA-verified working; no implementer expected unless a guard turns up red.

## Acceptance criteria

All are **regression guards** (behavior exists, QA-verified live):

- [ ] An abuela message with `targetWord` and no `imageUrl` renders the
      `WordIllustration` SVG inside the polaroid frame (not an empty frame, no `<img>`)
- [ ] An abuela message with both `targetWord` and `imageUrl` renders the `<img>`
      and NOT the illustration
- [ ] `WordIllustration` renders word-specific art for known words
      (fish/beans/milk/shop) and the generic-bag fallback for unknown words
- [ ] Adopted from 013 (already locked, no duplication): word as DOM text ≥40px
      without imageUrl

## Requirement (verbatim)

QA-101 expected: "Word as DOM text ≥40px; polaroid shows drawn SVG illustration
fallback." (PRD R4.2.5; §4.2 photo message shows item)

## Note

The illustration stand-in itself is contested under R8.4.3 (no-fallback-content)
— that is QA-117 / ticket 016, owner decision, explicitly out of scope here.
Guards pin current shipped behavior; if ticket 016 later removes the fallback,
these guards are updated through the test-writer as part of that ticket.
