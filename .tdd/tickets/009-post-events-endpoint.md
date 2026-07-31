---
id: 009
title: "C3 — POST /events accepts client-side batches"
status: pending
depends_on: [007]
touches: [server/app.js, server/routes/events.js]
iterations: 0
test_files: []
branch: ""
---

## Scope

PRD §4, criterion C3. `POST /events` accepts a batch of client-side events
(`grade` and `client_error` only) and writes them via the recorder. Fire-and-forget from
the client's side, so the endpoint must be fast and must never 500 on partial garbage.

`learner_id` is taken from the `X-Learner-Id` header.

**Not in scope:** the client-side emitter (that rides along with E4, ticket 012).

## Acceptance criteria

- [ ] `POST /events` with `{events:[{type:'grade', payload:{...}}]}` returns 2xx and writes one row
- [ ] A batch of 3 events writes 3 rows
- [ ] `type:'upstream'` submitted from a client is rejected — the server owns that type; it is not written
- [ ] A malformed entry in the batch is skipped while valid siblings are still written; the response is still 2xx
- [ ] An empty batch returns 2xx and writes nothing
- [ ] `learner_id` is populated from `X-Learner-Id` on every row in the batch
- [ ] The response body reports how many events were accepted

## Test plan

_(test-writer fills in)_

## Attempt log
