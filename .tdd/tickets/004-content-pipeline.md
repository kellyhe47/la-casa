---
id: "004"
title: "Content pipeline: LLM beat gen, TTS, image, prefetch/cache"
status: pending
depends_on: ["002", "003"]
touches:
  - client/src/pipeline/
  - client/src/pipeline/ContentPipeline.ts
  - client/src/pipeline/ContentPipeline.test.ts
  - client/src/pipeline/cache.ts
  - client/src/pipeline/storyBible.ts
  - client/src/pipeline/beatSchema.ts
  - client/src/pipeline/wordNodes.ts
  - server/index.js
test_files:
  - client/src/pipeline/ContentPipeline.test.ts
iterations: 0
attempt_log: []
---

## Scope
ContentPipeline class: generates beat content via `/generate`, fetches TTS via `/tts`, fetches image via `/image`, with prefetch and caching.

## Acceptance Criteria
- AC1: Cache key for text is `(beat, frontierTarget, independenceBand, seed)` — same key returns cached result instantly without a network call
- AC2: Cache key for audio is `(text, voice, lang)` — same text+voice+lang never re-fetches
- AC3: Cache key for images is `(word, seed)` — same word+seed never re-fetches
- AC4: `pipeline.prefetchNext(beatContext)` calls generate+tts+image for the next beat while current plays (fire-and-forget into cache)
- AC5: When proxy returns 503 (stub/missing key), `pipeline.generate()` rejects with an error that the caller interprets as living-scene wait (NOT a visible spinner)
- AC6: Failed calls retry ~2× with exponential backoff before rejecting
- AC7: Story bible constants are authored in `storyBible.ts`: family name García, character voices (Abuela=Spanish es-MX, Dad=English), warmth/humor register description
- AC8: Beat JSON schema defined in `beatSchema.ts`; LLM output parsed tolerantly (strips markdown fences, slices first `{` to last `}`)
- AC9: Independence band rule sets are authored constants injected into LLM prompt (bands 1-2 through 9-10 rules from PRD §5)
- AC10: `POST /generate` route on server calls Anthropic `claude-haiku-4-5` with structured output when key present
- AC11: `POST /tts` route calls ElevenLabs Flash tier when key present, returns audio/mpeg blob
- AC12: `POST /image` route calls image generation API when key present
