---
id: "016"
title: "QA: Keyless stub path serves canned content + synthetic voice instead of living-scene wait / off-ramp"
status: pending
depends_on: ["004", "008"]
touches:
  - client/src/pipeline/ContentPipeline.ts
  - client/src/screens/LivingRoomScreen.tsx
  - client/src/screens/BedroomScreen.tsx
  - client/src/components/ChatThread.tsx
test_files: []
iterations: 0
attempt_log: []
source: qa
---

## Scope

Decide (and if needed implement) the correct behavior when the proxy routes stub (missing API keys). Per PRD, the app must never serve canned placeholders as if they were live content: late content = living-scene wait with silent retries; dead pipeline = off-ramp. Today the keyless app plays a full session of canned content.

NOTE FOR OWNER: parts of this behavior were built in direct response to user feedback while running keyless ("Abuela's voice notes are not playing, and the pictures are not even showing up") — the SVG word illustrations and speechSynthesis fallback made the keyless demo playable. This ticket may resolve as "by design: keyless dev mode", possibly gated so it can never activate when keys are present.

## Acceptance criteria

- [ ] With keys present, stubbed/late content triggers living-scene wait + silent retries (R8.4.3), then off-ramp on hard failure (R8.4.4)
- [ ] No canned word/sentence content masquerades as live generation (R8.4.3 decision 2026-07-28)
- [ ] No synthetic-voice fallback for character lines (§8.3), or the exception is explicitly documented as keyless dev mode
- [ ] Same target word is not served twice back-to-back within a loop

## Observed evidence (QA-117, run 2, sha 73370fb dirty)

- /generate, /tts, /image all returned `503 {"error":"stub"}` (no keys)
- Session still played end-to-end with canned content:
  - Living room served target word "fish" twice back-to-back (identical polaroid + word)
  - Bedroom sentences were fixed strings: "The milk is for the baby.", "We got the beans at the shop."
  - Polaroid photo was a drawn SVG illustration standing in for the runtime-generated image (R4.2.4)
  - Abuela's voice notes played via browser speechSynthesis
- No living-scene wait or off-ramp was ever triggered by the stubs

## Requirement (verbatim)

"**R8.4.3** **The living-scene wait (decision 2026-07-28: there is no fallback content — canned placeholders never masquerade as the live system).** When content is genuinely late, the *fiction* waits… Failed calls retry silently (~2×, backoff)." (PRD §8.4)

"**Audio never degrades** (decision 2026-07-28): there is no synthetic-voice fallback. A late line waits inside the living scene (R8.4.3) until its real audio arrives." (PRD §8.3)
