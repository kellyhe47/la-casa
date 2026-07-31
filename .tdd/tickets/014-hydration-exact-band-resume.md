---
id: 014
title: "E7/E8 — silent hydration on startup with exact band resume"
status: pending
depends_on: [012, 013]
touches: [client/src/state/appStore.ts, client/src/App.tsx]
iterations: 0
test_files: []
branch: ""
---

## Scope

PRD §6, criteria E7 and E8, implementing locked decision D16.

**E7 startup flow:** UUID present + state found → hydrate, skip nothing, run the normal
rail (Abuela → Papá → Mamá). Resume is **silent** — no "welcome back" copy anywhere. The
fiction is one continuous evening; only band and node mastery differ.

**E8 exact band resume:** the saved band is restored as-is regardless of how long the kid
has been away — **no time-based warm-down**. This deliberately overrides the MVP's
`R5.3: sessions start at band 3`. New players (no saved state) still default to 3.

`startSession()` currently always builds `new SkillGraph(demoState.nodes)`, which is the
line that strands the band at 3.

## Acceptance criteria

- [ ] With saved state at band 7, startup hydrates and `graph.independence()` is **7**, not 3
- [ ] With saved state at band 1, startup hydrates at 1
- [ ] With **no** saved state, startup builds the demo graph at band 3 (MVP `R5.3` preserved)
- [ ] A 404 from `GET /state/:id` is treated as "new player", not as an error
- [ ] Hydrated node mastery matches what was saved, not the demo seed values
- [ ] The screen rail after hydration is unchanged — the session still starts at `title` and runs the normal order; nothing is skipped
- [ ] No "welcome back" / "resuming" string is rendered on any screen after a hydrated start
- [ ] A failed state fetch degrades to a fresh session rather than blocking startup

## Test plan

_(test-writer fills in)_

## Attempt log
