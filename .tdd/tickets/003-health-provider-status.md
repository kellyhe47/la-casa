---
id: 003
title: "A3 — /health reports per-provider key + last success/failure"
status: pending
depends_on: [002]
touches: [server/app.js, server/providerHealth.js, server/upstream.js]
iterations: 0
test_files: []
branch: ""
---

## Scope

PRD §2, criterion A3. `GET /health` currently returns `{ok:true}` and nothing else.
Extend it to report, **per provider** (`anthropic`, `elevenlabs`, `openai`):

- `keyPresent` (bool) — derived live from the env var, not cached
- `lastSuccess` — ISO timestamp or `null`
- `lastFailure` — ISO timestamp or `null`

The timed-call helper from ticket 002 records these in an in-process module
(`server/providerHealth.js`). This is deliberately process-local, not the events table:
`/health` must answer even when Postgres is down.

`{ok:true}` must remain in the response so nothing depending on it breaks.

## Acceptance criteria

- [ ] `GET /health` returns 200 with `ok:true` and a `providers` object keyed by the three provider names
- [ ] `keyPresent` is true when the provider's env var is set and false when it is unset
- [ ] `lastSuccess` and `lastFailure` are both `null` before any upstream call is made
- [ ] After a successful `/image` call, `providers.openai.lastSuccess` is an ISO timestamp and `lastFailure` stays `null`
- [ ] After a failing `/tts` call, `providers.elevenlabs.lastFailure` is an ISO timestamp
- [ ] A provider's success timestamp is not disturbed by another provider's failure
- [ ] `/health` still responds 200 when every API key is unset

## Test plan

_(test-writer fills in)_

## Attempt log
