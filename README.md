# La Casa

A web literacy game for Spanish-speaking Grade-2 learners, built around a family and their house. **PRD.md is the normative plan** (R-numbers = acceptance criteria). Read order: PRD.md → CONTEXT.md (vocabulary) → docs/adr/0001 (the one absolute: the LLM never grades).

## Contents

- `PRD.md` — the spec: PixiJS/WebGL scenes + React chrome, Web Speech API grading posture, thin key proxy, theme packs, no persistence
- `CONTEXT.md` — domain glossary; the terms are load-bearing
- `idea.md` — original concept (PRD's source)
- `docs/adr/0001-llm-never-grades.md` — deterministic grading, applies verbatim
- `docs/architecture.html` — the learning-graph engine and how content scales (node loop, queries, session arc, theme/language packs)
- `docs/skill-graph.html` — the 25 skill nodes, prereq edges, fresh vs demo-state frontier
- `docs/archive/` — superseded design exploration (third-person mocks; palette/tone reference only). Screen designs come from a dedicated design session against PRD §3.1
- `content/demo-state.json` — the mid-progress learner state every session boots from (warm-seeded frontier)
- `content/reference-pack/beats.json` — authored example beats (MVP kinds only). **Reference material, never read at runtime** (there is no content fallback — PRD R8.4.3): documents the beat JSON schema and story-bible tone
- `content/voices.json` — voice casting (free-tier premades; preferred paid es-MX picks stashed under `_userPaidPicks_needsElevenLabsStarterPlan`, need ElevenLabs Starter)
- `scripts/generate_voice_samples.sh` — generates voice-casting audition samples via ElevenLabs (reads `.env` ELEVENLABS_API_KEY); also the reference for the build's TTS API integration

## Platform notes (keep out of the PRD)

1. **claude-haiku-4-5 wraps JSON output in markdown fences** — parse tolerantly (slice first `{` to last `}`) or every generation silently fails.
2. **ElevenLabs free tier rejects library/"professional" voices via API (402)** — only premades work until the plan is upgraded.
3. **ASR posture**: known-target matching only, never open transcription, never score accent, misses absorbed into fiction. Web Speech API's transcript is only ever compared against the known target (PRD §7).
4. API keys live in the thin proxy (PRD §8.1) — never in the browser bundle.
5. Every session boots from `content/demo-state.json` (mid-progress learner, warm-seeded frontier), not a fresh graph — rationale visualized in docs/skill-graph.html and docs/architecture.html.
