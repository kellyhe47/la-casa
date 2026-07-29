# UX Patterns for Children's Literacy Mini-Games (Ages 6-8)

Research notes for **La Casa** — first-person web literacy game, Spanish-speaking Grade 2 (~age 7), landscape 1280x800, touch+mouse. Constraints honored throughout: no error states / red X, no visible scores, feedback in-fiction, one primary action per screen.

Compiled 2026-07-28 from primary sources: Sesame Workshop / Joan Ganz Cooney Center best-practices paper, Nielsen Norman Group children's UX research, MTAGIC (Anthony/Brewer/Hourcade et al.) touchscreen studies, SoapBox Labs voice-UX writing, and app case studies (Duolingo ABC, Khan Academy Kids, Teach Your Monster to Read, Toca Boca/Sago Mini).

---

## 1. Motor skills: touch targets, hit forgiveness, drag

### 1.1 Oversized touch targets
- **Source:** MTAGIC project (Anthony, Brewer, et al., *Int. J. Human-Computer Studies*); NN/g "Design for Kids: Physical Development"; child-UX guidelines (aufaitUX).
- **Guideline:** Kids 7-10 miss ~7 mm (≈48 dp adult-standard) targets ~30% of the time. Use **≥2 cm × 2 cm (~75-80 px at typical density)** targets for children — roughly 2x the adult minimum. Practical floor for our canvas: **≥96 px** interactive elements, hero targets 120-160 px.
- **For La Casa:** shelf items, letter magnets, and the mic button should each be ≥96 px square at 1280x800; the mic (the primary action) closer to 160 px.

### 1.2 Generous spacing + expanded hit areas
- **Source:** Sesame Workshop *Best Practices: Designing Touch Tablet Experiences for Preschoolers* ("hot spots must be large and adequately isolated"); child-UX guides recommend **≥64 px gaps**.
- **Guideline:** Visible art can be smaller than the hit area; pad every hit box invisibly (~20-30% beyond the sprite) and keep ≥64 px between adjacent targets so a sloppy tap can't be ambiguous.
- **For La Casa:** shelf items get invisible padded hit boxes; never place two tappable store items closer than ~64 px edge-to-edge.

### 1.3 Drag is hard — design for "finger-off" recovery
- **Source:** Sesame Workshop (children struggle with "finger-on-screen continuity"; support partial completion); MTAGIC/related studies (only ~30% of 7-8 year olds reliably complete drag-and-drop); NN/g (dragging is the hardest common gesture at this age).
- **Guideline:** For any drag: (a) large grab zones, (b) if the finger lifts mid-drag, the item stays where dropped or eases back gently — never resets the whole task, (c) **snap-to-target with a wide magnetic radius** (accept drops within ~1/3 of the distance to the slot), (d) offer tap-tap as an implicit alternative (tap magnet, tap slot) since taps are near-100% reliable.
- **For La Casa (magnet game):** letters snap magnetically into the next open slot; a dropped-anywhere-near-the-tray letter counts; consider tap-to-place fallback for mouse users too.

### 1.4 Expect accidental & repeated touches
- **Source:** MTAGIC ("Physical dimensions of children's touchscreen interactions"): kids produce holdovers (touching before UI is ready), repeated taps, and rest-of-hand touches.
- **Guideline:** Debounce inputs, ignore touches during transitions without punishing them, and never let a stray second tap cancel an in-flight action.
- **For La Casa:** queue or swallow taps during character speech/animation; a double-tap on the mic must not toggle recording off.

## 2. Layout: prompt vs. objects vs. input affordance

### 2.1 One clear focal action; instructions spoken, not read
- **Source:** Sesame Workshop; NN/g "Kids' Cognition"; Duolingo ABC (icon-based navigation, instructions spoken aloud by characters).
- **Guideline:** Emerging readers can't parse instructional text. Every prompt is **voiced by a character**, with the text (if shown) as reinforcement, and there is exactly one glowing "do this now" affordance.
- **For La Casa:** grandma/shopkeeper speaks every instruction; on-screen text exists only when the text itself is the learning target.

### 2.2 The "thing to read" is separated from the "thing to touch"
- **Source:** Pattern across Endless Alphabet / Teach Your Monster / Duolingo ABC: target word sits in a fixed, high-contrast card (top or center), manipulables sit in a bottom tray or in the scene; the two never overlap.
- **Guideline:** Stimulus zone (word/prompt) stable and non-interactive; response zone (shelf, magnet tray, mic) large and lower/central where hands rest. Don't make the reading target itself a small tap target.
- **For La Casa:** store game — word on a big sign/label card, items on the shelf below; magnet game — audio prompt replayable via a speaker object, empty word slots center, magnet tray at bottom.

### 2.3 Glow/sparkle to signal interactivity after a pause
- **Source:** Sesame Workshop: highlight hot spots with a "glow or sparkle as a time-out after instructions… are read."
- **Guideline:** After the voiced prompt finishes, the primary affordance pulses/sparkles; nothing pulses while the character is talking.
- **For La Casa:** mic button and draggable magnets get a gentle pulse ~1.5 s after the prompt ends.

## 3. Mic / speech input UX for kids

### 3.1 Explicit, characterful listening states
- **Source:** SoapBox Labs "Voice-First Experiences for Kids" (Head of UX): kids need clearly distinct **idle → listening → thinking** states; while "thinking," show that speech is unavailable; return to a still-listening idle so a child who resumes talking is captured.
- **Guideline:** Three visible states: (1) tap-to-talk invite (pulsing mic/character leaning in), (2) actively listening (animated waveform, character's ear/eyes on the kid), (3) processing (character "hmm" pose, brief). Auto-stop after silence; don't require a second tap to end.
- **For La Casa:** make the listener a *character* (grandma cups her ear); waveform reacts to the child's actual volume so they know they're heard.

### 3.2 Misses are never wrong — retry is modeled, not demanded
- **Source:** Duolingo ABC ("corrections are soft… lessons repeat just enough"; reviewers note kid-voice ASR errors can harm confidence — the feature can be disabled); Amira/SoapBox tutors prompt and re-model rather than mark wrong; Teach Your Monster ("soft in encouraging children when they make mistakes… immediate positive responses").
- **Guideline:** On low-confidence ASR: character re-models the word ("¡Casi! Escucha: *ca-sa*. ¿Lo dices conmigo?") and invites one retry; after **2 misses, accept and move on** (credit the attempt) — never loop indefinitely, never show a fail state. Treat ASR uncertainty as *your* problem, not the kid's: when in doubt, accept.
- **For La Casa:** grade generously against the known target; cap retries at 2; grandma always responds warmly to any utterance, even silence ("¡Qué bien escucharte!").

### 3.3 Handle silence and shyness
- **Source:** SoapBox voice-first guidance; general kids voice-UI practice.
- **Guideline:** If no speech in ~5 s of listening, character gently re-invites and models the target herself; offer an escape (character says it "together with" the child). Never an empty error tone.
- **For La Casa:** in the chat game, grandma follows up a silent turn with an easier yes/no voice prompt.

## 4. Feedback patterns

### 4.1 Immediate, character-delivered positive feedback
- **Source:** Khan Academy Kids (Kodi jumps, cheers "yay!" — animated reaction + verbal praise paired); Sesame Workshop ("payoffs should reflect the curricular concept and user choice, include sound effects and visual payoff via animation").
- **Guideline:** Feedback within **<500 ms** of the action; delivered as character animation + voice, 1-3 s long; the payoff should *echo the content* (the bought item animates into the basket; the spelled word's object comes alive), not a generic confetti overlay.
- **For La Casa:** correct shelf pick → item hops into basket, shopkeeper comments using the word; spelled word → object materializes; this is our "score."

### 4.2 No punitive feedback; wrong answers are redirected in-fiction
- **Source:** Khan Academy Kids (gentle neutral "bong," no red X); Toca Boca / Sago Mini philosophy (no scores, timers, game-over — explicitly to remove pressure); Teach Your Monster (mistakes met with encouragement to protect confidence).
- **Guideline:** A wrong tap gets a **neutral in-world reaction** — the wrong item wiggles and the shopkeeper says something diegetic ("¡Eso es la leche! Buscamos el *pan*") — then re-highlights the prompt. Wrong is treated as *information*, delivered instantly (immediate corrective feedback beats delayed for learning), but with zero shame markers (no buzzer, no red, no shake-of-the-screen).
- **For La Casa:** already a hard constraint — this research confirms it matches the strongest practitioners.

### 4.3 Rewards exist but are collection/fiction-based, not scores
- **Source:** Teach Your Monster (unlock accessories/powers, not points); Sesame Workshop (payoffs tied to choice); Toca Boca (intrinsic play).
- **Guideline:** If persistent rewards are wanted, use **collectible fictional objects** (things bought at the store appear in the house; grandma's photos fill an album) rather than stars/XP/meters.
- **For La Casa:** the house itself is the progress display — items accumulate diegetically.

## 5. Attention & pacing

### 5.1 Short activity units, kid-controlled advance
- **Source:** NN/g children's UX report (6-8s lose patience fast; complex navigation frustrates 5-7s); Duolingo ABC & Khan Academy Kids lessons run ~3-5 min composed of ~30-60 s micro-tasks.
- **Guideline:** One mini-game round = **30-90 s**; a session beat = 3-5 rounds (~5 min). Advance on the kid's action (tap the door, tap "next" object) rather than hard auto-advance — but auto-advance *after the celebration finishes* is fine since the round is complete; never auto-advance past something the kid must read/hear.
- **For La Casa:** each store list = 3-4 words; each magnet word ≤5 letters; grandma chat = 2-3 exchanges.

### 5.2 Idle recapture: escalate gently, then model the answer
- **Source:** Sesame Workshop (glow/sparkle timeout after instructions); common pattern in Teach Your Monster / Khan Kids: character re-prompts.
- **Guideline:** Stall ladder — **~5 s:** primary affordance pulses; **~10 s:** character repeats/rephrases the prompt and points/looks at the target; **~20 s:** character partially demonstrates (first letter slides itself, shopkeeper glances at the right shelf item); never a timeout that ends the round.
- **For La Casa:** implement as a per-screen `idleHintAt: [5, 10, 20]` ladder with the level-3 hint doing part of the work.

### 5.3 Replayable prompts
- **Source:** Sesame Workshop; universal in literacy apps (speaker icon replays the word).
- **Guideline:** The audio prompt is always re-triggerable by tapping the *speaker of the prompt* (character or in-world object), unlimited, never counted against the kid.
- **For La Casa:** tap grandma / the shopkeeper / a radio to re-hear the target word.

## 6. Diegetic UI in kids' games

- **Source:** Fagerholt & Lorentzon's diegetic/spatial/meta/non-diegetic framework (game UI literature); practitioner writing (Native UI, nastyrodent.com): diegetic UI cuts context-switching and extraneous cognitive load and gives contextual feedback. Toca Boca/Sago Mini apps are near-100% diegetic (no HUD at all); Endless Alphabet's letters are the characters.
- **Guideline:** For pre/emerging readers, diegetic beats HUD because it needs no literacy and no UI-convention knowledge: progress = the shopping basket filling; the input tray = a fridge door with magnets; the mic = a character listening; navigation = walking through doors. Keep truly non-diegetic chrome to at most one element (e.g., a parent-gear hidden behind a hold-gesture, per Sesame's "parent mode" recommendation).
- **For La Casa:** all four mini-games can be fully diegetic: shopping list on paper in-scene, fridge magnets, grandma's phone chat framed as her actual phone, mic as "talking to" a character.

---

## Top 10 rules for our screens

1. **≥96 px hit areas** (hero/mic ≥160 px), ≥64 px between targets, invisible hit-box padding beyond sprites.
2. **Prefer tap over drag**; where drag is required (magnets), use wide magnetic snap, keep progress on finger-lift, support tap-tap fallback.
3. **One glowing primary action per screen**, pulsing only after the spoken prompt finishes.
4. **Every instruction is voiced by a character**; on-screen text appears only when reading it *is* the task.
5. **Separate stimulus and response zones**: word/prompt fixed and non-interactive up top/center; touchables in scene or bottom tray.
6. **Mic has 3 visible character-driven states** (invite / listening with live waveform / thinking); auto-stop on silence; child never has to tap to end.
7. **Grade speech generously; max 2 retries then credit-and-continue**; the character re-models the word instead of flagging an error.
8. **Wrong taps get neutral in-fiction redirection** (item reacts, character names it, restates target) — no buzzer/red/shake, ever.
9. **Feedback in <500 ms, celebration 1-3 s, content-relevant** (the item/word itself animates); progress shown only as diegetic collection (basket, house, photo album).
10. **Idle ladder at 5/10/20 s**: pulse → character re-prompts and points → character partially demonstrates; rounds never time out or fail.

## Sources

- Sesame Workshop / Joan Ganz Cooney Center, *Best Practices: Designing Touch Tablet Experiences for Preschoolers* — https://joanganzcooneycenter.org/wp-content/uploads/2020/02/SesameWorkshop-2012.pdf
- Anthony, Brewer et al., MTAGIC project, *Physical dimensions of children's touchscreen interactions* — https://www.sciencedirect.com/science/article/abs/pii/S1071581918302441
- Vatavu et al., *Touch interaction for children aged 3 to 6* — https://www.sciencedirect.com/science/article/abs/pii/S1071581914001426
- TIDRC framework, ACM IDC 2019 — https://dl.acm.org/doi/10.1145/3311927.3323149
- NN/g, *Design for Kids: Physical Development* — https://www.nngroup.com/articles/children-ux-physical-development/ ; *Kids' Cognition* — https://www.nngroup.com/articles/kids-cognition/
- SoapBox Labs, *Voice-First Experiences for Kids* — https://www.soapboxlabs.com/blog/voice-first-experiences-for-kids/
- Duolingo ABC reviews — https://www.commonsense.org/education/reviews/duolingo-abc-learn-to-read ; https://www.educationalappstore.com/app/duolingo-abc
- Khan Academy Kids guide — https://www.edu.com/blog/understanding-khan-academy-kids-a-complete-guide-for-k-2-teachers-and-parents
- Teach Your Monster to Read reviews/case studies — https://www.phonics.org/teach-your-monster-to-read-review/ ; https://www.teachyourmonster.org/teachers-area/case-studies
- Toca Boca / Sago Mini design philosophy — https://sagomini.com/our-story/ ; https://screenwiseapp.com/media/sago-mini-world-game
- Diegetic UI framework (Fagerholt & Lorentzon) overviews — https://nativeui.substack.com/p/diegetic-interfaces ; https://nastyrodent.com/diegetic-and-non-diegetic-ui/
- EdSurge on voice reading tutors (SoapBox/Amira) — https://www.edsurge.com/news/2023-03-07-schools-are-using-voice-technology-to-teach-reading-is-it-helping
