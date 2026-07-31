---
id: 008
title: "C2 — record an upstream event for every proxy call, success included"
status: pending
depends_on: [002, 004, 007]
touches: [server/app.js, server/upstream.js, server/routes/generate.js, server/routes/image.js, server/routes/tts.js]
iterations: 0
test_files: []
branch: ""
---

## Scope

PRD §4, criterion C2. Every proxy call writes exactly one `upstream` event row —
**successes are required**, not just failures. Without successes there is no success
*rate* and no latency percentile, and "ElevenLabs is slow" stays invisible (PRD §4).

Hook the recorder into the timed-call helper from ticket 002 so route handlers do not
each remember to log. Payload per PRD §4: `route`, `provider`, `status`, `duration_ms`,
`cache_hit`, and `error` on failure.

`cache_hit` is written as `false` for now; ticket 010 sets it truthfully.

`learner_id` comes from the `X-Learner-Id` request header when present.

Depends on 004 (B1) so the deleted prefetch calls don't flood the table with 400s.

## Acceptance criteria

- [ ] A **successful** `/image` call writes one `upstream` row with `status:200` and a numeric `duration_ms`
- [ ] A successful `/tts` call and a successful `/generate` call each write one row with the right `provider` and `route`
- [ ] A 502 (upstream non-2xx) `/tts` call writes one row with `status` set to the upstream status and a non-empty `error`
- [ ] A 504 (fetch threw) `/image` call writes one row with `error` set and `provider:'openai'`
- [ ] A 503 `not_configured` call writes a row recording the misconfiguration
- [ ] Exactly one row is written per request — never zero, never two
- [ ] `duration_ms` is a number ≥ 0
- [ ] `cache_hit` is present on every upstream row
- [ ] `learner_id` is populated from the `X-Learner-Id` header and is null when the header is absent
- [ ] A store failure while recording does **not** fail the proxy request — the client still gets its response

## Test plan

_(test-writer fills in)_

## Attempt log
