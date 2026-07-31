---
id: 019
title: "H1/H2/H4 — /observability route, /debug/metrics aggregation, /debug/logs"
status: green
depends_on: [008, 010]
touches: [server/app.js, server/routes/observability.js, server/metrics.js, server/store.js]
iterations: 2
test_files: [server/observability.test.js]
branch: ""
---

## Scope

PRD §9 (Workstream H), criteria H1, H2 and H4 — everything about the dashboard that is
meaningfully testable. The Chart.js **rendering** is ticket 020 (manual verify).

**H1** — route at `/observability`, gated by a shared secret query param. ⚠️ **Must be
registered before the SPA catch-all** at `server/app.js:58` or it silently returns the game
(PRD §12 risk). The same gate covers `/debug/*` (§12: "Debug routes leak learner data").

**H2** — `/debug/metrics?window=1h` returns **time-bucketed series, not raw rows**, feeding
the three charts:
1. upstream health — p95 latency per provider + failure counts
2. cache hit rate — hits vs misses per provider over time
3. learning signal — pass rate and independence band over the session timeline

**H4** — `GET /debug/logs?key=…` returns the last 200 rows as an HTML table, errors
highlighted. This is the fallback if charts get cut.

Test the aggregation against **seeded `events` rows** in the memory store.

## Acceptance criteria

Gating and route order:

- [ ] `/observability` **without** the secret returns 401/403 — and specifically **not** the SPA `index.html`
- [ ] `/observability` **with** the correct secret returns the dashboard, not the game
- [ ] `/debug/metrics` and `/debug/logs` are both gated by the same secret
- [ ] `/observability` resolves correctly even when the SPA catch-all is mounted (registration order is pinned by a test, not by comment)

Aggregation, against seeded rows:

- [ ] `/debug/metrics` returns **buckets**, not raw event rows
- [ ] `?window=1h` and `?window=24h` produce different bucket ranges
- [ ] p95 latency is computed per provider — seeding a known latency distribution yields the expected p95
- [ ] Failure counts are reported per provider and per bucket
- [ ] Cache hit rate is derived from `cache_hit` on `upstream` rows: seeding 3 hits + 1 miss yields 0.75
- [ ] Pass rate is derived from `grade` rows' `result`
- [ ] Independence band over time comes from `grade` rows' `band_after`
- [ ] An empty events table returns an empty-but-well-formed series, not a 500
- [ ] Events **outside** the requested window are excluded

Logs table:

- [ ] `/debug/logs` returns at most 200 rows
- [ ] Rows come back newest-first
- [ ] Error rows are marked distinguishably from success rows in the HTML

## Test plan

_(test-writer fills in)_

## Attempt log

- iter 1: built the gate, metrics aggregation and logs table; 195/195 green.
  Live probe found `learning.passes` stuck at 0 — the test fixture seeded
  `result:'pass'` (string) while the client emits numeric `0|1`. Wrong-test fix
  routed through the test-writer, NOT charged to the implementer.
- iter 2: `metrics.js` counts `Number(result) === 1`, keeping `0` rows in the
  denominator. 196/196; live re-probe returns pass_rate 0.75 on 3-of-4.
