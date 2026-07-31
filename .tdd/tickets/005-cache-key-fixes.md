---
id: 005
title: "B2/B3 — drop seed from image key, add prompt to text key"
status: green
depends_on: [004]
touches: [client/src/pipeline/ContentPipeline.ts, client/src/pipeline/ContentPipeline.test.ts, client/src/pipeline/sessionPrefetch.ts, client/src/screens/LivingRoomScreen.tsx, client/src/screens/FridgeScreen.tsx]
iterations: 1
test_files: [client/src/pipeline/ContentPipeline.test.ts, client/src/pipeline/sessionPrefetch.test.ts]
branch: ""
---

## Scope

PRD §3, criteria B2 and B3.

**B2** — `imageKey()` (`ContentPipeline.ts:33`) includes `seed`, but `imageHandler`
destructures `seed` and never uses it: the prompt is purely word-derived, so output is
byte-identical. `sessionSeed` is randomized per session, so today **every session pays to
regenerate identical images**, and the server cache in Workstream D could never hit
(PRD §12 risk: "B2 before D"). Drop `seed` from the image cache key, from the
`ImageCacheKey` type, and from the `/image` request body.

**B3** — `textKey()` (`ContentPipeline.ts:27`) omits `prompt`, so two different prompts
sharing beat/target/band/seed collide and return each other's content. Add `prompt` to
the key.

Update call sites that pass `seed` to `fetchImage` (`sessionPrefetch.ts:54` and any screen).

**Not in scope:** the server-side cache itself (ticket 010).

## Acceptance criteria

- [ ] Two `fetchImage` calls for the same `word` with **different** seeds issue exactly one network request and resolve to the same URL
- [ ] `fetchImage` no longer accepts or forwards `seed`; the `/image` POST body is `{word}` only
- [ ] Two `generate` calls with identical beat/target/band/seed but **different** `prompt` values issue two separate requests and do not return each other's content
- [ ] Two `generate` calls with fully identical keys including `prompt` are still deduped to one request
- [ ] `prefetchSessionStart` still warms the image and TTS caches
- [ ] `ImageCacheKey` no longer has a `seed` field (type-level; `tsc` must pass)

## Test plan

_(test-writer fills in)_

## Attempt log
