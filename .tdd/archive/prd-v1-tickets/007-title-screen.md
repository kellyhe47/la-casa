---
id: "007"
title: "Title screen: ¡Jugar! button, mic gate, door transition"
status: pending
depends_on: ["005", "006"]
touches:
  - client/src/screens/TitleScreen.tsx
  - client/src/screens/TitleScreen.test.tsx
  - client/src/hooks/useMic.ts
test_files:
  - client/src/screens/TitleScreen.test.tsx
iterations: 0
attempt_log: []
---

## Scope
Title screen React component with full state machine: idle → mic-request → mic-check → mic-denied OR transition.

## Acceptance Criteria
- AC1: `<TitleScreen />` renders with a single "¡Jugar!" button (terracotta #E0674A, Baloo 2 800 52px)
- AC2: No other interactive controls on the title screen (R3.3)
- AC3: Clicking ¡Jugar! calls `navigator.mediaDevices.getUserMedia({audio:true})` (mic permission request)
- AC4: On mic permission grant, shows mic-check state: displays "¡Hola!" prompt + waveform; any detected audio advances to living room
- AC5: On mic permission deny, shows calm adult-facing message (not an error state, no red styling); game does NOT start; ¡Jugar! button not shown again
- AC6: `useMic` hook: `{state, startListening, stopListening, transcript}` — wraps SpeechRecognition
- AC7: Door push-through transition fires on mic grant+check: CSS animation (scale 1→7 on the door, cubic-bezier(.45,0,.7,1), ~1.9s, fills frame with golden wash)
- AC8: Session seed is rolled when ¡Jugar! is pressed (R3.5)
- AC9: ¡Jugar! button pulses (CSS scale animation, 1.8s cycle) in idle state
- AC10: Mic button is ≥160px hit area (R3.9 hero target)
