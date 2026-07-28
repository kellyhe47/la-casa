# La Casa — PRD

> Build spec for the 2-day MVP. Normative except §12 (scaling narrative) and §14 (roadmap).
> Source: [idea.md](./idea.md). Vocabulary: [CONTEXT.md](./CONTEXT.md) — terms in **bold** are defined there.

**Prompt:** Nerdy/Varsity Tutors Challenge 3 — English Reading Game for young learners (fluency, comprehension, vocabulary).
**Target:** iPad, landscape-only, native SwiftUI. Learner persona: Spanish-speaking Grade-2 kid.
**Thesis:** transfer, not remediation — the kid's Spanish phonemic awareness and cognate vocabulary are assets. Never score accent; score **decoding**.

---

## 1. Scope

### P0 — the demo is this

| # | Feature | § |
|---|---|---|
| P0-1 | Story **rail** (6 beats, auto-advance, house-transition animation) | §3 |
| P0-2 | Mandados quest (Kitchen → store → Dad's check) | §4.1 |
| P0-3 | Abuela's picture message (Living room) | §4.2 |
| P0-4 | Baby read-aloud (Bedroom) | §4.3 |
| P0-5 | Skill graph, ~25 **nodes**, live read/write + debug overlay | §6 |
| P0-6 | **Independence** ladder driving bilingual output | §5 |
| P0-7 | Runtime content pipeline: LLM + ElevenLabs TTS, prefetch/cache/fallback | §8 |
| P0-8 | **Deterministic grading** pipeline | §7 |

### P1 — build if P0 lands (in order)

| # | Feature | § |
|---|---|---|
| P1-1 | Fridge magnet spelling | §4.4 |
| P1-2 | Cognate Detective | §4.5 |

### Cut / out of scope for MVP

- Apple Pencil letter tracing — **cut entirely** (decision 2026-07-27)
- Handwriting recognition / OCR — banned (unreliable on kid print, same trap as open ASR)
- Photo Album → roadmap (the Abuela thread is MVP's progress artifact)
- Placement check → roadmap; new learners start at independence 3
- Free-roam house hub, couch co-op, K–1 / 4–5 bands, parent dashboard → roadmap (§14)

---

## 2. Player & characters

- Player: **Sofía**, ~7-year-old girl, fixed on-screen avatar. No customization, no name entry. Characters call her "Sofía" / "mija."
- Cast: **Mom** (quest giver, warm corrector), **Dad** (bag check, jokes), **Abuela** (Spanish voice notes — never English, any level), **Baby sister** (read-aloud listener).
- Each character has a distinct ElevenLabs voice (§8.3) and a character sheet (§10).

---

## 3. Rail & screens

Linear beat sequence; no free navigation:

```
Living room (Abuela msg) → Kitchen (Mom's list) → Store (shelf)
→ Kitchen (Dad's check) → Fridge (magnets, P1) → Bedroom (baby read-aloud)
```

**R3.1** Beats auto-advance on completion; a beat can be replayed before advancing ("otra vez" affordance).
**R3.2** Between beats, an animated house cross-section shows Sofía moving room to room. It is a transition, not a menu — no taps required, skippable after 1s.
**R3.3** "New story" button on the title screen regenerates all beat content live (demo requirement).
**R3.4** Screens: Title, House transition, Living room, Kitchen (list), Store, Kitchen (check), Fridge, Bedroom. Debug overlay togglable on any screen (§6.5).

---

## 4. Mechanics

### 4.1 Mandados quest (P0)

1. Mom hands Sofía a written list (3–5 grocery items drawn from frontier + mastered vocab nodes).
2. Transition to store. Shelf shows listed items + ≥2× distractors, distractors chosen for visual/orthographic confusability (beans/beads).
3. Sofía reads each list word, taps the matching shelf item. Tap = the graded event (deterministic, §7).
4. Home: Dad unpacks the bag. Errors are jokes — misread item appears in the fiction (beads in the soup), Dad delivers the correction warmly, bilingual per §5. Then the corrected word is retried once.

**R4.1.1** Wrong picks are never labeled wrong in UI copy — no red X, no "incorrect." The joke is the feedback.
**R4.1.2** Every list word attempt writes to its node's history (§6).

### 4.2 Abuela's picture message (P0)

1. Message-thread UI; photo message arrives (photo of item/short English text).
2. Abuela voice note plays in Spanish ("Mija, ¿qué dice aquí?").
3. Sofía taps mic, answers **in English**. Graded by **known-target matching** (§7).
4. Abuela replies in Spanish, delighted. Thread persists across sessions = progress artifact.

**R4.2.1** Optional unscored beat: Sofía may also record a Spanish reply; it is "sent," never judged.
**R4.2.2** Abuela's lines are Spanish at every independence level (absolute rule, §5).

### 4.3 Baby read-aloud (P0)

1. Baby + book on screen. One English sentence shown at a time (generated, validator-gated §8.2).
2. Sofía reads aloud → deterministic grade (§7).
3. Pass: the baby repeats the **target sentence** back (baby-voice TTS, prefetched with the beat) and giggles. Below threshold: **the baby gets confused** — plays pre-baked confused babble — then Mom appears, laughs warmly, says the correct phrase (bilingual per §5), retry.

**R4.3.0** The baby's echo is never synthesized from Sofía's actual utterance at runtime (it can't be prefetched and would add 1–2 s dead air). Success echo = prefetched target audio; miss = bundled babble clips. Mid-mechanic latency stays zero.
**R4.3.1** ASR misses must surface as baby confusion, never as error states (**fiction absorption**). No retry counter shown; unlimited retries.
**R4.3.2** Sentence length: 3–7 words, decodable per validator.

### 4.4 Fridge magnet spelling (P1)

- Magnet tray = every word with mastery ≥ 0.8, from anywhere in the game (the pool is the skill graph, not the pantry).
- Prompts are social and character-issued ("Write a note for Dad," "Help the baby write her name"), generated within beat templates.
- Sofía drags letter magnets to spell the target. Grading: exact string match after normalization (deterministic).
- Completed notes stay on the fridge (second progress artifact).

### 4.5 Cognate Detective (P1)

- Persistent magnifying-glass tool, usable on any on-screen English text.
- Tap words believed to have Spanish twins. Hit: confetti + both words spoken (EN + ES voices). Includes **false friends** as traps (sopa ≠ soap, éxito ≠ exit) — a trap "catch" plays a comic reveal.
- Hits/traps write to cognate nodes.

---

## 5. Bilingual system

**Chrome bilingual, content English-only.** The text Sofía *reads* is always English. Spanish enters via character dialogue, **gloss** (tap-and-hold rescue — never shown before an attempt), and celebration.

### Independence ladder

One value, `independence` (1–10). Each band selects an explicit rule set injected into the LLM prompt (never "be 7/10 bilingual"):

| Band | Rules |
|---|---|
| 1–2 | Full parallel: every line ES → EN. Instructions Spanish-first. Glosses auto-shown. |
| 3–4 | Bilingual, Spanish-first compressed: ES carries meaning, EN is the target phrase. |
| 5–6 | English-first, Spanish echo on the key new word only. Instructions EN + ES subtitle. |
| 7–8 | English only. Gloss on tap. |
| 9–10 | English only. Gloss on tap, never auto. |

**Absolute rules (override the band):**
**R5.1** First delivery of any new character line is bilingual at band ≤ 8; English-only on repeat.
**R5.2** Abuela never becomes English.

**Computation:** derived from the skill graph — rolling accuracy over the last 20 graded attempts, with hysteresis. Default mapping (tuned 2026-07-28): candidate band = clamp(round(accuracy × 10), 1, 10); move one band at a time — up one band when a beat ends on a pass streak (≥ 1 consecutive pass) while candidate > current (originally 5 consecutive passes; loosened so the scaffold visibly fades within a demo), down one band after 3 misses in the last 5. Never changes mid-beat.
**R5.3** New learner starts at 3.
**R5.5** Gloss presentation by band (decision 2026-07-28): bands 1–2 gloss auto-shown; bands 3–4 hidden but tap-and-hold works anytime; bands 5–10 nothing until the kid attempts, then tap-and-hold works (rescue, never a default — CONTEXT.md).
**R5.4** Current band is visible in the debug overlay; band changes fire a subtle celebration ("¡Más inglés!") — the fading scaffold is a demo beat.

---

## 6. Skill graph

One JSON file + ~100 lines of Swift. Live, not mocked: the demo path reads and writes it. Visual reference (all 25 nodes, prereq edges, fresh vs demo-state frontier): [docs/skill-graph.html](./docs/skill-graph.html).

### 6.1 Node schema

```json
{ "id": "g_sh", "type": "grapheme", "label": "sh → /ʃ/",
  "prereqs": ["g_cvc"], "confusion": true,
  "mastery": 0.0, "lastSeen": null, "attempts": [] }
```

### 6.2 The 25 MVP nodes (⚑ = Spanish-L1 confusion set, pre-seeded cold)

**Graphemes (12):** g_a /æ/ ⚑ · g_i short /ɪ/ ⚑ · g_eou short e/o/u · g_cvc CVC blending (pre: g_a, g_i, g_eou) · g_sh /ʃ/ ⚑ (pre: g_cvc) · g_ch /tʃ/ ⚑ (pre: g_sh) · g_th /θ/ ⚑ (pre: g_cvc) · g_vb v-vs-b ⚑ (pre: g_cvc) · g_z final /z/ ⚑ (pre: g_cvc) · g_scl initial s-clusters ⚑ (pre: g_cvc) · g_ae silent-e a_e (pre: g_cvc) · g_ee ee /iː/ vs /ɪ/ ⚑ (pre: g_i, g_cvc)

**Sight words (6, no prereqs):** s_the · s_said · s_was · s_come · s_of · s_to

**Vocabulary/cognates (7):** v_family (familia) · v_restaurant (restaurante) · v_fruit (fruta) · v_chocolate · v_soup (+ false-friend trap sopa/soap) · v_groc1 milk/eggs/bread (pre: g_cvc) · v_groc2 beans/rice/apples (pre: g_cvc)

### 6.3 Update & decay

- On attempt: `mastery = 0.7·mastery + 0.3·result` (result ∈ {0,1}).
- Decay: `-0.02 per day since lastSeen`, floor 0.2 of peak — spaced review falls out for free.

### 6.4 Queries

- **Frontier**: prereqs all ≥ 0.8 ∧ own mastery < 0.6. Content targets always come from the frontier.
- **Validator vocabulary** (§8.2): all nodes ≥ 0.8, plus exactly one frontier target per beat.
- **Independence input** (§5).

### 6.5 Debug overlay

Toggle: 3-finger triple-tap. Renders the graph as nodes lighting up live as Sofía plays — mastery as fill, frontier highlighted, independence band + last grade shown. This is the scaling story on screen; it ships polished, not as scaffolding.

---

## 7. Deterministic grading

**Hard line: the LLM generates content; it never grades.** ([ADR-0001](./docs/adr/0001-llm-never-grades.md))

Pipeline for spoken input:
1. On-device ASR (`SFSpeechRecognizer`, `requiresOnDeviceRecognition = true`), `contextualStrings` = expected target (+ distractor set where relevant). Never open transcription — always **known-target matching**.
2. Transcript → normalize (lowercase, strip punctuation/fillers).
3. Judge = pure function `grade(transcript, target) → {pass, matchedWord}` via token-level fuzzy match (normalized Levenshtein per word, threshold 0.65 — forgiving; the fiction absorbs the rest). Same inputs, same grade, every time.

**R7.1** Grade path: no network, no LLM, no API. Instant (<100 ms post-transcription), offline, debuggable.
**R7.2** Accent is never a scoring input. Match thresholds are calibrated on word identity, not phonetic precision.
**R7.3** Tap grading (Mandados) and string grading (magnets) are trivially deterministic; same principle, same logging.
**R7.4** Every grade writes `(nodeId, result, timestamp)` to the graph.

---

## 8. Content pipeline

### 8.1 Runtime LLM

- Model: `claude-haiku-4-5`, structured output (JSON beat schema).
- **Story bible** (family, voices, humor register, warmth) + beat templates are authored constants. The LLM fills slots; it never invents structure.
- **Build deliverables (agent-authored during implementation, human-reviewed after):** the story bible, the beat JSON schema + templates, the fallback pack (all 6 beats + audio), and per-character ElevenLabs voice picks — record voice IDs in one config file so they're swappable without code changes.
- Prompt inputs: beat template, frontier target node, validator vocabulary, independence band rule set, seed.
- API key in-app for demo; thin proxy = roadmap line.

### 8.2 Decodable-text validator

Deterministic gate: every generated sentence must use only graphemes/words from mastered nodes + the single frontier target. Reject → regenerate (max 2) → fallback pack. This is what makes generated text *readable*, not plausible-looking.

### 8.3 Voice (ElevenLabs, runtime)

- Every character line is TTS'd at runtime via ElevenLabs (Flash tier), one distinct voice per character; es-MX for Spanish lines, en-US for English.
- **Voice casting (decision 2026-07-28):** free-tier premades — Sofía=Jessica, Mamá=Sarah, Papá=Chris, Abuela=Bella, Baby=Lily (ids in `LaCasa/Resources/voices.json`). Constraint learned: ElevenLabs blocks library/"professional" voices via API on the free tier (HTTP 402) — the preferred authentic es-MX voices (Gabriela/Laura/Chris, stashed in voices.json under `_userPaidPicks_needsElevenLabsStarterPlan`) need a Starter plan; swap back + rerun `scripts/generate_fallback_audio.sh` if upgraded.
- Same pipeline as text: generated at prefetch time, cached, fallback.
- Fallback: `AVSpeechSynthesizer` (es-MX / en-US) on timeout/offline — the game never blocks on audio.

### 8.4 Prefetch / cache / fallback

**R8.4.1** While beat N plays, beat N+1's text and audio generate (**prefetch**).
**R8.4.2** Cache key: `(beat, frontierTarget, independenceBand, seed)` for text; `(text, voice, lang)` for audio. Hit = instant.
**R8.4.3** Timeout 2.5 s or error → bundled **fallback pack** (pre-authored beats + pre-generated audio for all 6 beats). Never a spinner, never an error state.
**R8.4.4** Pre-warm before demo: one full playthrough populates caches. Warmed ≠ hardcoded — "New story" (R3.3) proves it.

---

## 9. Tech stack

| Layer | Pick |
|---|---|
| UI | SwiftUI + `@Observable`, Swift 6, iPadOS, landscape-only |
| Speech | `SFSpeechRecognizer`, on-device, `contextualStrings` |
| Persistence | Codable structs → one JSON file (no SwiftData) |
| Animation | Pure SwiftUI (`PhaseAnimator`, `KeyframeAnimator`); no Lottie |
| Content | Anthropic API (Haiku-class), structured output |
| Voice | ElevenLabs API (runtime) + `AVSpeechSynthesizer` fallback |
| Art | AI-generated flat ink-line stills (§10), bundled PNG |

---

## 10. Art direction

Style: **cozy coloring book** — hand-inked warm-brown line on flat fills, chunky rounded volumes, blush cheeks, oversized heads. No 3D rendering, no gradients, no drop shadows except the soft ground ellipse. Tone refs: Coco (multigenerational Mexican family warmth), Cleo & Cuquín (kid + baby energy).

- **Line rules:** ink #6F4B35 only — 9–10 px silhouettes, 6–7 px interior lines, round caps, slightly wobbly edges.
- **Pipeline:** characters and room scenes are AI-generated flat ink-line stills — one character sheet per family member (front, 3/4, 2–3 expressions, 2–3 poses) for consistency; rooms as wide landscape plates with clear interaction zones. Bundled as PNGs; animation is SwiftUI transforms (bounce, slide, scale, parallax) on static art.
- **Cast look:** Sofía — dark bob, red bow, red/white top. Baby — bald, onesie (Cuquín energy). Mom, Dad, Abuela — Coco-warm, distinct silhouettes, blush always.
- **Palette:** cream grounds (#FFFAF0 / #FDF3E3), ink #6F4B35, action terracotta #E0674A (the one primary action per screen, always ink-outlined); each room owns a hue under the same warm ink line (living room coral, kitchen butter-yellow, store mint, bedroom lavender).
- **Mocks:** [docs/mocks/la-casa-mocks-v2.html](./docs/mocks/la-casa-mocks-v2.html) is the binding art-direction reference (all 8 screens + cast sheet + debug overlay, §3.4). The mocks are *direction, not assets* — no app-ready images exist yet.
- **MVP asset rule: functionality first.** Build every scene with SwiftUI-drawn placeholder art (simple shapes following this section's palette + ink-line rules), loaded through a single `AssetStore` seam, so generated PNGs can replace placeholders later without touching views. Do not block any ticket on art.
- **Type:** Baloo 2 (bundled in app; SIL OFL — download the font files during the build) for everything in-game; fall back to SF Rounded if unavailable; reading text ≥ 40 pt on iPad.

---

## 11. Non-functional requirements

- **R11.1** Grade feedback < 100 ms after transcription; transcription end-of-utterance < 1 s.
- **R11.2** Beat transition < 300 ms on cache hit; prefetch hides generation latency entirely (a 7-year-old will not wait 4 s).
- **R11.3** Fully playable offline via fallback pack + on-device ASR + Apple TTS.
- **R11.4** No error states, spinners, or red X anywhere in kid-facing UI.
- **R11.5** All learner data local (one JSON file). No accounts, no analytics, no PII, no audio retained after grading.

---

## 12. Scaling narrative (non-normative — say it, don't build it)

1. **Content is data** — stories are JSON beats gated by the validator; show the JSON.
2. **Authoring** — LLM generates candidates, validator rejects, human reviews: 1 story → 500.
3. **Learner** — 40K kids = 40K independent JSON state blobs; CloudKit later; embarrassingly shardable.
4. **Speech** — on-device inference: zero marginal server cost per utterance, true today.
5. **Language** — the Spanish layer (cognate table, confusion set, glosses) is a swappable data pack: Vietnamese/Tagalog/Haitian Creole = new JSON, no new code.

Closer: *"What you just saw is one warm story. What I built is the machine that makes five hundred."*

Roadmap-only ASR line: v2 collects consented utterances → KidSpeak-style child-speech encoder with phonetic decoder via Core ML → capture *which* grapheme-phoneme mappings a kid misses, not just pass/fail.

## 13. Demo (~8 min)

One continuous story, each mechanic once: Living room (Abuela) → Kitchen (Mom) → Store → Home (Dad) → Fridge note → Bedroom (baby). Beats to hit: debug overlay flash (5 s), independence tick-up celebration, "New story" live generation. Cut order if behind: Cognate Detective → fridge spelling. Never cut Abuela or the baby.

**Demo starting state (decision 2026-07-28):** the demo plays from the bundled mid-progress learner state (`demo-state.json`: CVC + grocery/sight basics mastered, frontier at the Spanish-L1 confusion set — see docs/skill-graph.html), not from a fresh Day-1 graph. Baby babble clips remain `say`-generated placeholders (accepted for MVP).

## 14. Roadmap (out of MVP)

Photo Album · placement check · couch co-op · minimal-pairs chores · backyard/garage/dinner-table rooms · word pets · neighborhood expansion (house → block → school → city) · K–1 and 4–5 bands · parent dashboard · API proxy · CloudKit sync · KidSpeak-style fine-tuned ASR.
