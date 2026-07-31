---
id: 007
title: "C1/C4 — events table schema, store methods, boot retention sweep"
status: pending
depends_on: [001]
touches: [server/store.js, server/store.test.js, server/schema.sql, server/events.js, server/index.js]
iterations: 0
test_files: []
branch: ""
---

## Scope

PRD §4, criteria C1 and C4. One `events` table, three types, interleaved on one timeline.

Schema is fixed by the PRD — `id bigserial pk`, `ts timestamptz default now()`,
`learner_id uuid`, `type text not null`, `payload jsonb not null`, plus indexes on
`(ts desc)` and `(type, ts desc)`.

Build `server/events.js`: a thin recorder over the store that validates `type` is one of
`upstream | grade | client_error` and shapes the payload per the PRD §4 table.

C4 retention: `delete from events where ts < now() - interval '30 days'`, run **on boot**.
Expose it as a callable (`pruneEvents(store)`) so it is testable without booting.

**Not in scope:** the upstream middleware (008) and `POST /events` (009).

## Acceptance criteria

- [ ] `recordEvent(store, {type:'upstream', payload})` inserts a row retrievable via `queryEvents`
- [ ] An unknown `type` is rejected and no row is written
- [ ] All three of `upstream`, `grade`, `client_error` are accepted
- [ ] An `upstream` payload round-trips `route`, `provider`, `status`, `duration_ms`, `cache_hit`, `error`
- [ ] A `grade` payload round-trips `word`, `node_ids`, `result`, `similarity`, `band_before`, `band_after`, `screen`
- [ ] A `client_error` payload round-trips `kind`, `message`, `screen`
- [ ] `learner_id` is optional — an event with no learner id still inserts
- [ ] `pruneEvents` deletes rows older than 30 days and leaves rows newer than 30 days untouched
- [ ] `pruneEvents` returns the number of rows deleted
- [ ] `schema.sql` declares the `events` table and both indexes exactly as PRD §4.1 specifies

## Test plan

_(test-writer fills in)_

## Attempt log
