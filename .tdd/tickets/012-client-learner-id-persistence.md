---
id: 012
title: "E2/E4 — client learner UUID + fire-and-forget state writes"
status: pending
depends_on: [011, 006]
touches: [client/src/state/learnerId.ts, client/src/state/appStore.ts, client/src/pipeline/ContentPipeline.ts, client/src/pipeline/telemetry.ts]
iterations: 0
test_files: []
branch: ""
---

## Scope

PRD §6, criteria E2 and E4.

**E2** — generate a UUID on first visit, store it in localStorage, send it as
`X-Learner-Id` on every API call. localStorage holds **only the UUID** — no graph mirror,
so there is no divergence/reconciliation logic (D2: anonymous, no login, no PII).

**E4** — write cadence is every item boundary (D13), fire-and-forget. A failed save
`.catch()`es into a `client_error` event and **never interrupts gameplay**.

Also add the small client telemetry emitter that posts `grade` / `client_error` batches
to `POST /events` (server side landed in ticket 009).

**Not in scope:** hydration on startup (ticket 014).

## Acceptance criteria

- [ ] First call to `getLearnerId()` generates a uuid and persists it to localStorage
- [ ] A second call returns the **same** id — it does not regenerate
- [ ] An id already in localStorage is reused across a simulated reload
- [ ] The value stored under the learner key is the bare uuid, and no graph/state blob is written to localStorage
- [ ] `/generate`, `/tts`, `/image` requests all carry an `X-Learner-Id` header
- [ ] A state save is issued on each item boundary
- [ ] A save that rejects does **not** throw into the caller — gameplay continues
- [ ] A rejected save emits a `client_error` event with `kind:'fetch'`
- [ ] The telemetry emitter posts to `/events` and swallows its own failures

## Test plan

_(test-writer fills in)_

## Attempt log
