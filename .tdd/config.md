# TDD Config — PRD-v2 run

Spec: [PRD-v2.md](../PRD-v2.md) · §1 decisions locked · §11 out of scope is a hard boundary.
Prior run (PRD.md MVP) archived at `.tdd/archive/prd-v1-tickets/`.

## Working branch
`main` — all work commits locally. **Never pushed.**

## Test commands (smoke-tested 2026-07-31)

| Scope | Command | Root |
|---|---|---|
| Client unit | `npx vitest run` | `client/` |
| Server unit | `npm test` | `server/` |
| Full suite | both of the above | — |

Both runners are anchored to their own package root, so neither sweeps the other
or any stray checkout under the repo.

Verified in Phase 0:
- server vitest discovers, executes, and correctly reports **both** pass and fail
- server supertest drives the real `createApp()` over `/health`
- client baseline: 15 files / 99 tests green

## Runtime / manual verification
- Start server: `node server/index.js` (port 3001)
- Start client: `npm run dev` from `client/` (port 5173)
- Manual-verify only: H3 Chart.js rendering (see ticket 019)

## Database policy
No ticket may require a live Postgres to go green. All DB access goes through the
store interface in `server/store.js`; tests use `createMemoryStore()`. The `pg`
implementation is selected at boot by `DATABASE_URL` presence.

## Execution mode
Sequential in the main working directory, with batched dispatches. No parallel
worktrees — the PRD is a dependency chain (B→C→D, E→F→G) and the client tickets
all contend on `SkillGraph.ts` / `ContentPipeline.ts`; worktrees would also each
need their own `node_modules`. Batching captures the dispatch savings without
that cost.
