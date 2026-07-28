# La Casa — Idea Doc

> Working document. Iterating. Not a spec yet.

**Prompt:** Nerdy + Varsity Tutors, Challenge Prompt 3 — *English Reading Game*: "Build a literacy-focused application designed to help young learners improve their reading fluency, comprehension, and vocabulary through interactive storytelling or challenge-based gameplay."

**Constraints from the brief:** scalability is explicitly called out (40K+ active members on Varsity Tutors). The demo doesn't need to scale; the *story about how it scales* must be convincing.

**Build constraint:** ~2 days. iOS, optimized for iPad.

---

## 1. Thesis

First target market: **Spanish-speaking K–5 learners.** Grounded in real classroom volunteering — these kids are falling behind, and it's not because they're bad readers.

Spanish orthography is nearly transparent; English is opaque. A Spanish-speaking kid **already has phonemic awareness** — it just maps to the wrong sounds. So:

> **The job is transfer, not remediation.**

Three leverage points nobody builds for:

1. **Cognates** — ~35% of academic English has a Spanish twin (`familia/family`, `restaurante/restaurant`, `-ción → -tion`, `-dad → -ty`). These kids know thousands of English words they don't know they know.
2. **A finite confusion set** — Spanish lacks /ɪ/ (ship/sheep), /æ/, /v/ vs /b/, /ʃ/ vs /tʃ/ (ship/chip), /z/, /θ/ (th), and initial s-clusters ("school" → "eschool"). Most phonics apps drill randomly. We drill the ~12 things that actually block *this* kid.
3. **The parent** — Spanish-speaking parents are locked out of English homework and feel it. Almost no app gives them a role.

**Non-negotiable principle:** never score accent. Spanish-accented English is not an error. We score *decoding*, never pronunciation-as-correctness.

---

## 2. The world

**La Casa.** You're a kid in a family. The house is the map. Rooms are skill domains, not levels.

MVP builds only the rooms our feature set needs. Later the world widens: **house → block → school → city**, matching vocabulary progression (Tier 1 domestic → Tier 2 academic).

### MVP rooms

| Room | Character | Mechanic | Skill |
|---|---|---|---|
| **Kitchen** | Mom, Dad | Mandados quest | Decoding under stakes |
| **Kitchen — fridge** | anyone | Magnet spelling | Encoding |
| **Bedroom** | Baby sibling, Mom | Read-aloud | Fluency |
| **Living room** | Abuela | Picture message | Comprehension + language brokering |

**Cognate Detective** is a *persistent tool*, not a room — a magnifying glass in your pocket, usable on any text anywhere in the game.

### Grade band

**Grade 2** for MVP. (Full product treats K–5 as three products: K–1 audio-first / 2–3 decodable sentences + read-aloud / 4–5 paragraphs + morphology.)

---

## 3. Mechanics

### 3.1 Mandados quest (Kitchen → store → home)

The core loop. Decoding with real, funny stakes.

1. **Mom hands you a written list** in the kitchen
2. Animated transition to the store
3. **Shelf of many items.** Go down the list, pair each English term with the right item
4. Return home
5. **Dad checks the bag.** Corrections delivered with humor — misread *beans* as *beads* → the soup is beads → family reacts

Errors are jokes, not failures. Dad is the correction surface, and he's warm about it.

### 3.2 Fridge magnet spelling (Kitchen)

**The fridge is the family message board *and* your word trophy case.**

- Every word mastered anywhere in the house becomes a **magnet in your tray**
- Prompts come from any character, any context: *"Write a note for Dad."* / *"Sign the chore chart."* / *"Label this photo."* / *"Help the baby write her name."*
- Word pool = the learner's skill graph, **not the pantry** — verbs, names, feelings, anything

Deliberately **decoupled from food and from Abuela.** Motivation is social (someone needs a note written), which scales infinitely.

Why encoding matters: spelling locks in grapheme-phoneme mapping harder than decoding does.

**Stretch:** Apple Pencil letter-tracing, scored by *path overlap against the expected glyph* (PencilKit strokes vs. a bezier path). No ML needed. Big demo moment.

**Avoid:** handwriting *recognition*. Vision OCR on a 7-year-old's printing is as unreliable as open kid-ASR — same trap, twice.

### 3.3 Baby sibling read-aloud (Bedroom)

Perfect as-is.

- Baby + book on screen
- **One sentence at a time** presented
- Kid reads aloud
- Cartoon baby repeats it back
- If baby gets it wrong → **Mom appears, laughs warmly, says the correct English phrase**

**Why this is the best mechanic in the game:** it's the protégé effect. The mic is framed as *teaching*, not *testing*. Kids freeze when they think they're being graded; here a stumble is "the baby got confused." Retry, zero shame.

Critical design consequence: **ASR failure is absorbed by the fiction.** A recognizer miss looks like gameplay, never like a bug.

### 3.4 Abuela's picture message (Living room)

Abuela sends a photo of an item or some English words with a voice note.

**Flow:**
1. Photo message arrives in a message-thread UI
2. Abuela's voice note plays **in Spanish**: *"Mija, ¿qué dice aquí?"*
3. Kid taps mic and answers **in English**
4. Abuela replies in Spanish, delighted

**Decision: the kid answers in English, not Spanish.**

Rejected alternatives:
- *Kid speaks Spanish* → needs Spanish ASR + semantic grading, loses the known-target advantage, and grades their Spanish (off-mission)
- *Kid types Spanish* → typing is slow for a 7-year-old and isn't the learning objective

Why English wins:
- **Pedagogically** — Abuela becomes a *reason to produce English*. Her Spanish is free comprehension input the kid already has.
- **Emotionally** — the kid is the family's translator. This is literally what these kids do in real life (language brokering). We're not simulating it, we're honoring it.
- **Technically free** — expected English answer is known → same `contextualStrings` + fuzzy-match pipeline as everything else. No Spanish ASR, no LLM grading, no API cost.
- **Content-cheap** — photo + short text is a trivial LLM generation target. Infinite levels.

Optional warmth: let the kid *choose* to also reply in Spanish — unscored, just recorded and "sent."

The message thread accumulates → doubles as a progress artifact.

### 3.5 Cognate Detective (persistent tool)

Magnifying glass in your pocket. Scan any English text in the game, tap words you think have Spanish twins.

- Hit → confetti, both words spoken aloud
- Includes **false friends** as traps: *embarazada* ≠ embarrassed, *sopa* ≠ soap, *éxito* ≠ exit. Genuinely hilarious to a 3rd grader, and unforgettable.

Emotional core of the app: **your Spanish is an asset.**

---

## 4. Speech recognition

### Decision: on-device Apple Speech, with known-target matching

Use `SpeechAnalyzer`/`SpeechTranscriber` (iOS 26) or `SFSpeechRecognizer`. Free, offline, no per-request cost.

**The trick that makes weak kid-ASR work: never do open transcription.**

- We *always* know the expected word or sentence
- Feed `contextualStrings` to bias the recognizer toward the target vocabulary
- Score as **fuzzy match against a known target**, not "what did they say"
- "Is this one of N known words?" is a vastly easier problem than open ASR
- Forgiving thresholds; the Baby Sibling fiction absorbs remaining error

### Rejected: KidSpeak

[KidSpeak: A General Multi-purpose LLM for Kids' Speech Recognition and Screening](https://arxiv.org/abs/2512.05994) (Dec 2025, Stanford SCALE). Right problem, real work — **not usable here**:

- No released weights, no code, no API, no Core ML build
- LLM-scale (Vicuna 7B backbone) — not running on an iPad in 2 days
- Their shipped artifact is FASA, a data *aligner*, not a transcriber you can call

### What the paper teaches (keep for the demo narrative)

**The failure it documents:** a 4-year-old says *"and they are looking at the frog; and because he cracked his egg."* Whisper hears *"and they recognize the fog; and because do you grab this egg?"* Wav2Vec produces near-gibberish. Causes: developmental mispronunciation, non-standard articulation, and — directly relevant — **accented/non-native speech, where they note models degrade further and can emit offensive transcriptions.**

**Three takeaways:**

1. **Data alignment is the moat, not the architecture.** Kid-speech corpora have sloppy transcripts, so forced aligners fail — MFA hits 99.93% word error on CHILDES vs FASA's 0.22%. FASA tolerates out-of-order, missing, and extra transcript entries. ~57 hours total training audio.

2. **Phonetic knowledge injection.** Whisper with *two decoders* off one encoder — one orthographic, one phonetic — synced by contrastive + cross-attentive losses. Phonetic error rate 10.1% → 8.6%. Rationale is clinical: *how* a kid mispronounces is diagnostic, not noise. **Standard ASR throws away exactly the signal a reading tutor wants.** Deepest insight in the paper for us.

3. **Screening as byproduct.** Same model classifies age group and 7 disorder categories (apraxia, phonological delay, articulation disorder…) at 88.8%; 87% average across four tasks.

**Roadmap line for the demo:** *"v2 collects consented utterances, fine-tunes a KidSpeak-style child-speech encoder with a phonetic decoder, ships via Core ML — so we capture which grapheme-phoneme mappings a specific kid misses, not just whether they got the word."*

---

## 5. Bilingual rule

**Chrome bilingual. Content English-only.**

- Nav, buttons, instructions, parent-facing text → both languages
- The material the kid actually **reads** → always English. Otherwise we're not teaching reading.
- Spanish enters as: **character dialogue** (Abuela, Mom, Dad — story-justified), tap-and-hold rescue glosses, and celebration
- **Gloss is a rescue, never a default.** Never translate before the kid attempts.
- **Fade the scaffold** — Spanish support drops as mastery rises. Track it; doubles as a visible progress metric and a good demo beat.

### Character speech rule

**Any time Mom, Dad, Abuela, or any character speaks to the user, the line is bilingual on first delivery.** English-only on repeat.

This is a **per-line policy**, and the global mode is a **ceiling, not an override** — characters stay bilingual-first even in English-lean mode.

### The independence ladder

**Decision:** a single value `independence`, **1–10**, passed into the LLM prompt. As the kid gets more right answers, it climbs and Spanish support recedes.

Named `independence` (not "bilingualness") so **higher = more English = more independent** — the number reads in the intuitive direction.

**Why a ladder, not a number:** LLMs are unreliable at graded instructions like "be 7/10 bilingual." Each level maps to an **explicit rule set** stated in the prompt, so the number *selects rules* rather than sets a mood.

| Level | Rule |
|---|---|
| **1–2** | Full parallel. Every line Spanish → English. Instructions Spanish-first. Glosses auto-shown. |
| **3–4** | Bilingual, Spanish first but compressed — Spanish carries the meaning, English is the target phrase. |
| **5–6** | English first, Spanish echo on the key new word only. Instructions English + Spanish subtitle. |
| **7–8** | English only. Gloss on tap. |
| **9–10** | English only. Gloss on tap, never auto. |

### Two absolute rules that override the level

1. **First delivery of any new character line is bilingual** at level ≤ 8. Mom, Dad, and anyone else speaking *to* the user gets both languages the first time; English-only on repeat.
2. **Abuela never becomes English.** She is a character, not a setting. Her Spanish is story truth, not scaffolding. At level 10 she still speaks Spanish and the kid still answers in English — that *is* the mechanic.

### How `independence` is computed

Derived from the skill graph (§6) — rolling accuracy over recent attempts, mapped to 1–10, **with hysteresis**: requires ~5 consecutive successes at the higher band to step up, drops fast on struggle. Prevents flapping mid-scene.

One number, one source of truth.

---

## 6. Skill graph

The data structure that answers **"what should this kid see next, and why."**

### Nodes — teachable units

| Type | Examples |
|---|---|
| Grapheme → phoneme | `sh`→/ʃ/, `a_e`→/eɪ/, `ee`→/iː/, `ch`→/tʃ/ |
| Sight words | *the, said, was, come* — not decodable, must be memorized |
| Vocabulary / cognates | `family/familia`, `restaurant/restaurante` |

### Edges — prerequisites

Short vowels → CVC blending → digraphs → silent-e. You can't teach `ship` before `sh`.

### Per-kid state

Every node carries: **mastery (0–1)**, **last seen**, **attempt history**.

### What it buys us

1. **Selection** — the next lesson is the *frontier*: nodes whose prerequisites are mastered but whose own mastery is still low.
2. **Gating** — the decodable-text validator only writes sentences from mastered nodes **plus one new target**. This is what makes generated stories actually readable rather than plausible-looking gibberish.
3. **Review** — mastery decays over time, so spaced repetition falls out for free.
4. **Diagnosis** — the nodes that stay cold *are* the kid's specific block. For Spanish L1 we can **pre-seed the likely ones**: /ʃ/ vs /tʃ/, /v/ vs /b/, short /ɪ/, /z/, /θ/, initial s-clusters.
5. **Drives `independence`** (§5) — mastery rolls up into the bilingual level. One number, one source of truth.

### MVP scope

- **~25 nodes**, hand-authored in JSON
- Demo path is scripted, but it **reads and writes the real graph** — the graph is live, not a mockup
- **Debug overlay** showing nodes lighting up as the kid plays

That overlay is the entire scaling story proven in five seconds of video. Build it.

---

## 7. Story & content generation

**We set the tone. The LLM fills slots.**

- A **story bible** defines the family, voices, humor register, and the warmth of each character
- Story **beats are templates**; the LLM never invents structure
- A **decodable-text validator** gates every generated sentence against the phonics patterns the learner has unlocked, plus one new target
- Human review before anything ships

This is the difference between "an app with a story" and "an engine that makes stories."

---

## 8. Tech stack

**Native SwiftUI, Swift 6, iPadOS. Landscape-only.**

On-device `Speech` is the whole architecture — free, offline, and "zero marginal server cost per utterance" is our best scaling line. React Native / Flutter would fight us on exactly that.

| Layer | Pick | Why |
|---|---|---|
| **UI** | SwiftUI + `@Observable` | Fast, iPad-native gestures |
| **Speech** | `SFSpeechRecognizer`, `requiresOnDeviceRecognition = true`, `contextualStrings` | Boring wins in 2 days. Far more docs/examples than iOS 26's `SpeechAnalyzer`, which is the eventual ship-path. |
| **Persistence** | Codable structs → one JSON file | **Skip SwiftData** — schema migration pain we don't have time for |
| **Animation** | Pure SwiftUI (`PhaseAnimator`, `KeyframeAnimator`) | No Lottie dependency |
| **Content** | Runtime LLM, cached + prefetched | See below |
| **Character voice** | Pre-baked TTS audio for scripted lines; `AVSpeechSynthesizer` (es-MX / en-US) as fallback | `AVSpeechSynthesizer` sounds robotic and would undercut Mom, Dad, and Abuela — the exact thing we're selling. Probably the highest-leverage hour of the build. |

### Runtime LLM — yes, with guardrails

Generating live is the point. Hardcoding the demo throws away what makes this look like a platform. The risk is **latency and live failure**, not the concept — and both have fixes:

1. **Prefetch one beat ahead.** While the kid is in the store, generate the kitchen scene. Latency hides behind gameplay. A 7-year-old will not wait 4 seconds.
2. **Cache everything.** Key on `(room, skill frontier, independence, seed)`. Cache hit = instant.
3. **Pre-warm before demoing.** Play through once; the cache populates. The reviewer sees real generation, and we're not gambling on conference wifi. Warmed ≠ hardcoded.
4. **Bundled fallback pack.** On timeout (~2.5s) or error, fall back to a bundled scene. Never a spinner, never an error state.
5. **Visible "new story" affordance.** Give the demo a button that generates fresh on the spot. Much stronger than any scripted path.

**Hard line: the LLM generates content, it never grades.** Correctness checks — read-aloud matching, spelling, item selection — are deterministic and on-device. Keeps scoring instant, offline, free, and debuggable.

**Model:** fast tier (Haiku-class) for scene generation with structured output; prefetching makes the latency budget generous. API key lives in the app for the demo; a thin proxy is the real answer and belongs on the roadmap slide.

---

## 9. Scalability narrative (say it, don't build it)

Five layers:

1. **Content** — stories are data, not code. Beats are templates; the decodable-text validator gates every sentence. Show the JSON on screen: *"this story is content, and content is data."*
2. **Authoring** — LLM generates candidates, validator rejects anything using unearned graphemes, human reviews. That's 1 story → 500.
3. **Learner** — per-kid skill graph (grapheme → mastery, spaced-repetition decay). SwiftData local now, CloudKit later. 40K kids = 40K tiny independent state blobs. Embarrassingly shardable.
4. **Speech** — on-device inference = **zero marginal server cost per utterance.** Strongest scalability line, and true *today*, not aspirationally.
5. **Language** — the Spanish layer (cognate table, confusion pairs, L1 glosses) is a swappable **data pack**. Vietnamese, Haitian Creole, Tagalog = new JSON, no new code. The "it's a platform" line, and for Varsity Tutors' 40K base it's the money slide.

**Closing line:** *"What you just saw is one warm story. What I built is the machine that makes five hundred."*

---

## 10. Demo posture

Lean **narrative warmth**. The reviewer should *feel* the family. The engine gets explained, not demoed at length.

**Suggested demo path (~8 min):** one continuous story, each mechanic appearing once as a beat rather than as a menu item.

Living room (Abuela) → Kitchen (Mom, list) → store (Mandados) → home (Dad, corrections) → fridge (leave a note) → Bedroom (read to baby).

**Cut order if behind:** Pencil trace → Cognate Detective → fridge spelling.
**Never cut:** Abuela and the Baby. They're the warmth.

---

## 11. Open questions

- Art direction — illustrated 2D? What's achievable in 2 days? Needs consistent character sheets for Mom, Dad, Abuela, baby.
- Which TTS for the pre-baked character lines?
- Do we ship a parent/couch-co-op mode in MVP, or hold it as roadmap? (Strong differentiator, but scope.)
- Where does the Photo Album / progress artifact live? (Earlier idea: each completed story adds a family photo with a kid-written caption. Currently unassigned to a room.)
- Starting `independence` value for a new learner — 1, or a quick placement check?
- The ~25 skill-graph nodes: which 25?

---

## 12. Parking lot (good ideas, not in MVP)

- **Couch co-op** — iPad flat on the table, parent reads alongside, with Spanish-supported prompts for the adult. Gives the parent a job they can actually do. Real family-literacy intervention.
- **Minimal pairs as chores** — sorting laundry / putting groceries away drills ship/chip, bat/vat, van/ban. Hidden pronunciation practice on exactly the Spanish-L1 confusion set.
- **Backyard phonics garden** — plant sounds, grow words.
- **Garage** — compound words, morphology.
- **Dinner table** — comprehension via retelling ("what happened today?"). Sequencing and summarizing.
- **Word pets / mascotas** — a family pet that grows by being fed mastered words.
- **Neighborhood expansion** — house → block → school → city as grade level rises.
