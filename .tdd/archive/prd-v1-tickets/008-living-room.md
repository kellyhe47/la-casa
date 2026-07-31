---
id: "008"
title: "Living Room: Abuela voice-note loop with chat UI"
status: pending
depends_on: ["004", "005", "006", "007"]
touches:
  - client/src/screens/LivingRoomScreen.tsx
  - client/src/screens/LivingRoomScreen.test.tsx
  - client/src/components/ChatThread.tsx
  - client/src/components/ChatThread.test.tsx
  - client/src/components/PhoneInstrument.tsx
  - client/src/hooks/useMic.ts
test_files:
  - client/src/screens/LivingRoomScreen.test.tsx
  - client/src/components/ChatThread.test.tsx
iterations: 0
attempt_log: []
---

## Scope
Full Abuela loop: photo message arrives, Abuela voice note plays, kid speaks into phone mic, graded, miss/grace/pass, thread accumulates, loop continues, exit on "Adiós, Abuela."

## Acceptance Criteria
- AC1: Living room renders with the Abuela chat thread overlay sliding in from the side (never covers hands zone at bottom-center)
- AC2: Photo message arrives showing runtime-generated image in a Polaroid frame + English word rendered client-side in Baloo 2 ≥40px (#reading target is largest text)
- AC3: Abuela voice note auto-plays on arrival; chat bubble shows waveform + ▶ replay button
- AC4: Big pulsing mic button ON the phone (≥156px circle, #E0674A); tap-to-talk with auto end-of-utterance detection
- AC5: Kid speaks → transcript → `grade(transcript, targetWord)` → if pass: Abuela's delighted reply plays, thread updates, next item prefetched
- AC6: On miss: Abuela says "¿Cómo, mija? No te escuché bien"; mic re-pulses; miss counter increments
- AC7: After 2 misses, grace pattern: Abuela gives the word warmly in English ("Ahh — dice *milk*, mija"), celebrates; graph records the miss; loop continues
- AC8: R4.2.2: Abuela's lines are ALWAYS Spanish regardless of independence band
- AC9: R4.2.1: Optional unscored Spanish reply affordance exists (not graded)
- AC10: "Adiós, Abuela" exit button appears only after first completed item (R3.10); dimmed during active mic/audio
- AC11: Tapping exit plays goodbye exchange; phone lowers out of bottom of frame (CSS animation); advances to fridge
- AC12: Loop exit button (Adiós, Abuela) is diegetic — not floating chrome
- AC13: Living-scene wait state when content is late: character idle animation plays; no spinner (R8.4.3)
- AC14: `ChatThread` component accumulates messages across the session (R4.2.3)
- AC15: Idle ladder: 5s → mic button pulses; 10s → Abuela re-prompts; 20s → Abuela demonstrates (R3.9)
