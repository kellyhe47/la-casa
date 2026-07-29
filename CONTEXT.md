# La Casa

A literacy game for Spanish-speaking Grade-2 learners, built around a family and their house. The job is transfer, not remediation: the kid's Spanish is treated as an asset that maps onto English.

## Language

### World

**Room**:
A location in the house bound to a skill domain (Kitchen → decoding/encoding, Bedroom → fluency, Living room → comprehension). Not a level.
_Avoid_: level, stage, world

**Beat**:
One templated story unit on the rail (e.g. "Mom hands you the list"). The LLM fills a beat's slots; it never invents beat structure.
_Avoid_: scene (ambiguous), screen

**Rail**:
The MVP's linear beat sequence: living room → kitchen → store → home → fridge → bedroom. There is no free-roam navigation in MVP. The Abuela, fridge, and bedroom beats are loops the kid exits through an in-fiction button.
_Avoid_: map, hub

**Theme**:
A data pack that flavors the errand core of a session (list items, shelf art, joke domain), rolled at session start. Abuela, the fridge, and the bedtime story are not theme-bound — they follow the frontier. Theme is flavor; the graph is the curriculum.
_Avoid_: level pack, world

**Session**:
One playthrough, title to "Buenas noches." All learner state lives and dies inside it — nothing is saved between sessions; every play is brand new.
_Avoid_: save, profile, account

**Sofía**:
The player character — a ~7-year-old girl. The game is first person: the camera is Sofía; she appears only as hands and held objects, and her voice is the kid's own (never TTS'd). Characters address the camera by name ("mija", "Sofía").
_Avoid_: the user, the player (in content), avatar

### Learning model

**Node**:
One teachable unit in the skill graph: a grapheme→phoneme mapping, a sight word, or a vocabulary/cognate item. Carries per-kid mastery (0–1), last-seen, and attempt history.
_Avoid_: skill, lesson, level

**Frontier**:
The set of nodes whose prerequisites are mastered but which are not yet mastered themselves. The next content target is always drawn from the frontier; a node stays there until it is actually mastered.
_Avoid_: next lesson, queue

**Mastery**:
A 0–1 value per node per kid, nudged by attempts. The only measure of learner state. A pass credits every node the word contains; a miss debits only the targeted frontier node (generous credit, precise blame). Never shown to the kid.
_Avoid_: score, XP, progress points

**Grace pattern**:
The rule that every character resolves the answer warmly after two misses — gives it in English and celebrates anyway. The kid is never stuck; the graph records the truth, the fiction doesn't need to.
_Avoid_: hint system, fail state

**Independence**:
A single 1–10 value derived from mastery, with hysteresis. Selects the bilingual scaffolding rule set — higher = more English. It is a ceiling, not an override: character first-lines stay bilingual below 9, and Abuela never switches to English.
_Avoid_: bilingualness, difficulty, level

**Gloss**:
A tap-and-hold Spanish rescue translation on English content. A rescue, never a default — never shown before the kid attempts (at independence ≥ 5).
_Avoid_: translation, hint

**Confusion set**:
The ~12 English contrasts Spanish phonology lacks (/ɪ/ vs /iː/, /v/ vs /b/, /ʃ/ vs /tʃ/, /z/, /θ/, /æ/, initial s-clusters). Drill targets are drawn from here, not at random.
_Avoid_: problem sounds, weaknesses

**Cognate**:
An English word with a Spanish twin (family/familia). A false friend is a trap cognate (éxito ≠ exit) used deliberately in Cognate Detective.

### Judging

**Deterministic grading**:
The judgment step is a pure function: (transcript or input, known target) → grade via fuzzy match with fixed thresholds. Same input, same grade. No LLM, no network in the grade path. The LLM generates content; it never grades.
_Avoid_: AI scoring, evaluation

**Known-target matching**:
The ASR posture: the expected answer is always known and the recognizer's output is only ever matched against it. Open transcription is never surfaced, stored, or interpreted.
_Avoid_: speech-to-text (implies open transcription)

**Decoding**:
Reading: mapping written English to sound/meaning. What Mandados and read-aloud exercise. Scored; accent is never scored.

**Encoding**:
Spelling: producing written English. What fridge magnets exercise.

**Fiction absorption**:
The design rule that recognizer misses surface as gameplay (the baby "got confused"), never as errors or retries-with-shame.

### Content pipeline

**Story bible**:
The fixed definition of family, voices, humor register, and warmth. Authored by us; the LLM works inside it.

**Decodable-text validator**:
The deterministic gate that rejects any generated sentence using graphemes beyond the kid's mastered nodes plus one frontier target.
_Avoid_: content filter

**Living-scene wait**:
How latency surfaces: when content is late, the fiction waits — character idle animations and ambient house sound, no spinner, no canned stand-in content. Honest waiting absorbed into the world.
_Avoid_: loading state, spinner, fallback

**Prefetch**:
Generating the next beat's text and voice audio while the current beat plays. The latency-hiding rule for both LLM and TTS.

### Characters

**Abuela**:
Grandmother; sends photo messages with Spanish voice notes. Her Spanish is story truth, not scaffolding — she never becomes English at any independence level. Sofía answers her in English (language brokering).

**Language brokering**:
The real-life practice of kids translating for family. Honored, not simulated — it is the Abuela mechanic's emotional core.
