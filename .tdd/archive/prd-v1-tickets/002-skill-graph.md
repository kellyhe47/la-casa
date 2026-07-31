---
id: "002"
title: "Skill graph: data model, queries, update rule"
status: pending
depends_on: ["001"]
touches:
  - client/src/graph/
  - client/src/graph/types.ts
  - client/src/graph/SkillGraph.ts
  - client/src/graph/SkillGraph.test.ts
test_files:
  - client/src/graph/SkillGraph.test.ts
iterations: 0
attempt_log: []
---

## Scope
Pure TypeScript skill graph — no React, no side effects. Loaded from `demo-state.json`, held in memory.

## Acceptance Criteria
- AC1: `SkillGraph` class loads from the 25-node `demo-state.json` without throwing
- AC2: `graph.frontier()` returns nodes whose prereqs all have mastery ≥ 0.8 AND own mastery < 0.8; initially should include g_sh and g_ee (both ~0.447) but not g_ch (prereq g_sh not mastered)
- AC3: `graph.update(nodeIds, result)` with result=1 on "beans" (nodes: g_ee, g_cvc, v_groc2) applies `mastery = 0.7·mastery + 0.3·1` to ALL three nodes (pass credits all)
- AC4: `graph.update([nodeId], 0)` on a miss debits ONLY the single frontier target node, not others
- AC5: After ~3 consecutive passes from mastery ~0.447, a node crosses 0.8 (mastered); `graph.frontier()` no longer includes it, and its dependents may now enter frontier
- AC6: `graph.independence()` returns value 1–10; session starting from demo-state returns 3 (per R5.3)
- AC7: `graph.independence()` computes from rolling accuracy over last 20 graded attempts with hysteresis: candidate = clamp(round(accuracy*10), 1, 10); actual moves at most 1 per item boundary; up only on pass-streak while candidate > current, down after 3 misses in last 5
- AC8: Graph is serializable to JSON (for debug overlay)
