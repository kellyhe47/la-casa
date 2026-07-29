---
sha: 73370fb
branch: main
tree: dirty          # uncommitted: living-room design fixes, AbuelaArt.tsx, app frame, transition skip text — this report describes code that exists nowhere else
launched: node server/index.js (:3001) + vite (:5173, pid 44857), Chrome (Cursor IDE browser), viewport 1920×1080
data: seeded (demo-state.json via startSession)
run: 2 (post QA-run-1 fixes 013–015 + design-feedback fixes)
spec: PRD.md + design/handoff/README.md (high-fidelity mocks)
note: mic input driven via an injected SpeechRecognition stub feeding synthetic transcripts — the app's own grading/flow code ran unmodified; real-mic behavior remains a human check
---

# La Casa QA Checks — run 2 — PRD.md + design/handoff

## A. Regression of run-1 failures (tickets 013–015)

### QA-101 — Abuela target word + picture visible with /image stubbed
- **Requirement:** "The readable English word is always client-rendered (Baloo, ≥40 px, the reading target)" (PRD R4.2.5); photo message shows item (§4.2)
- **Ticket:** 013-qa-abuela-target-word-missing
- **Steps:** 1. No OPENAI_API_KEY. 2. Enter living room. 3. Inspect chat for word text ≥40px and an illustration.
- **Expected:** Word as DOM text ≥40px; polaroid shows drawn SVG illustration fallback.
- **Status:** verified
- **Evidence:** DOM probe: `bigWords: [{w:"fish", size:"44px"}]`, `imgs: 0`, `chatIllustrationSvgs: 2` — word client-rendered at 44px with SVG fish illustration in the polaroid frame. Screenshot: `.qa/evidence/QA-101-living-room-chat.png`. Note: the SVG stand-in itself conflicts with R8.4.3 no-fallback-content — see QA-117.

### QA-102 — Fridge magnet tap-tap completes a word; exit appears
- **Requirement:** "a tap-magnet-then-tap-slot fallback works everywhere drag does" (PRD §3.9); "diegetic exit appears only after the first completed item" (R3.10)
- **Ticket:** 014-qa-fridge-magnet-completion
- **Steps:** 1. Reach fridge. 2. Spell "fish" via tap magnet → tap slot ×4. 3. Observe note stick + ¡A dormir!.
- **Expected:** All slots fill; sticky note appears; exit button appears.
- **Status:** verified
- **Evidence:** Tap-tap log: `["f->slot0 now:f","i->slot1 now:i","s->slot2 now:s","h->slot3 now:h"]`; after completion `exitPresent: true`, completed note "para Mamá: fish" stuck on fridge door at (750,269), tray reset with next word's letters. Screenshot: `.qa/evidence/QA-102-fridge-note-stuck.png`.

### QA-103 — House transition is SVG house glide, no "Tap to skip" text
- **Requirement:** "the camera glides through the house… no taps required" (R3.2); user amendment: no "Tap to skip" copy
- **Ticket:** 015-qa-house-transition-placeholder
- **Steps:** 1. Advance from title. 2. Sample DOM every 500ms through the transition. 3. Confirm auto-advance.
- **Expected:** SVG scene; no skip copy; auto-advances to living room.
- **Status:** verified
- **Evidence:** 500ms samples: title (`twinkle` keyframes) → transition (`ts-bg-pan` SVG animation, ~2.5s) → living room (`lr-browRaise`). `tapSkip: false` in all 14 samples. Same transition observed again between living room→fridge and fridge→bedroom.

## B. Design-handoff fidelity

### QA-104 — App stage: 1280×800 composition framed, nothing clipped
- **Requirement:** "Logical canvas: 1280×800 (16:10)… Scale-to-fill width, center vertically" (handoff Canvas); user amendment: black rounded frame, whole app visible
- **Ticket:** none
- **Steps:** 1. Load app at 1920×1080. 2. Measure stage element.
- **Expected:** 16:10 stage with black rounded border; nothing clipped.
- **Status:** verified
- **Evidence:** Stage rect 1280×800 (ratio 1.600), `border: 8px solid rgb(0,0,0)`, `borderRadius: 20px`, top 140 / bottom 940 inside 1080 viewport — fully visible. ¡Jugar! bottom 906 < stage bottom 940. Stage re-letterboxed correctly after a mid-run viewport resize (bedroom screenshot).

### QA-105 — Title: ¡Jugar! styling and single control
- **Requirement:** "¡Jugar! button: Baloo 2 800, 52px, #FFFAF0 on #E0674A, 8px ink border, pill… 1.8s scale pulse" (handoff §1); "exactly one control" (PRD R3.3)
- **Ticket:** 007-title-screen
- **Steps:** Probe computed styles + count buttons.
- **Expected:** One button; terracotta; Baloo 800 52px; pulse.
- **Status:** verified
- **Evidence:** `buttonCount: 1`; computed: `"Baloo 2"`, weight 800, 52px, bg rgb(224,103,74)=#E0674A, color rgb(255,250,240)=#FFFAF0, `8px solid rgb(111,75,53)` ink border, radius 40px pill, animation `jugar-pulse 1.8s`. Screenshot: `.qa/evidence/QA-105-title.png`.

### QA-106 — Living room: phone screen white, mic ON phone, no dark layover
- **Requirement:** "#FFFAF0 screen… THE MIC BUTTON: 160px hero, ON the phone" (living-room mock); user amendment: no vignette overlay
- **Ticket:** 008-living-room (design fix, uncommitted)
- **Steps:** Probe for dark panels over the scene; check phone screen fill and mic hit-target.
- **Expected:** No dark overlay; white screen; ~160px mic target.
- **Status:** verified
- **Evidence:** `darkOverlays: 0`; 7 `#FFFAF0` fills in phone SVG; mic button "Micrófono" hit-target exactly 160×160 positioned over the phone screen. Screenshot: `.qa/evidence/QA-101-living-room-chat.png`.

### QA-107 — Living room: chat header has Abuela avatar + presence line
- **Requirement:** "Abuela avatar (curly gray hair, round glasses, blush), presence line" (handoff §2)
- **Ticket:** 008-living-room (design fix, uncommitted)
- **Steps:** Probe chat header.
- **Expected:** Avatar svg next to name; presence text.
- **Status:** verified
- **Evidence:** `headerFound: true`, `headerHasAvatar: true`, header text "Abuela / nota de voz · 0:04". Avatar visible in screenshot `.qa/evidence/QA-101-living-room-chat.png`.

### QA-108 — Living room: voice note bubble with play ▶ + waveform; replay works
- **Requirement:** "voice-note bubbles with play ▶ + waveform" (handoff §2); voice note auto-plays (§4.2)
- **Ticket:** 008-living-room
- **Steps:** Probe bubble structure; click replay.
- **Expected:** Bubble with play + waveform; replay clickable without error.
- **Status:** verified (structure) / audio audibility escalated
- **Evidence:** Voice-note is a 243px-wide button labeled "0:04" containing a play triangle (`playTri: 1`) and a waveform SVG of bars (`waveformSvgs: 1`); replay click produced no page errors. Whether audio is audible cannot be observed headlessly → human checklist. NOTE: with no ELEVENLABS key the audio path uses browser speechSynthesis — see QA-117.

### QA-109 — Fridge: butter-yellow kitchen, note card speaker, no Dad caption
- **Requirement:** "butter-yellow kitchen (#F6D992 wall)… speaker replay button (52px)… Dad's prompt is SPOKEN, never displayed" (handoff §3)
- **Ticket:** 009-fridge-screen
- **Steps:** Probe wall fill, speaker button, absence of target-word dialogue text.
- **Expected:** Yellow scene; speaker button; word only in slots/letters.
- **Status:** verified
- **Evidence:** `#F6D992` fill present in scene SVG; 🔊 speaker button 57×57px (spec 52px — within tolerance, noted); visible text = "para Mamá:" + single letters only, target word never displayed as dialogue. Screenshot: `.qa/evidence/QA-102-fridge-note-stuck.png`.

### QA-110 — Bedroom: lavender scene, sentence 50px, mic on book, Buenas noches exit
- **Requirement:** "sentence, Baloo 2 800 50px #6F4B35… Mic button ON the book spine… 'Buenas noches' button" (handoff §4); exit after first completed item (R3.10)
- **Ticket:** 010-bedroom-screen
- **Steps:** Probe sentence styles; read sentence correctly (stub); check exit gating.
- **Expected:** 50px sentence; mic on spine; exit only after first pass.
- **Status:** verified
- **Evidence:** Sentence "The milk is for the baby." at 50px / weight 800 / rgb(111,75,53)=#6F4B35 on the book. Mic button on the book spine (48×115 hit rect at current scale). Before first pass `hasBuenas: false`; after correct read, sentence advanced to "We got the beans at the shop." and "Buenas noches" appeared. Screenshot: `.qa/evidence/QA-110-bedroom.png`.

### QA-111 — Cross-scene: no error states, spinners, or red X anywhere
- **Requirement:** "No error states anywhere… No red X, no toasts, no retry counters" (handoff; PRD R11.4)
- **Ticket:** 008/009/010/012
- **Steps:** Probe `[role=alert]`, `.spinner`, `[role=progressbar]` per screen; inspect screenshots.
- **Expected:** None.
- **Status:** verified
- **Evidence:** `alerts: 0` on title and living room probes; zero matches on fridge/bedroom text dumps; all 6 screenshots show no error UI. Misses surfaced only as fiction ("¿Cómo, mija? No te escuché bien...").

### QA-112 — Inline SVG scenes; dev chrome stripped
- **Requirement:** "Everything is inline SVG" (handoff Assets); state rails/notes strips are dev-only chrome
- **Ticket:** 006-svg-asset-store
- **Steps:** Count svg/canvas per screen; search for rail text.
- **Expected:** Inline SVG only; no mock dev chrome.
- **Status:** verified
- **Evidence:** Title `svgs: 2, canvases: 0`; living room `svgs: 7`; fridge/bedroom scene SVGs present (fr-steam/bd-* keyframed groups). `devChrome: null` — no state-rail or notes-strip text anywhere.

## C. Core PRD rail

### QA-113 — Rail order Title → Living room → Fridge → Bedroom → off-ramp
- **Requirement:** "Title (¡Jugar!) → Living room → Fridge → Bedroom" (PRD §3); off-ramp end state (§3 table, R8.4.4 copy)
- **Ticket:** 005-app-state-rail
- **Steps:** Walk full rail: grace-complete living room → Adiós → spell fish → ¡A dormir! → read sentence → Buenas noches.
- **Expected:** Screens in order; diegetic exits gate on first completed item.
- **Status:** verified
- **Evidence:** Full rail traversed in one session: title (`twinkle`) → transition (`ts-bg-pan`) → living room (`lr-*`) → transition → fridge (`fr-steam`) → transition → bedroom (`bd-*`) → end screen "La familia está durmiendo... / come back soon 🌙" with zero buttons. Exits appeared only after first completed item on all three loops.

### QA-114 — Debug overlay: ~25 nodes, band 3 start, seed
- **Requirement:** "the graph rendered live… current independence band, session seed" (PRD §6.5, R5.3)
- **Ticket:** 011-debug-overlay
- **Steps:** Open ?debug=1; probe overlay.
- **Expected:** 25 nodes, band 3, non-empty seed.
- **Status:** verified
- **Evidence:** Overlay shows seed (`ahwhoi78`, later sessions `qh40s14o`, `itkpeacx` — new seed per session), "band: 3 / 10", skill graph with 25 mastery rows and mastered/frontier/locked legend; g_sh and g_ee warm-seeded at 0.45 per §12 demo state. Band dropped 3→2 live after two misses (ladder reacting, §5). Screenshot: `.qa/evidence/QA-105-title.png`.

### QA-115 — Proxy health + 3 stub routes
- **Requirement:** "three routes: /generate, /tts, /image" (PRD §8.1); missing key → stub
- **Ticket:** 001/004
- **Steps:** curl /health + 3 POSTs without keys.
- **Expected:** {ok:true}; 3× 503 stub.
- **Status:** verified
- **Evidence:** `{"ok":true}`; `generate: 503 {"error":"stub"}`, `tts: 503 {"error":"stub"}`, `image: 503 {"error":"stub"}`; client 200 on :5173.

### QA-116 — Grace pattern: 2 misses → warm resolution (living room)
- **Requirement:** "the character always resolves the answer warmly after 2 misses" (PRD R2.1)
- **Ticket:** 008-living-room
- **Steps:** Feed 2 wrong transcripts ("banana") via speech stub; observe chat.
- **Expected:** In-fiction retry, then warm resolution; no error UI.
- **Status:** verified
- **Evidence:** Miss 1 → "¿Cómo, mija? No te escuché bien..."; miss 2 → "Ahh — dice \"fish\", mija. ¡Muy bien!" — answer revealed warmly, item resolved, "Adiós, Abuela" exit appeared. Screenshot: `.qa/evidence/QA-116-grace-exit.png`.

### QA-117 — Stub path: living-scene wait / off-ramp, no canned content
- **Requirement:** "there is no fallback content — canned placeholders never masquerade as the live system… Failed calls retry silently (~2×, backoff)" (PRD R8.4.3); "Audio never degrades… there is no synthetic-voice fallback" (§8.3); "if the pipeline is truly dead… off-ramp" (R8.4.4)
- **Ticket:** none
- **Steps:** Run full session with all three proxy routes returning 503 stub; observe what content plays.
- **Expected:** Per PRD: living-scene wait → silent retries → off-ramp. No canned words/sentences/images, no synthetic voice.
- **Status:** failed (possibly by-design — owner decision)
- **Evidence:** With /generate, /tts, /image all 503: session played end-to-end with canned content — target word "fish" served twice back-to-back in the living room (identical polaroid+word repeated), fixed bedroom sentences ("The milk is for the baby.", "We got the beans at the shop."), drawn SVG illustration standing in for the runtime-generated photo (R4.2.4), and Abuela audio via browser speechSynthesis. PRD says this path must be living-scene wait → off-ramp instead. Caveat: the illustration + speechSynthesis fallbacks were built in direct response to user feedback ("voice notes are not playing… pictures not showing up") while running keyless, so this may be an accepted keyless-demo mode. Filed as ticket 016 for the owner to adjudicate.
