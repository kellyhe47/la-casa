---
id: 011
title: "E1/E3 — learners + learner_state schema and GET/PUT /state/:id"
status: green
depends_on: [007]
touches: [server/store.js, server/schema.sql, server/routes/state.js, server/app.js]
iterations: 1
test_files: [server/state.test.js]
branch: ""
---

## Scope

PRD §6, criteria E1 and E3. Two tables (`learners`, `learner_state`) exactly as §6.1
specifies, and two routes:

- `GET /state/:id` → `{graph, independence}` or **404** when there is no saved state
- `PUT /state/:id` → upsert

Both are **scoped by the `X-Learner-Id` header** — a request may only read/write its own
state. A mismatch between the path id and the header is rejected.

E1 note: the shape must let a player code or profile picker be layered on later as a
column + lookup route, not a migration. Don't design it shut.

**Not in scope:** the client side (ticket 012).

## Acceptance criteria

- [ ] `GET /state/:id` for an unknown learner returns 404
- [ ] `PUT /state/:id` with `{graph, independence}` then `GET /state/:id` returns exactly what was written
- [ ] A second `PUT` for the same id **overwrites** — `GET` reflects the new value and no duplicate row exists
- [ ] `PUT` creates the `learners` row if it does not exist yet
- [ ] `PUT` refreshes `last_seen` on the learner row
- [ ] A request whose `X-Learner-Id` header does not match the `:id` in the path is rejected (4xx) and does not read or write state
- [ ] A request with no `X-Learner-Id` header is rejected
- [ ] A malformed uuid in the path is rejected without touching the store
- [ ] `independence` round-trips as a number — saving 7 and reading back gives 7, not 3
- [ ] `learners` and `learner_state` DDL in `schema.sql` matches PRD §6.1 exactly, including the FK from `learner_state.learner_id` to `learners.id`

## Test plan

_(test-writer fills in)_

## Attempt log
