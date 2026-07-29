# Human checklist — QA run 2 (sha 73370fb, dirty tree)

Escalated checks only — things a person with ears, a mic, and API keys must do.

1. **Real microphone flow** — QA drove speech via an injected SpeechRecognition stub. Click ¡Jugar! with a real mic: grant permission, say the target word/sentence, confirm recognition + grading work with real audio (title gate R3.4, §7).
2. **Audio audibility** — QA-108: voice-note structure verified but sound can't be observed headlessly. With ELEVENLABS_API_KEY set, confirm Abuela/Dad/baby lines actually play, are distinct voices, and auto-play on arrival (§8.3). Also confirm the ambient house audio loop during waits (R8.4.3) — never observed in QA.
3. **Keys-present pipeline** — ~~all three routes were stubbed this run~~ **Update (post-run):** keys wired via root `.env` (symlinked to `server/.env`); all three routes verified live (`/generate` 200 real Anthropic, `/tts` 200 real MP3 with app voice IDs, `/image` 200 after fixing a `b64_json` bug in `server/routes/image.js`). In-app: real 1024×1024 photo rendered in the living-room chat, real TTS fetched. Still human: image *style* judgment (hyper-realistic cartoon polaroid, R4.2.4), prefetch latency feel (R11.2 — first image took ~52s cold), and fresh-seed second playthrough (R8.4.5).
4. **Magnet drag** — only the tap-tap fallback was exercised (QA-102). Drag a magnet with a finger/mouse: wide snap radius, progress keeps on finger-lift, never resets the word (§3.9).
5. **Pixel-perfect mock fidelity** — layouts/colors/typography spot-checked programmatically (all sampled values matched). Full side-by-side vs the four .dc.html mocks is aesthetic judgment. Minor measured deviations to eyeball: fridge speaker button 57px vs 52px spec; bedroom spine mic hit rect 48px wide.
6. **Continuous demo run** — one uninterrupted kid-paced playthrough on the demo machine (R12) with pre-warmed caches.
