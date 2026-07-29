---
status: accepted
---

# The LLM never grades at runtime

All grading — read-aloud matching, spelling, item selection — is a deterministic pure function: (input, known target) → grade, via fuzzy match with fixed thresholds, on-device, no network. The LLM generates content only; nothing it outputs at runtime ever touches a grade. Grades write to a kid's permanent mastery record, so they must be reproducible (LLM judgments drift with temperature and model version), instant, offline, free, auditable when a parent asks "why was this marked wrong?", and dialect-fair — the never-score-accent rule is enforceable in a matcher we control, while an LLM judge could silently penalize accented speech.

## Considered Options

- **LLM grades spoken/written answers** — rejected: non-reproducible, adds latency and per-utterance cost, breaks offline play, unauditable, accent-fairness not enforceable.
- **Escape hatch for future open-ended tasks** (e.g. story retelling, where no single known target exists): the LLM may *author expanded answer keys offline* (accepted-answer sets, human-reviewable, shipped as content); runtime still does a deterministic match against them. This is the permitted path — a live LLM judge is not.

## Consequences

- Every mechanic must be designed so the expected answer (or answer set) is known before the kid responds — open-ended prompts require authoring-time key expansion, not runtime judgment.
- ASR stays known-target: the transcript is only ever fuzzy-matched against the known expected answer, never open transcription.
