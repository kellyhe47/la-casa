---
id: 004
title: "B1 — delete the three dead prefetchNext calls and the method"
status: pending
depends_on: []
touches: [client/src/pipeline/ContentPipeline.ts, client/src/pipeline/ContentPipeline.test.ts, client/src/screens/LivingRoomScreen.tsx, client/src/screens/FridgeScreen.tsx, client/src/screens/BedroomScreen.tsx]
iterations: 0
test_files: []
branch: ""
---

## Scope

PRD §3, criterion B1. Delete the three dead `prefetchNext` call sites and the method itself:

- `client/src/screens/LivingRoomScreen.tsx:204`
- `client/src/screens/FridgeScreen.tsx:134`
- `client/src/screens/BedroomScreen.tsx:138`
- the `prefetchNext` method at `client/src/pipeline/ContentPipeline.ts:120`

They pass no `prompt`, so `/generate` returns 400 — and `fetchWithRetry` retries twice,
making each call 3 doomed requests. Left in, they would flood the new `events` table
with 400s (PRD §12 risk: "B1 before C").

**Do not touch** `BedroomScreen.prefetchNextSentence` (line 58) — that is a *different*,
genuinely working prefetch and must survive.

⚠️ **Existing locked-test conflict:** `client/src/pipeline/ContentPipeline.test.ts:87`
("AC4: prefetchNext calls generate+tts fire-and-forget into cache") pins the behaviour
being deleted. That test must be **removed by the test-writer**, not by the implementer.

## Acceptance criteria

- [ ] `grep -rn "prefetchNext" client/src` returns only `prefetchNextSentence` matches in `BedroomScreen.tsx`
- [ ] `ContentPipeline` has no `prefetchNext` member (asserted on the instance)
- [ ] The stale `ContentPipeline.test.ts` "AC4 prefetchNext" case is gone from the suite
- [ ] `BedroomScreen`'s `prefetchNextSentence` still exists and is still invoked on mount
- [ ] Living room, fridge and bedroom screens still render and their existing tests still pass
- [ ] A living-room pass exchange issues **no** request to `/generate`

## Test plan

_(test-writer fills in)_

## Attempt log
