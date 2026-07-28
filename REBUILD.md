# La Casa v2 — web rebuild inputs

Spec set for building La Casa as a **web app**, carried over from the completed iOS build (2026-07-28). Hand this directory to the TDD orchestrator; **PRD.md is the normative plan** (R-numbers = acceptance criteria). Read order: PRD.md → CONTEXT.md (vocabulary) → docs/adr/0001 (the one absolute: the LLM never grades).

## Contents

- `PRD.md` — the spec, current as of the v1 build's final decisions (band-up rule, R5.5 gloss table, voice casting, demo starting state)
- `CONTEXT.md` — domain glossary; the terms are load-bearing
- `idea.md` — original concept (PRD's source)
- `docs/adr/0001-llm-never-grades.md` — deterministic grading, applies verbatim
- `docs/mocks/la-casa-mocks-v2.html` — **binding art direction**, all 8 screens + cast. v2 exists because v1's placeholder UI missed this bar — build to the mocks
- `docs/skill-graph.html` — the 25 skill nodes, prereq edges, fresh vs demo-state frontier
- `content/fallback-pack/` — authored 6-beat fallback pack + demo learner state + audio manifest + 12 ElevenLabs mp3s (PRD §8.1 build deliverables, already authored and validator-checked — reuse, don't re-author)
- `content/voices.json` — voice casting (free-tier premades; preferred paid es-MX picks stashed under `_userPaidPicks_needsElevenLabsStarterPlan`, need ElevenLabs Starter)
- `scripts/generate_fallback_audio.sh` — regenerates pack audio via ElevenLabs (reads `.env` ELEVENLABS_API_KEY) if lines or voices change

## Platform notes for the web build (learned in v1, keep out of the PRD)

1. **claude-haiku-4-5 wraps JSON output in markdown fences** — parse tolerantly (slice first `{` to last `}`) or live generation silently falls back forever.
2. **ElevenLabs free tier rejects library/"professional" voices via API (402)** — only premades work until the plan is upgraded.
3. **ASR posture must survive the platform change**: known-target matching only, never open transcription, never score accent, misses absorbed into fiction. Browser `SpeechRecognition` is typically cloud-backed, which conflicts with the PRD's all-local/no-audio-retained stance (R11.5) — decide explicitly (on-device WASM ASR vs. accepting cloud ASR) and record it as an ADR before building the mic mechanics.
4. API keys: plan the thin proxy (PRD §8.1 roadmap line) rather than shipping keys to the browser — the in-app-key demo posture doesn't translate to web.
5. Demo plays from `content/fallback-pack/demo-state.json` (mid-progress learner), not a fresh graph — rationale visualized in docs/skill-graph.html.
