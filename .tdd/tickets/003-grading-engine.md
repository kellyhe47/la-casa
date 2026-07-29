---
id: "003"
title: "Deterministic grading engine + decodable validator"
status: pending
depends_on: ["002"]
touches:
  - client/src/grading/
  - client/src/grading/grade.ts
  - client/src/grading/grade.test.ts
  - client/src/grading/validator.ts
  - client/src/grading/validator.test.ts
  - client/src/grading/wordNodes.ts
test_files:
  - client/src/grading/grade.test.ts
  - client/src/grading/validator.test.ts
iterations: 0
attempt_log: []
---

## Scope
Pure grading functions. No React, no network.

## Acceptance Criteria
- AC1: `grade(transcript, target)` is a pure function returning `{pass: boolean, matchedWord: string}`
- AC2: Normalized Levenshtein per-word fuzzy match, threshold 0.65: `grade("beens", "beans")` → pass; `grade("cat", "beans")` → fail
- AC3: Case and punctuation insensitive: `grade("Beans!", "beans")` → pass
- AC4: For multi-word targets: `grade("the beans are hot", "the beans are hot")` → pass; `grade("uh the beans are hot", "the beans are hot")` → pass (filler stripped/ignored)
- AC5: `grade` executes in < 5ms (no network, no LLM — ADR-0001)
- AC6: `validateSentence(sentence, graph)` returns true only if every word in the sentence maps to a mastered node OR the single frontier target; returns false if a word uses an unmastered grapheme pattern
- AC7: Per-word node mappings in `wordNodes.ts` cover at minimum: beans→[g_ee,g_cvc,v_groc2], fish→[g_sh,g_i,g_cvc], milk→[g_cvc,v_groc1], shop→[g_sh,g_cvc], the→[s_the], was→[s_was], to→[s_to]
- AC8: Magnet spelling grade: `gradeSpelling("beans", "beans")` → pass; `gradeSpelling("bens", "beans")` → fail (exact string match after normalization)
