---
id: 020
title: "H3 — three Chart.js charts (rendering: manual verify)"
status: pending
depends_on: [019]
touches: [server/public/observability.html]
iterations: 0
test_files: []
branch: ""
---

## Scope

PRD §9, criterion H3. Three charts, Chart.js from CDN, drawing from the `/debug/metrics`
endpoints built in ticket 019:

1. **Upstream health** — p95 latency line per provider, failures as red markers
2. **Cache hit rate** — hits vs misses per provider over time
3. **Learning signal** — pass rate and independence band over the session timeline.
   **Protect this one if time runs short** — 1 and 2 are table stakes; 3 is the
   differentiated chart (PRD §9).

⚠️ **Testability:** Chart.js canvas rendering is not meaningfully unit-testable, and the
orchestrator's instruction is explicit — the *aggregation* is tested in ticket 019; the
**rendering here is manual-verify**. Automated criteria below are therefore limited to
what genuinely can be asserted: the page's wiring, not its pixels.

Manual verification steps are recorded in the ticket on completion.

## Acceptance criteria

Automated:

- [ ] The dashboard page is served on `/observability` behind the shared secret
- [ ] The page requests each of the three metrics series
- [ ] The page references the Chart.js CDN script
- [ ] The page contains three distinct canvas targets
- [ ] The page degrades to a visible message rather than a blank screen when metrics return empty

Manual-verify (recorded, not automated):

- [ ] Chart 1 renders p95 latency lines per provider with failures marked red
- [ ] Chart 2 renders hits vs misses per provider
- [ ] Chart 3 renders pass rate and independence band over the session timeline

## Test plan

_(test-writer fills in)_

## Attempt log
