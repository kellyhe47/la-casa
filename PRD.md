# La Casa — PRD

> Build spec for the 2-day MVP. Everything here is being built and normative.
> Source: [idea.md](./idea.md). Vocabulary: [CONTEXT.md](./CONTEXT.md) — terms in **bold** are defined there.
> Architecture reference: [docs/architecture.html](./docs/architecture.html).

**Prompt:** Nerdy/Varsity Tutors Challenge 3 — English Reading Game for young learners (fluency, comprehension, vocabulary).
**Target:** web app (decision 2026-07-29: this repo is the web build; the sibling `nerdyv2` is the iOS build), desktop + tablet browsers, landscape layout, DOM/SVG-rendered scenes (decision 2026-07-29 — see docs/research/art-rendering-pipeline.md: the design mocks' SVG is production-grade; no canvas engine needed). Learner persona: Spanish-speaking Grade-2 kid.
**Thesis:** transfer, not remediation — the kid's Spanish phonemic awareness and cognate vocabulary are assets. Never score accent; score **decoding**.

---

## 1. Scope

### The MVP — the demo is this

| # | Feature | § |
|---|---|---|
| P0-1 | Story **rail** (Title → Living room → Fridge → Bedroom, auto-advance, house-transition animation) | §3 |
| P0-2 | Abuela's picture message loop (Living room) | §4.2 |
| P0-3 | Fridge magnet spelling loop, hosted by Dad (Bedroom-adjacent kitchen close-up) | §4.4 |
| P0-4 | Baby read-aloud loop (Bedroom) | §4.3 |
| P0-5 | Skill graph, ~25 **nodes**, live read/write + debug overlay | §6 |
| P0-6 | **Independence** ladder driving bilingual output | §5 |
| P0-7 | Runtime content pipeline: LLM + ElevenLabs TTS, prefetch/cache, living-scene wait | §8 |
| P0-8 | **Deterministic grading** pipeline | §7 |


### Out of scope for MVP

- Persistence of any kind — **nothing is saved between sessions** (decision 2026-07-28). State is in-memory only; a fresh launch = reset
- Handwriting recognition / OCR — banned (unreliable on kid print, same trap as open ASR)

---

## 2. Player & characters

- **First person (decision 2026-07-28): the camera is Sofía.** The player sees the world through her eyes — she never appears on screen except her hands and held objects (the list, the basket, magnets). Characters look at and address the camera ("Sofía" / "mija"). Her words are the kid's own voice — **Sofía has no TTS voice and no scripted spoken lines.** No customization, no name entry.
- Cast (MVP): **Abuela** (Spanish voice notes — never English, any level), **Dad** (fridge host, jokes), **Baby brother** — *hermanito* — (read-aloud listener), **Mom** (bedroom grace path only: models the sentence on a second miss; her dialogue is band-driven like everyone's — no hard-coded Spanish-only lines).
- Each character has a distinct ElevenLabs voice (§8.3) and a character sheet (§10).
- **R2.1 — the grace pattern (applies to every character, every mechanic):** the character always resolves the answer warmly after 2 misses (gives it, in English, and celebrates anyway) — the kid is never stuck, never fails out of a beat. The graph records the misses; the fiction doesn't need to.

---

## 3. Rail & screens

Linear beat sequence; no free navigation:

```
Title (¡Jugar!) → Living room (Abuela loop) → Fridge (Dad's magnet loop) → Bedroom (baby read-aloud loop)
(the rail is a config array — future beats slot in without restructuring)
```

**R3.1** Beats auto-advance on completion; a beat can be replayed before advancing ("otra vez" affordance). Three beats are loops with diegetic exits — Abuela (§4.2), fridge (§4.4), bedroom (§4.3): the kid practices until *they* choose to move on.
**R3.2** Between beats, a first-person travel transition: the camera glides through the house (parallax pan across the cross-section / doorway push-through) from room to room. It is a transition, not a menu — no taps required, skippable after 1s.
**R3.3** Title screen holds exactly one control: a big terracotta **¡Jugar!** button. No menu, no settings, no continue — every play is brand new (refresh → ¡Jugar! *is* the new-story path; no separate control).
**R3.4** Tapping ¡Jugar! immediately requests **mic permission** (the adult-hands moment — never mid-fiction), then a half-second mic check absorbed into fiction (the game invites a "¡Hola!" — any detected sound passes). **The mic is a hard requirement:** permission denied or no mic → the game does not start; ¡Jugar! shows one calm adult-facing message ("La Casa needs a microphone to play"). No degraded mode.
**R3.5** ¡Jugar! rolls a **session seed** (feeds every generation cache key and the debug overlay) and seeds the graph in memory from [content/demo-state.json](./content/demo-state.json). Nothing is ever written to storage.
**R3.6** Screens: Title, House transition, Living room, Fridge, Bedroom, Off-ramp. Debug overlay togglable on any screen (§6.5).

### 3.1 Screen-by-screen spec (the design contract — every screen, every state)

All screens: first-person (§2), fixed 1280×800 logical canvas, room hue per §10, one terracotta primary action max, gloss per R5.5, debug overlay togglable. Every room needs a **living-scene wait state** (character idle loop + ambient house audio, R8.4.3).

| Screen | POV & layout | Interactive elements | States | Exit |
|---|---|---|---|---|
| **Title** | Exterior of the house, dusk-warm, from the street | One button: **¡Jugar!** (terracotta) — the only control. | Idle · mic-permission prompt · mic-check ("¡Hola!") · mic-denied message (adult-facing, calm) | ¡Jugar! → front-door push-through: camera walks up and *through the opening front door* into the living room (the first house transition) |
| **House transition** | First-person camera glide between rooms (parallax pan / doorway push-through) | None (skippable after 1 s, any tap) | In-motion only | Auto |
| **Living room** (Abuela, loop) | Coral hue; couch arms/phone in Sofía's hands at bottom of frame; chat thread as React overlay | Mic button (tap-to-talk, pulsing); photo message (tap-hold gloss); optional Spanish-reply record; **"Adiós, Abuela"** (the exit) | Message-arrival · listening (voice note) · mic-live · miss ("¿Cómo, mija?") · grace (Abuela gives it) · delighted-reply · next-message · goodbye exchange · **phone-put-away animation** (phone lowers out of frame) · wait-state | Adiós, Abuela |
| **Fridge** (loop) | Butter-yellow, close-up fridge door; Dad beside it addressing camera; magnet tray at bottom; completed notes accumulate on door. **All-spoken scene (R4.4.1): no speech bubbles or captions — the only text is the note + tray letters** | Drag letter magnets (needed + ~4 distractors incl. the confusable); speaker button (replay Dad saying the word); **"¡A dormir!"** (Dad's theatrical yawn = the exit button) | Prompt (Dad speaks target) · dragging (wrong letters wobble back) · note-complete-sticks · next-prompt · goodnight bit · wait-state | ¡A dormir! |
| **Bedroom** (loop) | Lavender, dim; crib + baby facing camera; book held in Sofía's hands, one sentence per page | Mic button; page display (tap-hold gloss after attempt); **"Buenas noches"** (book-close = the exit button) | Reading · pass (baby echoes + giggles, page turn) · miss (baby confused babble → Mom models) · grace (read-along + auto-pass) · wait-state | Buenas noches → lights dim, session ends |
| **Off-ramp** (R8.4.4) | Warm still: dark house, lit window | None | Single static state — "La familia está durmiendo... come back soon" | Refresh only |

### 3.2 Interaction grammar (one layout language, every mini-game)

**R3.7** All screens share fixed zones so the kid never relearns the screen:
- **Bottom-center — Sofía's hands, the instrument.** Every graded input happens through the held object: phone (mic button lives ON it), list, basket, magnet tray, book. Never a floating input control.
- **Center stage — the world.** Characters + tappable world objects. All feedback is delivered by characters from their position in the scene; no toasts, banners, or system messages.
- **Top corner — carried context.** The travelling list / current prompt: persistent, small, glanceable.
- **Side overlay — communication.** Chat threads slide over the world, never over the hands zone.
- **Hierarchy:** the reading target is always the largest text on screen (≥40 px); the single terracotta action is always the next thing to do; exits are diegetic objects in the world (Dad's yawn, the book cover), never chrome.

**R3.8** Scenes are built as **separated depth layers** (background / mid / foreground props / hands) with parallax on camera moves — 2.5D staging that makes first-person travel feel alive.

**R3.11** Canvas fit (decision 2026-07-29, from the design handoff): the 1280×800 composition is the safe area, not a letterbox. Background layers carry ~80 px of vertical **bleed** (wall extends up, floor extends down); the canvas scales to fill the display's width and centers vertically, so taller displays (iPad 4:3, browser viewports) see bleed instead of bars. **Nothing interactive ever lives in the bleed.**

**R3.10** Loop-exit availability (decision 2026-07-29): in every loop scene, the diegetic exit **appears only after the first completed item** — each scene guarantees at least one graded rep. During an active item (mic live, magnet mid-drag, audio playing) the exit is **dimmed and non-interactive**; it re-enables at item boundaries. A graced item counts as a completed boundary — the kid can always leave right after being rescued.

**R3.9** Kid-motor-skill rules (research: [docs/research/kids-game-ux-patterns.md](./research/kids-game-ux-patterns.md)) — 7-year-olds miss 48 dp targets ~30% of the time:
- Interactive hit areas ≥ **96 px**, ≥ 64 px apart; hit boxes padded well beyond the visible sprite; the mic button is a hero target (~160 px).
- **Drag is fragile at 7**: magnets get a wide magnetic snap radius, progress keeps on finger-lift (never reset the word), and a tap-magnet-then-tap-slot fallback works everywhere drag does.
- Mic interaction has three character-driven states: **invite** (pulse) → **listening** (live waveform on the phone) → **thinking** (character leans in), auto-stop on silence (already R11.1).
- Celebration: < 500 ms after the grade, 1–3 s, and **content-relevant** — the item itself animates (the beans dance), not generic confetti. Wrong taps redirect diegetically, in character.
- **Idle ladder** in every waiting-for-kid state: 5 s → primary action pulses; 10 s → the character re-prompts and *points*; 20 s → the character partially demonstrates. Any prompt is replayable unlimited times via an in-world speaker affordance.

---

## 4. Mechanics

All mechanics are **frontier-driven**: they target whatever the graph says needs teaching, preferring words missed earlier this session. The graph is the curriculum.

### 4.2 Abuela's picture message loop (P0)

1. Living room; phone buzzes; chat UI slides up over the scene. Photo message arrives: a **runtime-generated image** of the target item (frontier-targeted) plus the English word rendered by the client beside it.
   - **R4.2.4 — photo pipeline:** the image is generated at runtime via an image-generation API (the one non-Anthropic model in the stack — e.g. `gpt-image-1`), prefetched per exchange like text and audio, cached by `(word, seed)`, and wired into the same retry → living-scene wait → off-ramp ladder as every other call. Style prompt: **hyper-realistic cartoon** of the item — warm, appetizing, photo-like inside its Polaroid frame.
   - **R4.2.5 — text never lives inside the image.** The generated image depicts the item only. The readable English word is always client-rendered (Baloo, ≥40 px, the reading target) — deterministic, glossable, never at the mercy of a model's text rendering.
2. Abuela voice note auto-plays in Spanish ("Mija, ¿qué dice aquí?").
3. Big pulsing mic button — **tap-to-talk with automatic end-of-utterance detection** (no hold). Sofía answers **in English**. Graded by **known-target matching** (§7).
4. **Miss:** Abuela can't hear well — "¿Cómo, mija? No te escuché bien" — mic re-pulses, unlimited retries. After 2 misses, grace pattern: Abuela gives it warmly ("Ahh — dice *milk*, mija") and replies delighted regardless.
5. Her delighted Spanish reply lands in the thread — and **this beat is a loop**: she sends the next photo message (each new target drawn live from the moving frontier, prefetched while the current exchange plays), so the kid practices with Abuela until they're ready to move on.
6. Exit is diegetic: an **"Adiós, Abuela" affordance** — tapping it plays a goodbye exchange beat (Abuela: "¡Te quiero, mija!") and the **phone lowers out of the bottom of frame, put away**, hands empty; then the fridge transition.

**R4.2.1** Optional unscored beat: Sofía may also record a Spanish reply; it is "sent," never judged.
**R4.2.2** Abuela's lines are Spanish at every independence level (absolute rule, §5).
**R4.2.3** The thread accumulates across the session — the session's progress artifact (nothing persists past refresh).

### 4.3 Baby read-aloud loop (P0)

1. Baby + book on screen. One English sentence per page (generated, validator-gated §8.2), 3–7 words.
2. **Sentence content = the session's harvest**: validator vocabulary weighted toward this session's words — the current frontier target and, above all, words missed-then-graced earlier (from the Abuela exchanges). The bedtime story is literally the day's story ("The beans are in the soup!").
3. Sofía reads aloud → deterministic grade (§7). Pass: baby repeats the **target sentence** (baby-voice TTS, prefetched) and giggles; the next page slides in.
4. **This beat is a loop**: pages keep coming (next sentence prefetched while the current one plays) until the kid taps the diegetic exit — a **"Buenas noches"** button; book closes, lights dim, session ends.
5. Miss: **the baby gets confused** — pre-baked confused babble — then Mom appears, laughs warmly, says the correct phrase (bilingual per §5), retry. After 2 misses, grace pattern: Mom reads it *with* her ("Léelo conmigo: The... beans..."), kid taps mic once more, that attempt auto-passes. Baby giggles; everyone wins; the graph recorded the truth.

**R4.3.0** The baby's echo is never synthesized from Sofía's actual utterance at runtime (can't be prefetched; 1–2 s dead air). Success echo = prefetched target audio; miss = bundled babble clips. Mid-mechanic latency stays zero.
**R4.3.1** ASR misses must surface as baby confusion, never as error states (**fiction absorption**). No retry counter shown; unlimited retries.

### 4.4 Fridge magnet spelling loop (P0) — hosted by Dad

- **Target selection — the session's most instructionally live word:** (1) words missed-then-graced in the previous scene (Abuela's exchanges) → (2) the current frontier target's word → (3) a mastered-pool word (silent guard so the endless loop never stalls when 1–2 are exhausted; the kid gets an easy confidence word, and the exit stays *their* choice).
- Dad is the scene's host and only character. He issues each prompt socially ("Write a note for Mamá — tell her we got the **beans**!") and **speaks the target word in English** before spelling starts. A small speaker button on the note card replays it any time.
- **R4.4.2 — drag mechanics (numbers are normative):** padded hit box ≥ 96 px per magnet (larger than the sprite); on pickup the magnet scales to 1.1 and rides ~40 px above the finger; the next empty slot glows as the target; **magnetic snap radius ~120 px** on release; wrong letter sits one beat then wobbles back to the tray (no red X — the wobble is the feedback); a drop outside any slot returns that magnet only — **placed letters never reset**; **tap-tap alternative always live** (tap magnet → tap slot), not a mode; grading fires only on word completion (exact match). **Single-touch policy:** first touch wins — extra pointers during a drag are ignored (kids rest their other hand on the screen); on web, `setPointerCapture` on the dragged element and `touch-action: none` on the scene root so the browser never hijacks the drag as scroll/zoom.
- **R4.4.1 — all-spoken scene:** Dad’s dialogue is voice-only. No speech bubbles, captions, or transcripts anywhere in the scene — showing his words would print the answer the kid is supposed to encode from sound. The only text on screen is the note being spelled and the tray letters. (Gloss/tap-hold does not apply here — there is no dialogue text to gloss.)
- Magnet tray: **lowercase letters** (decision 2026-07-29 — matches every other reading surface; the grapheme shapes being graded are the ones being taught), the needed letters + ~4 distractors **including the confusable** (ea vs ee for beans). Misplaced letters wobble back to the tray; no red X (fiction absorption). Grading: exact string match after normalization (deterministic).
- **This beat is a loop**: each completed note sticks on the fridge and Dad hands the next prompt, each new word drawn live from the (moving) frontier — words get harder as she gets better. Next word prefetched while the current one plays. Exit is diegetic: **Dad yawns theatrically — "Uy... ¡a dormir, mija!"** — styled as the scene's action button; tap → goodnight bit → bedroom transition.

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
**R5.6** The target word being taught is always spoken/shown in English by every character, at every band — never glossed away in dialogue.

**Computation:** derived from the skill graph — rolling accuracy over the last 20 graded attempts, with hysteresis. Candidate band = clamp(round(accuracy × 10), 1, 10); move one band at a time — up one band at an item boundary when on a pass streak while candidate > current, down one band after 3 misses in the last 5. Band changes apply **silently and per item** (in loop beats, each completed item counts as a beat-end for this purpose); the dialogue simply arrives more English.
**R5.3** The session starts at band 3 (pinned by `demo-state.json`) so the Spanish→English fade completes visibly within one ~5-minute playthrough, landing at band 8–9 by the end of the bedroom loop (the loops make attempt count elastic — a clean pass ticks the band roughly every 2 items, so ~3 Abuela exchanges + ~3 book pages carry the full fade).
**R5.5** Gloss presentation by band: bands 1–2 gloss auto-shown; bands 3–4 hidden but tap-and-hold works anytime; bands 5–10 nothing until the kid attempts, then tap-and-hold works (rescue, never a default — CONTEXT.md).
**R5.4** Band changes have **no kid-facing ceremony** (decision 2026-07-28: the "¡Más inglés!" celebration is cut) — the dialogue simply arrives more English. The fade itself is the tell; the current band is always visible in the debug overlay for the demo driver.

---

## 6. Skill graph

One JSON file + ~100 lines of TypeScript. Live, not mocked: the demo path reads and writes it — **in memory only; nothing persists past refresh**. Visual references: [docs/skill-graph.html](./docs/skill-graph.html) (nodes + edges), [docs/architecture.html](./docs/architecture.html) (update loop, queries, scaling).

### 6.1 Node schema

```json
{ "id": "g_sh", "type": "grapheme", "label": "sh → /ʃ/",
  "prereqs": ["g_cvc"], "confusion": true,
  "mastery": 0.0, "lastSeen": null, "attempts": [] }
```

### 6.2 The 25 MVP nodes (⚑ = Spanish-L1 confusion set)

**Graphemes (12):** g_a /æ/ ⚑ · g_i short /ɪ/ ⚑ · g_eou short e/o/u · g_cvc CVC blending (pre: g_a, g_i, g_eou) · g_sh /ʃ/ ⚑ (pre: g_cvc) · g_ch /tʃ/ ⚑ (pre: g_sh) · g_th /θ/ ⚑ (pre: g_cvc) · g_vb v-vs-b ⚑ (pre: g_cvc) · g_z final /z/ ⚑ (pre: g_cvc) · g_scl initial s-clusters ⚑ (pre: g_cvc) · g_ae silent-e a_e (pre: g_cvc) · g_ee ee /iː/ vs /ɪ/ ⚑ (pre: g_i, g_cvc)

**Sight words (6, no prereqs):** s_the · s_said · s_was · s_come · s_of · s_to

**Vocabulary/cognates (7):** v_family (familia) · v_restaurant (restaurante) · v_fruit (fruta) · v_chocolate · v_soup (+ false-friend trap sopa/soap) · v_groc1 milk/eggs/bread (pre: g_cvc) · v_groc2 beans/rice/apples (pre: g_cvc)

### 6.3 Update rule

- On attempt: `mastery = 0.7·mastery + 0.3·result` (result ∈ {0,1}). ≈3 consecutive passes to master a node from the middle; a miss costs about one pass.
- **Asymmetric multi-node credit:** a *pass* on a word credits **every node the word contains** (reading "fish" credits g_i, g_sh, g_cvc); a *miss* debits **only the frontier target node** — generous credit, precise blame. (Each word ships with its node mapping; the LLM never invents it.)
- No time decay — sessions are single-sitting and nothing persists.

### 6.4 Queries (recomputed before every beat and every loop item)

- **Frontier**: prereqs all ≥ 0.8 ∧ own mastery **< 0.8** — a node stays targeted until actually mastered (no dead zone between "no longer targeted" and "mastered"). Content targets always come from the frontier; a fast kid's frontier moves mid-session, so later beats push while a struggling kid's reinforce.
- **Validator vocabulary** (§8.2): all nodes ≥ 0.8, plus exactly one frontier target per beat.
- **Independence input** (§5).

### 6.5 Debug overlay (demo-driver observability; the kid never sees meters — §11 R11.6)

- **Toggle:** Backspace ×3 within ~600 ms (desktop) · 3-finger triple-tap (touch) · `?debug=1` starts open.
- Translucent panel over the right third; the game keeps running behind it. Contents: the graph rendered live (mastery as fill, frontier ringed, locked dim — same layout as docs/skill-graph.html), current independence band, session seed, last graded event (`"beans" → pass → g_ee +0.14`). When a node crosses 0.8 it flips visibly and its children light up as new frontier.
- Ships polished, not as scaffolding — it is the scaling story on screen.

---

## 7. Deterministic grading

**Hard line: the LLM generates content; it never grades.** ([ADR-0001](./docs/adr/0001-llm-never-grades.md))

Pipeline for spoken input:
1. Browser `SpeechRecognition` (Web Speech API) transcribes the utterance. The recognizer is open, but the *posture* is **known-target matching**: the transcript is only ever compared against the known expected target (+ distractor set where relevant) — open transcription is never surfaced, stored, or interpreted.
2. Transcript → normalize (lowercase, strip punctuation/fillers).
3. Judge = pure function `grade(transcript, target) → {pass, matchedWord}` via token-level fuzzy match (normalized Levenshtein per word, threshold 0.65 — forgiving; the fiction absorbs the rest). Same inputs, same grade, every time.

**R7.1** The judge itself is pure and instant (<100 ms post-transcription): no LLM, no additional network beyond the recognizer.
**R7.2** Accent is never a scoring input. Match thresholds are calibrated on word identity, not phonetic precision.
**R7.3** Tap grading and string grading (magnets) are trivially deterministic; same principle, same logging.
**R7.4** Every grade writes to nodes per the credit rule (§6.3), with `(nodeId, result, timestamp)` appended to attempt history.
**R7.5** The mic and recognizer are hard requirements, gated at the title screen (R3.4). There is no degraded mic mode; primary target is desktop Chrome (§9).

---

## 8. Content pipeline

### 8.1 Runtime LLM

- Model: `claude-haiku-4-5`, structured output (JSON beat schema). Parse tolerantly — the model may wrap JSON in markdown fences; slice first `{` to last `}`.
- **Story bible** (family, voices, humor register, warmth) + beat templates are authored constants. The LLM fills slots; it never invents structure.
- **Build deliverables (agent-authored during implementation, human-reviewed after):** the story bible, the beat JSON schema + templates, per-word node mappings (§6.3), the ambient house audio loop (R8.4.3), and the baby babble clips (§12).
- Prompt inputs: beat template, frontier target node, validator vocabulary, independence band rule set, session word history (misses to resurface), seed.
- **Thin proxy is MVP:** a minimal Node server holds all three API keys (Anthropic, ElevenLabs, image-generation R4.2.4) and exposes three routes (`/generate`, `/tts`, `/image`). Keys never ship to the browser (a web bundle is public source). No auth for demo; rate-limit by IP.

### 8.2 Decodable-text validator

Deterministic gate: every generated sentence must use only graphemes/words from mastered nodes + the single frontier target. Reject → regenerate until one passes (the living scene waits, R8.4.3). This is what makes generated text *readable*, not plausible-looking.

### 8.3 Voice (ElevenLabs, runtime)

- Every character line is TTS'd at runtime via ElevenLabs (Flash tier), one distinct voice per character; es-MX for Spanish lines, en-US for English.
- **Voice casting:** free-tier premades — Mamá=Sarah, Papá=Chris, Abuela=Bella, Baby=Lily (ids in [content/voices.json](./content/voices.json)). Sofía has no voice slot — first person, §2 (the reference pack's Sofía lines predate this and are schema examples only). Constraint: ElevenLabs blocks library/"professional" voices via API on the free tier (HTTP 402) — the preferred authentic es-MX voices (stashed in voices.json under `_userPaidPicks_needsElevenLabsStarterPlan`) need a Starter plan; swap + rerun `scripts/generate_voice_samples.sh` if upgraded.
- Same pipeline as text: generated at prefetch time, cached.
- **Audio never degrades** (decision 2026-07-28): there is no synthetic-voice fallback. A late line waits inside the living scene (R8.4.3) until its real audio arrives.

### 8.4 Prefetch / cache / the living-scene wait

**R8.4.1** While beat N plays, beat N+1's text, audio, and image (Abuela photos, R4.2.4) generate (**prefetch**). In loop beats (§4.2, §4.3, §4.4), prefetch is per-item: the next message/word/sentence generates while the current one plays. Prefetch is the primary latency-hider — most of the time nobody waits.
**R8.4.2** Cache key: `(beat, frontierTarget, independenceBand, seed)` for text; `(text, voice, lang)` for audio; `(word, seed)` for images. Hit = instant.
**R8.4.3** **The living-scene wait (decision 2026-07-28: there is no fallback content — canned placeholders never masquerade as the live system).** When content is genuinely late, the *fiction* waits: character idle animations (Mom rummages in a drawer, Sofía hums, the baby chews the book) plus a looped ambient house bed (rustling, clinking — whatever stock loop is easiest to source). No spinner, no progress UI — honest latency absorbed into a living scene. Failed calls retry silently (~2×, backoff).
**R8.4.4** **Hard-fail off-ramp:** if the pipeline is truly dead (network down, API hard error after retries), one gentle kid-appropriate end-state — "La familia está durmiendo... come back soon" — warm illustration, no error language. This is the single visible end-state the no-error rule (R11.4) permits, unavoidable once canned content is off the table.
**R8.4.5** Pre-warm before demo: one full playthrough populates caches with *real generated content* (warming is caching, not canning). Warmed ≠ hardcoded — a second playthrough with a fresh seed proves it.


---

## 9. Tech stack

| Layer | Pick |
|---|---|
| Target | **Desktop Chrome** (blessed demo target), landscape, fixed 1280×800 logical composition, fill-width with vertical bleed per R3.11; tablet = should-work/untested |
| App shell | TypeScript + Vite; React for chrome/UI overlays (menus, message thread, debug overlay) |
| Scene rendering | **Inline SVG in the DOM** — the design mocks' SVG layers used near-verbatim; scene root scaled to fill viewport width with vertical background bleed (R3.11); React overlays on top. No canvas/WebGL engine |
| Speech | Web Speech API (`SpeechRecognition`); grading posture per §7; mic is a hard gate (R3.4) |
| Persistence | None. In-memory state, seeded from bundled `demo-state.json` each session; refresh = reset |
| Animation | CSS keyframes / Web Animations API on SVG layer groups — **transform and opacity only** (compositor-composited); never animate paint/layout properties or anything inside a filtered subtree; waveforms and meters drawn programmatically |
| Content | Anthropic API (Haiku-class) via thin proxy, structured output |
| Voice | ElevenLabs API via thin proxy (runtime); no synthetic fallback — audio never degrades (§8.3) |
| Proxy | Minimal Node endpoint (holds all three API keys, three routes: `/generate`, `/tts`, `/image`) |
| Art | Hand-built layered SVG scenes (§10) — binding mocks in design/handoff/; layers used as SVG groups directly through the AssetStore seam (no export step on web) |

---

## 10. Art direction

Style: **cozy coloring book, richly lit** — hand-inked warm-brown line, chunky rounded volumes, blush cheeks, oversized heads. Gradients and soft shadows are welcome tools for depth, light, and atmosphere (decision 2026-07-29) — the ink outline remains the non-negotiable signature that keeps richness from drifting generic. No 3D rendering. Build note: shadows/glows live on the layer of the object that casts them, so they move together under parallax. Tone refs: Coco (multigenerational Mexican family warmth), Cleo & Cuquín (kid + baby energy).

- **Line rules:** ink #6F4B35 only — 9–10 px silhouettes, 6–7 px interior lines, round caps, **clean confident curves** (no hand-shake/wobble effects; decision 2026-07-28).
- **Pipeline:** characters and room scenes are hand-built layered SVG (the binding mocks) — character consistency comes from the mocks' drawn cast (see design/handoff/); rooms are wide plates decomposed into §3.8 depth layers, used as SVG groups directly (no rasterization); animation is transform/opacity loops on the layer groups (bounce, slide, scale, parallax).
- **First-person staging:** rooms are drawn facing the camera with characters addressing the viewer; Sofía exists on screen only as hands and held objects (list, basket, magnets, book) entering from the bottom of frame — her hands get the same ink-line treatment, red sleeve cuff as her signature.
- **Skin tones (decision 2026-07-29):** family base **#D7AB87** (Sofía's hands, Mom, Dad, Abuela, wall-photo faces); the baby one step lighter, **#E4C29F**.
- **Cast look:** Baby brother — bald, onesie (Cuquín energy). Mom, Dad, Abuela — Coco-warm, distinct silhouettes, blush always.
- **Palette:** cream grounds (#FFFAF0 / #FDF3E3), ink #6F4B35, action terracotta #E0674A (the one primary action per screen, always ink-outlined); each room owns a hue under the same warm ink line (living room coral, kitchen butter-yellow, store mint, bedroom lavender).
- **Binding mocks exist (2026-07-29):** four high-fidelity screens — Title, Living Room, Fridge, Bedroom — produced against §3.1 and this section, delivered as layered SVG/HTML in [design/handoff/](./design/handoff/) (see its README for tokens, states, and the iPad bleed rule). These supersede the archived third-person exploration in `docs/archive/` (palette/tone reference only).
- **MVP asset rule: the design mocks are the art.** Scenes are built from the handoff mocks' SVG layers directly (they are production-grade vector art); no separate asset-export step exists on web. Keep each scene's layers as separable SVG groups behind a single `AssetStore` seam so future art revisions swap groups without touching logic.
- **Type:** Baloo 2 (self-hosted woff2; SIL OFL — download the font files during the build) for everything in-game; fall back to a rounded system stack if unavailable; reading text ≥ 40 px at tablet size.

---

## 11. Non-functional requirements

- **R11.1** Grade feedback < 100 ms after transcription; transcription end-of-utterance < 1 s.
- **R11.2** Beat transition < 300 ms on cache hit; prefetch hides generation latency entirely (a 7-year-old will not wait 4 s).
- **R11.3** The game is online-only: LLM, TTS, and the recognizer are live dependencies; the mic is a hard requirement gated at the title (R3.4). Latency surfaces only as the living-scene wait (R8.4.3); total pipeline death surfaces only as the off-ramp (R8.4.4). There is no offline mode.
- **R11.4** No error states, spinners, or red X anywhere in kid-facing UI.
- **R11.5** No accounts, no analytics, no PII, nothing persisted — all state is in-memory per session.
- **R11.6** No kid-facing meters — no XP, bars, or scores. Progress surfaces only as fiction: fridge notes, the Abuela thread, and the game getting more English around her. Mastery numbers exist only in the debug overlay.

---

## 12. Demo (~5–6 min)

One continuous story: Title (¡Jugar!, mic permission) → Living room (Abuela loop, 2–3 exchanges) → Fridge (Dad's magnet loop, 1–2 notes) → Bedroom loop (2–3 pages) → "Buenas noches."

Beats to hit: debug overlay flash (5 s — catch a node flipping mastered and the band climbing), a refresh-and-replay moment proving every story is generated fresh, the visible Spanish→English fade exchange-over-exchange. **Demo-driver tip:** deliberately miss one Abuela word — the miss triggers "¿Cómo, mija?", the grace, and seeds the bedtime sentence (the session's best material). Cut order if behind: shorten the loops. Never cut Abuela or the baby.

**Demo starting state:** every session boots from the bundled mid-progress learner state ([content/demo-state.json](./content/demo-state.json)): CVC + grocery/sight basics mastered, frontier at the Spanish-L1 confusion set, **headline frontier nodes (g_sh, g_ee) warm-seeded to ~0.45** so ~3 passes flip them to mastered *during* the playthrough (child nodes unlock live on the overlay), deeper confusion-set nodes cold. Band starts at 3 (R5.3). Baby babble clips are a build deliverable — generate via ElevenLabs (audio never degrades, §8.3; they are fiction assets like any sprite, not fallback content).

