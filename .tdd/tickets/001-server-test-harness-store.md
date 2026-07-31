---
id: 001
title: Server test harness + Postgres store interface
status: green
depends_on: []
touches: [server/package.json, server/store.js, server/store.test.js, server/schema.sql, server/index.js]
iterations: 0
test_files: [server/store.test.js]
branch: ""
---

## Scope

The "Ticket 0" foundation. The server has no test runner and no DB layer. Build both
so that **no later ticket needs a live Postgres to go green**.

Vitest + supertest are already installed in `server/` and `npm test` is already wired
(orchestrator did this in Phase 0 and smoke-tested it). This ticket builds the **store**.

Create `server/store.js` exporting a small store interface with two implementations:
- `createMemoryStore()` — pure in-memory, used by every test
- `createPgStore(connectionString)` — `pg`-backed, used in production
- `getStore()` — returns a pg store when `DATABASE_URL` is set, else memory

Also create `server/schema.sql` with the exact DDL from PRD §4.1 (events), §5.1
(asset_cache) and §6.1 (learners, learner_state), applied on boot by the pg store only.

**Not in scope:** wiring the store into any route; that is C/D/E's job. No live DB
connection is opened in tests.

## Acceptance criteria

- [ ] `createMemoryStore()` returns an object implementing the full interface below
- [ ] `insertEvent({learner_id, type, payload})` stores a row and assigns an `id` and a `ts`
- [ ] `queryEvents({type, since, limit})` returns matching rows newest-first
- [ ] `deleteEventsOlderThan(date)` removes only rows with `ts` older than the cutoff and returns the delete count
- [ ] `getAsset(key)` returns `null` on miss and `{key, kind, mime, bytes}` on hit
- [ ] `putAsset({key, kind, mime, bytes})` stores and is retrievable by `getAsset`; `bytes` round-trips as a Buffer with identical contents
- [ ] `upsertLearner(id)` creates a learner row; calling it again updates `last_seen` and does not duplicate
- [ ] `getLearnerState(id)` returns `null` when absent, `{graph, independence}` when present
- [ ] `putLearnerState(id, {graph, independence})` upserts — a second call with a different band overwrites, it does not insert a second row
- [ ] `getStore()` returns a memory store when `DATABASE_URL` is unset
- [ ] `server/schema.sql` contains `create table` statements for `events`, `asset_cache`, `learners`, `learner_state` matching the PRD column names and types exactly
- [ ] The whole store test file passes with no network and no database process running

## Test plan

_(test-writer fills in)_

## Attempt log
