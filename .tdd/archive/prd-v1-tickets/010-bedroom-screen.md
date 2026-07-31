---
id: "010"
title: "Bedroom screen: baby read-aloud loop"
status: pending
depends_on: ["004", "005", "006", "007"]
touches:
  - client/src/screens/BedroomScreen.tsx
  - client/src/screens/BedroomScreen.test.tsx
  - client/src/components/BookInstrument.tsx
  - client/src/components/BookInstrument.test.tsx
test_files:
  - client/src/screens/BedroomScreen.test.tsx
  - client/src/components/BookInstrument.test.tsx
iterations: 0
attempt_log: []
---

## Scope
Full bedroom read-aloud loop: sentence on page, kid reads, pass/miss/grace, baby echoes on pass, loop continues, exit on "Buenas noches."

## Acceptance Criteria
- AC1: Book in Sofía's hands at bottom-center; one English sentence per page, Baloo 2 800 50px #6F4B35 (reading target is LARGEST text on screen ≥40px)
- AC2: Mic button ON the book spine (110px, #E0674A); pulses during reading state; shows waveform bars when listening
- AC3: Kid speaks → `grade(transcript, sentence)` → pass: baby echoes target sentence (prefetched TTS, NOT kid's utterance) + giggles; next page slides in (R4.3.0)
- AC4: Miss → baby confusion animation (raised brows + "?"); then Mom appears and models the sentence (bilingual per independence band); retry
- AC5: After 2 misses: grace pattern — Mom reads along "Léelo conmigo: The... beans..."; kid taps mic; attempt auto-passes; baby giggles
- AC6: R4.3.1: misses surface as baby confusion (fiction absorption), never error states
- AC7: Sentence content weighted toward session harvest: words from Abuela session (missed-then-graced words prioritized) (R4.3 §4.3.2)
- AC8: "Buenas noches" exit button (book icon, cream #F6E3B8) appears after first completed page (R3.10); disabled during active listening
- AC9: Exit tap → book closes animation → lights dim (#2E2A4A 75%) → drifting z's → "Buenas noches, hermanito 🌙" → off-ramp screen
- AC10: Living-scene wait when content late (R8.4.3); no spinner
- AC11: Baby echo = prefetched target audio, never synthesized from kid's utterance (R4.3.0)
- AC12: `BookInstrument` component: displays sentence, emits onAttempt, handles page state
- AC13: Tap-hold on page text shows gloss (Spanish translation) per independence band (R5.5)
- AC14: Mom character enters from left on miss/grace, leaves left during reading (animation)
- AC15: Idle ladder: 5s pulse → 10s baby points → 20s baby chews book (R3.9)
