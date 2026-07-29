# Human checklist (escalated)

These checks need a person or real keys/devices; automation could not finish them.

### H-1 — Live mic check with real speech (R3.4)
- **Why escalated:** Headless Chrome used fake media / auto-grant; live "¡Hola!" waveform gating not proven with a real mic utterance.
- **Steps:** Desktop Chrome → `npm run dev` → ¡Jugar! → Allow mic → speak ¡Hola! → confirm advance into living room. Deny path already verified in automation.

### H-2 — Runtime LLM + ElevenLabs + image with real keys (P0-7 / §8)
- **Why escalated:** No `server/.env` keys; routes correctly stub 503. Cannot observe real prefetch, TTS playback, or Polaroid photos.
- **Steps:** Add Anthropic / ElevenLabs / image keys → one full playthrough → confirm Abuela photo arrives, Dad prompt audio plays, bedroom baby echo is audio not silence.

### H-3 — Ambient house audio loop (R8.4.3)
- **Why escalated:** Requires listening; no ambient bed heard/verified under stubs.
- **Steps:** With slow/stubbed network, confirm living-scene wait includes looped ambient house audio (not just silent SVG).

### H-4 — Fridge pointer-drag + magnetic snap radius (R4.4.2)
- **Why escalated:** Tap-tap path exercised (and failed completion); drag/`setPointerCapture` / ~120px snap not measured in headless.
- **Steps:** After 014 is fixed, drag letters on a touch/trackpad Chrome session; confirm snap, single-touch policy, `touch-action: none`.

### H-5 — Pixel fidelity vs design mocks (§10 / handoff)
- **Why escalated:** Aesthetic judgment — scenes look SVG and on-brand, but mock-perfect layer parity not scored.
- **Steps:** Open `design/handoff/*.dc.html` beside each screen; note missing layers (e.g. fridge Sofía hands prominence, living TV telenovela detail).

### H-6 — Continuous demo path without store hacks (§12)
- **Why escalated:** Fridge exit unreachable until 014 fixed; full Title→…→Buenas noches without `appStore.setState` not completed in one sitting.
- **Steps:** After 013–015, play the §12 demo script in Chrome with keys present.
