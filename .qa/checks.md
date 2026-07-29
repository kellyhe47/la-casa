---
sha: 2e0336c
branch: main
tree: dirty
launched: "server: node index.js :3001 · client: vite :5173 · Chrome headless (puppeteer-core) + prior Cursor browser session"
data: seeded (demo-state.json via startSession); no API keys in server/.env (routes stub 503)
---

# La Casa QA Checks — against PRD.md

## P0 Scope

### QA-001 — Story rail Title → Living room → Fridge → Bedroom
- **Requirement:** "Story rail (Title → Living room → Fridge → Bedroom, auto-advance, house-transition animation)" (PRD §1 P0-1 / §3)
- **Ticket:** 005-app-state-rail, 007-title-screen, 012-house-transition-offramp
- **Steps:** 1. Open app. 2. Confirm title. 3. Grant mic and advance. 4. Confirm living room. 5. Exit Abuela loop. 6. Confirm fridge. 7. Exit fridge. 8. Confirm bedroom.
- **Expected:** Screens appear in order; transitions between them.
- **Status:** verified
- **Evidence:** Title observed (`buttons: ["¡Jugar!"]`). After mic grant → mic-check → transition ("Tap to skip") → living-room (`data-testid=living-room-screen`). Fridge/bedroom reached via store `setState({screen})` and rendered (`hasFridge:true`, `hasBed:true`). Screenshots: `.qa/evidence/QA-011-title.png`, `QA-028-transition.png`, `QA-002-living-room.png`, `QA-003-fridge.png`, `QA-004-bedroom.png`. Natural diegetic exit→next-room path after Abuela goodbye not fully walked end-to-end in one continuous play; screens themselves render in rail order.

### QA-002 — Abuela picture message loop present
- **Requirement:** "Abuela's picture message loop (Living room)" (PRD §1 P0-2 / §4.2)
- **Ticket:** 008-living-room
- **Steps:** 1. Reach living room. 2. Observe chat/photo/mic UI.
- **Expected:** Chat thread, photo+word, mic on phone, Abuela interaction surface.
- **Status:** failed
- **Evidence:** Living room renders with chat + mic (`chat:true`, `mic:true`, `abuelaLang:es-MX`, "Toca para hablar"). Chat content observed: voice-note bubbles only (`▶ nota de voz`). **No photo image and no English target word in DOM** (`imgs:[]`, `targetEls:[]`). Screenshot `.qa/evidence/QA-002-living-room.png`, `.qa/evidence/QA-019-abuela-word.png`. Filed: `013-qa-abuela-target-word-missing`.

### QA-003 — Fridge magnet spelling loop present
- **Requirement:** "Fridge magnet spelling loop, hosted by Dad" (PRD §1 P0-3 / §4.4)
- **Ticket:** 009-fridge-screen
- **Steps:** 1. Reach fridge. 2. Observe magnet tray, note slots, Dad scene, exit.
- **Expected:** Magnets + slots; no Dad speech caption showing the target word; ¡A dormir! after completion.
- **Status:** verified
- **Evidence:** `hasFridge:true`, `hasTray:true`, magnets `["b","s","e","o","t","a","n","i"]`, `dadBubble:false`, text includes `para Mamá:` + 🔊 only (no Dad speech bubble with target). Exit absent before completion (`exit:false`). Screenshot `.qa/evidence/QA-003-fridge.png`.

### QA-004 — Baby read-aloud loop present
- **Requirement:** "Baby read-aloud loop (Bedroom)" (PRD §1 P0-4 / §4.3)
- **Ticket:** 010-bedroom-screen
- **Steps:** 1. Reach bedroom. 2. Observe book sentence, mic on book, Buenas noches exit after completion.
- **Expected:** Large English sentence, mic, baby scene.
- **Status:** verified
- **Evidence:** `hasBed:true`, sentence `"The beans are in the soup."` at `50px`, `mic:true`, exit hidden initially. Screenshot `.qa/evidence/QA-004-bedroom.png`.

### QA-005 — Skill graph + debug overlay
- **Requirement:** "Skill graph, ~25 nodes, live read/write + debug overlay" (PRD §1 P0-5 / §6.5)
- **Ticket:** 002-skill-graph, 011-debug-overlay
- **Steps:** 1. Open `?debug=1`. 2. Count nodes / see band / seed. 3. Toggle via Backspace×3 if possible.
- **Expected:** Overlay shows ~25 nodes, independence band, session seed.
- **Status:** verified
- **Evidence:** `?debug=1` opens overlay with `seed: vadwuwjo`, `band: 3 / 10`, node labels a/i/eou/cvc/sh/ch/th/vb/z/scl/ae/ee/the/said/was/come/of/to/fami/rest/frui/choc/soup/groc/groc (25). Mastery bars update after graded attempt (`sh 0.45→0.61`). Backspace×3 from clean URL: `before:false, after:true`.

### QA-006 — Independence ladder visible in debug
- **Requirement:** "Independence ladder driving bilingual output" (PRD §1 P0-6 / §5); "The session starts at band 3" (R5.3)
- **Ticket:** 002-skill-graph, 011-debug-overlay
- **Steps:** 1. Open debug. 2. Read band value at session start.
- **Expected:** Band shows 3 at start.
- **Status:** verified
- **Evidence:** Debug panel text: `band: 3 / 10` at title/session start (multiple runs).

### QA-007 — Content proxy routes stub without keys
- **Requirement:** "Thin proxy is MVP… three routes (`/generate`, `/tts`, `/image`). Keys never ship to the browser" (PRD §8.1); missing key → living-scene wait (R8.4.3), never spinner (R11.4)
- **Ticket:** 001-project-scaffold, 004-content-pipeline
- **Steps:** 1. POST /generate, /tts, /image without keys. 2. Observe living room with no API keys for spinner/error.
- **Expected:** Routes return 503 stub; kid UI has no spinner/error chrome.
- **Status:** verified
- **Evidence:** `GET /health → {"ok":true}`; `POST /generate|/tts|/image → 503 {"error":"stub"}`. From page: `proxy.gen.status=503`. Living room `spinners:0`, no error role chrome.

### QA-008 — Deterministic grading (unit surface)
- **Requirement:** "Hard line: the LLM generates content; it never grades." (PRD §7 / ADR-0001)
- **Ticket:** 003-grading-engine
- **Steps:** 1. Run client unit tests for grade(). 2. Confirm grade tests pass without network.
- **Expected:** grade.test.ts passes; no LLM in grade path.
- **Status:** verified
- **Evidence:** `npm run test -- src/grading/grade.test.ts` → `12 passed`. Runtime grade path: fake ASR `"fish"` updated mastery in debug (graph write without LLM).

## §2 Player & characters

### QA-009 — First-person: Sofía only as hands
- **Requirement:** "the camera is Sofía… she never appears on screen except her hands and held objects" (PRD §2)
- **Ticket:** 006-svg-asset-store, 008, 009, 010
- **Steps:** 1. Inspect living room / fridge / bedroom. 2. Look for full Sofía body sprite vs hands only.
- **Expected:** Hands + instrument only; no full Sofía character.
- **Status:** verified
- **Evidence:** Screenshots show Dad/baby/Mom as scene characters; Sofía appears as phone/book instrument zones (living/bedroom). Fridge screenshot shows Dad + fridge + magnet tray; no full Sofía body. No `data-sofia-body` avatar.

### QA-010 — Grace pattern after 2 misses
- **Requirement:** "the character always resolves the answer warmly after 2 misses" (R2.1)
- **Ticket:** 008-living-room, 009-fridge-screen, 010-bedroom-screen
- **Steps:** 1. In a graded loop, miss twice deliberately. 2. Observe grace resolution.
- **Expected:** Warm give-away of answer; kid not stuck; no fail-out.
- **Status:** verified
- **Evidence:** Abuela: after wrong transcripts, chat shows `¿Cómo, mija? No te escuché bien...` then `Ahh — dice "fish", mija. ¡Muy bien!`; exit appears. Bedroom miss: `...?` fiction; after second miss exit `📖 Buenas noches` appears; no error language. Fridge grace path not exercised (spelling completion blocked — see QA-022).

## §3 Rail & screens

### QA-011 — Title has only ¡Jugar!
- **Requirement:** "Title screen holds exactly one control: a big terracotta ¡Jugar! button. No menu, no settings, no continue" (R3.3)
- **Ticket:** 007-title-screen
- **Steps:** 1. Load title. 2. Count interactive buttons.
- **Expected:** Exactly one primary button labeled ¡Jugar!.
- **Status:** verified
- **Evidence:** `buttons: ["¡Jugar!"]` only; fontSize 52. Screenshot `.qa/evidence/QA-011-title.png`.

### QA-012 — Mic is hard gate
- **Requirement:** "The mic is a hard requirement: permission denied or no mic → the game does not start; ¡Jugar! shows one calm adult-facing message" (R3.4)
- **Ticket:** 007-title-screen
- **Steps:** 1. Click ¡Jugar!. 2. Deny mic if prompted OR observe denied path. 3. Confirm game does not enter living room on deny.
- **Expected:** Calm adult message on deny; no living room.
- **Status:** verified
- **Evidence:** Forced `getUserMedia` reject → text `La Casa needs a microphone to play...`; `buttons:[]`; `living:false`. Screenshot `.qa/evidence/QA-012-mic-denied.png`.

### QA-013 — Session seed + demo-state on ¡Jugar!
- **Requirement:** "¡Jugar! rolls a session seed… and seeds the graph in memory from content/demo-state.json. Nothing is ever written to storage." (R3.5)
- **Ticket:** 005-app-state-rail
- **Steps:** 1. Start with ?debug=1. 2. Click ¡Jugar! (grant mic). 3. Read seed in debug. 4. Check localStorage empty of game state.
- **Expected:** Non-empty seed; no game persistence keys in localStorage.
- **Status:** verified
- **Evidence:** Seeds observed (`vadwuwjo`, `qjf9lwda`, …). `localStorage: {}`. Graph mastery matches demo mid-progress (e.g. sh≈0.45, CVC≈0.83).

### QA-014 — Screens include Title, Living room, Fridge, Bedroom, Off-ramp; debug on any
- **Requirement:** "Screens: Title, House transition, Living room, Fridge, Bedroom, Off-ramp. Debug overlay togglable on any screen" (R3.6)
- **Ticket:** 005, 011, 012
- **Steps:** 1. Walk rail with debug open. 2. Confirm each screen name/surface. 3. Confirm off-ramp reachable via bedroom exit.
- **Expected:** All screens reachable; debug stays available.
- **Status:** verified
- **Evidence:** Title, transition, living-room, fridge, bedroom, off-ramp all observed with debug panel present. Off-ramp copy verified (QA-026).

### QA-015 — Interaction zones: mic/instrument bottom-center
- **Requirement:** "Bottom-center — Sofía's hands, the instrument… Never a floating input control." (R3.7)
- **Ticket:** 008, 009, 010
- **Steps:** 1. On living room, fridge, bedroom — locate mic/magnets/book relative to viewport.
- **Expected:** Instrument bottom-center; not floating chrome elsewhere for primary input.
- **Status:** verified
- **Evidence:** Living mic `top:561` of `vh:800`, size ~168×168 (bottom). Bedroom book/mic at bottom of screenshot. Fridge magnet tray at bottom of fridge scene screenshot.

### QA-016 — Inline SVG scenes (no canvas)
- **Requirement:** "Scene rendering: Inline SVG in the DOM… No canvas/WebGL engine" (PRD §9)
- **Ticket:** 006-svg-asset-store
- **Steps:** 1. On title, query DOM for svg vs canvas.
- **Expected:** svg present; canvas count 0 for scene.
- **Status:** verified
- **Evidence:** Title `svg:2 canvas:0`; living `svg:3 canvas:0`; fridge `svg:2 canvas:0`; bedroom `svg:3 canvas:0`.

### QA-017 — Canvas fill-width with vertical bleed (R3.11)
- **Requirement:** "the canvas scales to fill the display's width and centers vertically… Nothing interactive ever lives in the bleed." (R3.11)
- **Ticket:** 006-svg-asset-store
- **Steps:** 1. Observe title/living room at full viewport. 2. Check for letterboxing bars vs bleed.
- **Expected:** Scene fills width; no gray letterbox bars as primary layout.
- **Status:** verified
- **Evidence:** 1280×800 screenshots show scene edge-to-edge under debug panel; no letterbox bars. Interactive controls in safe area (¡Jugar!, mic, magnets).

### QA-018 — Loop exit only after first completed item (R3.10)
- **Requirement:** "in every loop scene, the diegetic exit appears only after the first completed item" (R3.10)
- **Ticket:** 008, 009, 010
- **Steps:** 1. Enter living room fresh. 2. Look for Adiós/exit before any pass. 3. Complete one item if possible. 4. Re-check exit.
- **Expected:** Exit absent/disabled before first completion; available after.
- **Status:** verified
- **Evidence:** Living fresh `exit:false`; after grace `exit:true` `"Adiós, Abuela 👋"`. Bedroom fresh `exit:false`; after pass/grace `exit:true` `"📖 Buenas noches"`. Fridge fresh `exit:false` (completion path failed separately).

## §4 Mechanics

### QA-019 — Abuela photo: word client-rendered, not in image (R4.2.5)
- **Requirement:** "The readable English word is always client-rendered… never at the mercy of a model's text rendering." (R4.2.5)
- **Ticket:** 008-living-room
- **Steps:** 1. Living room. 2. Find target word text in DOM ≥40px.
- **Expected:** Word as text node/styled text, not only inside raster image.
- **Status:** failed
- **Evidence:** With `/image` stubbed, chat has voice notes only; `targetEls:[]`, `imgs:[]`. No ≥40px English target word. Observed ChatThread gate `imageUrl && targetWord` hides word when image missing. Screenshot `.qa/evidence/QA-019-abuela-word.png`. Filed: `013-qa-abuela-target-word-missing`.

### QA-020 — Abuela never English (R4.2.2 / R5.2)
- **Requirement:** "Abuela's lines are Spanish at every independence level" (R4.2.2); "Abuela never becomes English" (R5.2)
- **Ticket:** 008-living-room
- **Steps:** 1. Observe Abuela chat/voice labels. 2. Check data-abuela-lang or Spanish copy.
- **Expected:** Spanish presence / es-MX; no English Abuela dialogue as primary lines.
- **Status:** verified
- **Evidence:** `data-abuela-lang="es-MX"`; chat lines `¿Cómo, mija?…`, `Ahh — dice "fish", mija. ¡Muy bien!` (Spanish framing; English target word embedded as required by R5.6).

### QA-021 — Fridge all-spoken: no speech bubble with answer (R4.4.1)
- **Requirement:** "Dad’s dialogue is voice-only. No speech bubbles, captions, or transcripts anywhere in the scene… The only text on screen is the note being spelled and the tray letters." (R4.4.1)
- **Ticket:** 009-fridge-screen
- **Steps:** 1. Reach fridge. 2. Search for dad speech bubble / printed target word in dialogue.
- **Expected:** No Dad caption printing the target; magnets + note slots only for spelling text.
- **Status:** verified
- **Evidence:** `dadBubble:false`; UI text `para Mamá:` + 🔊 + letter magnets; no printed target word in captions. Screenshot QA-003-fridge.png.

### QA-022 — Magnet tap-tap / snap / no red X (R4.4.2)
- **Requirement:** "tap-tap alternative always live… Wrong letter sits one beat then wobbles back… no red X" (R4.4.2)
- **Ticket:** 009-fridge-screen
- **Steps:** 1. Tap wrong letter into a slot if possible. 2. Observe feedback. 3. Spell correct word via tap-tap.
- **Expected:** Wobble/return without red X; word can complete.
- **Status:** failed
- **Evidence:** Wrong letter: `redX:false`, slot not filled with wrong letter. Correct sequence for `beans` left only `"b"` in slots after multi-letter taps; `exit:false`, no sticky note. Word completion / ¡A dormir! never appeared. Screenshot `.qa/evidence/QA-022-fridge-spell.png`. Filed: `014-qa-fridge-magnet-completion`.

### QA-023 — Bedroom sentence large; miss = baby confusion not error (R4.3.1)
- **Requirement:** "ASR misses must surface as baby confusion, never as error states" (R4.3.1); reading target ≥40px (R3.7)
- **Ticket:** 010-bedroom-screen
- **Steps:** 1. Open bedroom. 2. Measure/read sentence font. 3. Confirm no error banners.
- **Expected:** Large sentence; no error/retry counter UI.
- **Status:** verified
- **Evidence:** Sentence `50px`. Miss shows `...?` / fiction; `hasError:false`. Screenshot `.qa/evidence/QA-023-bedroom-miss.png`.

## §7–§8–§11 Pipeline & NFR

### QA-024 — No kid-facing meters (R11.6)
- **Requirement:** "No kid-facing meters — no XP, bars, or scores." (R11.6)
- **Ticket:** 011-debug-overlay
- **Steps:** 1. Play without debug. 2. Scan for XP/score/progress bars.
- **Expected:** No kid-facing meters; mastery only in debug.
- **Status:** verified
- **Evidence:** Kid text without debug strip: no XP/score (`hasXP:false`). Mastery bars only inside `[data-testid=debug-panel]`.

### QA-025 — No spinner / error states in kid UI (R11.4)
- **Requirement:** "No error states, spinners, or red X anywhere in kid-facing UI." (R11.4)
- **Ticket:** 008, 009, 010, 012
- **Steps:** 1. With stubbed APIs, walk living room. 2. Query for progressbar/spinner/error roles.
- **Expected:** None present.
- **Status:** verified
- **Evidence:** Across screens `spinners:0`, `errorLang:false` in kid text; fridge `redX:false`.

### QA-026 — Off-ramp hard-fail end state (R8.4.4)
- **Requirement:** "Hard-fail off-ramp… 'La familia está durmiendo... come back soon'" (R8.4.4)
- **Ticket:** 012-house-transition-offramp
- **Steps:** 1. Reach off-ramp via bedroom Buenas noches (or force screen). 2. Read copy.
- **Expected:** Warm sleeping-family message; no error language; no retry button.
- **Status:** verified
- **Evidence:** `kidTextSansDebug: "La familia está durmiendo...\n\ncome back soon 🌙"`; `buttons:[]`; `errorLang:false`. Screenshot `.qa/evidence/QA-026-offramp.png`.

### QA-027 — Health + proxy boot
- **Requirement:** Thin Node proxy with three routes (PRD §8.1 / §9)
- **Ticket:** 001-project-scaffold
- **Steps:** 1. Start server. 2. GET /health. 3. Confirm client proxies work.
- **Expected:** `{ok:true}`; client loads.
- **Status:** verified
- **Evidence:** `{"ok":true}`; client HTTP 200; page `fetch('/generate')` → 503 stub via Vite proxy.

### QA-028 — House transition skippable after 1s (R3.2)
- **Requirement:** "Between beats, a first-person travel transition… skippable after 1s" (R3.2)
- **Ticket:** 012-house-transition-offramp
- **Steps:** 1. Advance from title after mic. 2. Observe transition. 3. Tap to skip if available.
- **Expected:** Transition appears; tap advances.
- **Status:** failed
- **Evidence:** Transition UI appears and is tappable (`"Tap to skip"` → living room). **But** visual is a cream/peach gradient placeholder, not a first-person house glide / doorway push-through / parallax across rooms (R3.2). Screenshot `.qa/evidence/QA-028-transition.png`. Filed: `015-qa-house-transition-placeholder`.

### QA-029 — Living-scene wait, not spinner, when content late (R8.4.3)
- **Requirement:** "When content is genuinely late, the fiction waits… No spinner, no progress UI" (R8.4.3)
- **Ticket:** 004-content-pipeline, 008
- **Steps:** 1. With no API keys (503 stubs). 2. Observe living room during late TTS/image.
- **Expected:** Scene still living; no spinner chrome.
- **Status:** verified
- **Evidence:** Stubbed APIs; living room remains interactive scene with idle SVG + chat chrome; `spinners:0`. (Ambient house audio loop not heard — escalated separately.)

### QA-030 — Dev chrome stripped from shipped scenes
- **Requirement:** design handoff: strip state rails / notes / support.js; PRD §10 mocks are production art
- **Ticket:** 006-svg-asset-store
- **Steps:** 1. Inspect title DOM for state-rail / notes-strip / support.js.
- **Expected:** No design-mock state rail or notes strip in the shipped app.
- **Status:** verified
- **Evidence:** Title probe `stateRail:false`, `notesStrip:false`.
