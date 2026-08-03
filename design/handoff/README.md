# Handoff: La Casa — MVP screens (Title · Living Room · Fridge · Bedroom)

## Overview
La Casa is a first-person web literacy game for a Spanish-speaking 7-year-old (Sofía). The player sees the world through Sofía's eyes; only her hands and held objects appear. This package covers the four P0 screens on the story rail: **Title → (house transition) → Living Room (Abuela voice-note loop) → Fridge (Dad's magnet spelling loop) → Bedroom (baby read-aloud loop)**.

Authoritative product requirements live in the repo: `PRD.md` (§3.1 screen contract, §3.2 interaction grammar, §3.8 depth layers, §3.9 kid ergonomics, §10 art rules) and `docs/design-brief.md`. An updated copy of the brief with the amendments adopted during design is included here as `design-brief-updated.md`.

## About the Design Files
The `.dc.html` files in this bundle are **design references created in HTML/SVG** — interactive mockups showing intended look and behavior, NOT production code. The task is to **recreate these designs in the target environment** — this handoff targets an **iPad app (SwiftUI or the team's chosen iOS stack)**; the same package serves a web build (the PRD's stated web stack is PixiJS/WebGL for the scene + React overlays). Each mock has a state rail at the bottom (dev affordance — do not ship) and a notes strip documenting camera, layers, and mechanics.

## Fidelity
**High-fidelity.** Colors, stroke weights, typography, layouts, character designs, and animations are final art direction. Recreate pixel-perfectly (relative to the 1280×800 logical canvas). The state rails / notes strips below each 1280×800 frame are dev-only chrome.

## Canvas & iPad form factor
- Logical canvas: **1280×800 (16:10)**. All coordinates in the mocks are in this space.
- iPad landscape is 4:3 (≈1280×960 logical). **Do not redesign.** Treat 1280×800 as the safe-area composition and give the background layer vertical **bleed**: extend wall upward and floor downward (~80px each side of the composition). Nothing interactive may live in the bleed. Scale-to-fill width, center vertically.
- All art is flat-color vector with ink outlines — it scales losslessly. Export layers from the `.dc.html` SVGs at whatever raster scale the engine needs (2x/3x), or keep vector.

## Screens

### 1) Title (`Title.dc.html`)
- **Purpose:** entry. One primary action: **¡Jugar!**
- **Scene:** the García house exterior at dusk. Brick facade (chimney brown #C98A54, running-bond mortar lines), terracotta barrel-tile roof (#E0674A), two lit windows (warm #FBE7A8 interiors, interior curtains behind muntins: sage #9DBBA4 left / lavender #B39ECF right), red front door (#B3402F casing #C98A54) under a striped awning with scalloped valance, twin glowing wall lanterns (radial glow allowed — sanctioned light-source exception), string lights across the facade, night-tree silhouettes, bushes with coral blossoms, tree with moon shadow, trike, mailbox, stepping stones, pebbles, dusk sky #3E4270 with stars + full moon.
- **States:** 1 idle (¡Jugar! pulses) · 2 mic permission (adult-facing card: Allow / Not now) · 3 mic check (say "¡Hola!" bubble + waveform) · 4 mic denied (calm message, game does not start — no error styling).
- **Transition (R3.4):** on ¡Jugar! → camera zooms into the door (scale 1→7, cubic-bezier(.45,0,.7,1), 1.9s) while the door swings open and the doorway fills with golden light (#FFDF9E / radial #FFF6D8), full-frame golden wash, then cut to Living Room.
- **¡Jugar! button:** Baloo 2 800, 52px, #FFFAF0 on #E0674A, 8px ink border, pill, chunky ink under-shadow (0 8px 0 #6F4B35) + soft night shadow; 1.8s scale pulse.

### 2) Living Room (`Living Room.dc.html`)
- **Purpose:** Abuela voice-note loop (§4.2). Reading target = Abuela's chat messages; input = mic ON the phone in Sofía's hands.
- **Scene:** coral room hue; TV playing a telenovela (two characters with animated talking mouths, light source), couch with Abuela's crocheted blanket, family photos (cast faces, skin #D7AB87), Virgen candle, molcajete plant pot, papel picado string, baby toys, cat. Room lighting: only TV and phone emit light; soft object shadows via filter.
- **Fixed zones (§3.2):** bottom-center Sofía's hands holding the phone (mic button ON the phone, 156px circle #E0674A); side chat overlay (never covers hands); all feedback from characters in-scene.
- **States:** wait (living scene) → arrival (phone buzzes, notification) → note (Abuela's voice note plays) → thinking (avatar leans) → reply states: pass / miss ("¿Cómo, mija?") / grace (slow modeling) → reply sent. Idle ladder documented in the notes strip.
- **Chat:** iOS-style thread, Abuela avatar (curly gray hair, round glasses, blush), presence line ("en línea / escuchando… / nota de voz"), voice-note bubbles with play ▶ + waveform. Kid bubbles terracotta, right-aligned.

### 3) Fridge (`Fridge.dc.html`)
- **Purpose:** Dad-hosted magnet spelling loop (§4.4). The kid HEARS the target word and spells it with magnets.
- **Scene:** butter-yellow kitchen (#F6D992 wall, #FBE7A8 tile band, #C98A54 floor), close-up cream fridge (#FDF3E3, 500×680 @ x390 y60) with freezer clutter (family photo, El Sol lotería magnet), stove right of fridge (four knobs, two burners, terracotta pot with looping steam, oven window, sage towel), doorway at right with interior shadow, night window + molcajete plant left.
- **Note card:** "para Mamá:" + speaker replay button (52px, #E0674A, pings during prompt) + dashed letter slots (58×68, dashed #C98A54 → filled #FBE7A8 with ink border).
- **Magnet tray (instrument):** Sofía's hands hold a wooden tray (#C98A54/#E8B96A) at bottom-center; 9 letter magnets 62×62 (colors rotate #E8917A #F2C066 #9DBBA4 #B39ECF #E0674A), 5px ink border + 4px ink under-shadow. Target letters + distractors INCLUDING the confusable (EE vs EA).
- **Mechanics:** tap-magnet-to-place (production also needs drag with wide snap radius; tap-tap fallback everywhere; progress never resets). Wrong letter wobbles back to tray (0.9s, no red X). Word complete → note sticks to door with pop (stickPop 0.5s), accumulates on the lower door (rotated ±2–4°, colored magnet dot). Dad hands next prompt.
- **CRITICAL — audio-only prompts:** Dad's prompt is SPOKEN, never displayed. The 🔊 bubbles in the mock are annotations. Showing the word would defeat the mechanic. The speaker button replays the audio.
- **States:** wait → prompt (Dad speaks; first-needed magnet pulses) → dragging → note-sticks → next-prompt → goodnight bit (Dad yawns theatrically — animated stretch + hand to mouth — "Uy… ¡a dormir, mija!", auto-transition to Bedroom after ~1.8s). Exit button ¡A dormir! bottom-right.
- **Dad:** tousled dark hair, mustache, green polo (#7FA05C, collar/placket/buttons/pocket #6B8A4E), brown cuffed pants (#9A7B5A), dark shoes, blush.

### 4) Bedroom (`Bedroom.dc.html`)
- **Purpose:** baby read-aloud loop (§4.3). One English sentence per page; baby echoes on pass.
- **Scene:** dim lavender (#B9AECF wall + wainscoting band #C6BCDC below chair rail, #C98A54 wood floor, terracotta rug #E0674A with cream rings), night window with lavender drapes (rod + folds), crescent moon + cloud wall art, shelf (Virgen candle, stacked books, El Sol card), star string on wall pegs, detailed hanging mobile (heart/moon/sun/star charms), crib with corner-post finials — baby BEHIND the front rail — Abuela's blanket over the rail, teddy inside the crib, alphabet blocks, nightstand + tall lamp (triangular base, golden glow — sanctioned).
- **Light sources:** window moon + nightstand lamp only.
- **Baby (hermanito):** skin #E4C29F (one step lighter than family #D7AB87), curly hair tuft, cream polka-dot onesie, blush always. Faces: happy (closed arc eyes + open smile), listening (dot eyes), confused (raised brows + "?" — misses are baby confusion, never errors).
- **Instrument:** Sofía's hands hold an open book (880px wide × 330 tall), light cream spine gutter and faint page lines only (no dark marks near text). Reading target: the sentence, Baloo 2 800 50px #6F4B35 with 1.5px dark-ink text outline (#3A2417), page-slide-in animation. Mic button ON the book spine: 110px, #E0674A, pulse on reading / waveform bars when listening.
- **Mom:** enters walking from left (arrival + miss), leg-swing walk cycle, leaves left during reading; wavy hair with side-swept bangs both sides, gentle open eyes + closed-lip smile, orange cardigan (#E0674A) over yellow dress (#F6E3B8), legs + terracotta flats. Scale 1.18 vs baby.
- **States:** wait (baby chews rail) → arrival (Mom: "Mija, can you please read a bedtime story to your little brother?" — band-driven, may be English) → reading → listening → pass (baby echoes sentence + giggle-wiggle, next page) → miss (confused → Mom models) → grace (Léelo conmigo, auto-pass) → buenas noches (book close → lights dim #2E2A4A 75%, drifting z's, "Buenas noches, hermanito 🌙").
- **Exit:** "Buenas noches" button (book icon, cream #F6E3B8, ink under-shadow) — shown in every state except listening; bottom-right.

## Interactions & Behavior (cross-scene)
- **Kid ergonomics (§3.9, binding):** interactive targets ≥96px visible (mic is the hero), ≥64px apart. Wide snap radii. Tap fallbacks for all drags.
- **Idle ladder** per screen: 5s action-pulse → 10s character points → 20s character demonstrates.
- **No error states anywhere:** misses surface as fiction (baby confusion, Abuela's "¿Cómo, mija?", wobble-back). No red X, no toasts, no retry counters, no progress meters (fridge notes/thread ARE the progress surface).
- **Celebrations content-relevant** (item animates), never confetti.
- **Every loop exit is diegetic:** Dad's yawn, the book cover, etc.
- **Animation timings** are in each file's @keyframes block — treat as spec (durations, easings, keyframe shapes).

## State Management
Each mock is a state machine (see each file's logic class):
- Title: `idle | permission | miccheck | denied | transition`
- Living Room: `wait | arrival | note | thinking | reply-pass | miss | grace | …`
- Fridge: `wait | prompt | dragging | stick | next | goodnight` + `placed[]`, `wobble`, `notes[]`
- Bedroom: `wait | arrival | reading | listening | pass | miss | grace | goodnight` + `page`
Real builds add: prefetch of next item during current (R8.4.1), living-scene wait on late content (R8.4.3), off-ramp on hard failure (R8.4.4).

## Design Tokens
- **Grounds:** cream #FFFAF0, #FDF3E3 · panel #F6E3B8 · warm bg #F1E3CF
- **Ink:** #6F4B35 (silhouettes ~9–10px, interior lines ~6–7px, round caps; text-outline dark ink #3A2417)
- **Primary action:** terracotta #E0674A (ONE per screen, ink-outlined); pressed #C0492F; deep red #B3402F (door, cuffs)
- **Room hues:** living room coral · kitchen butter-yellow #F6D992/#FBE7A8/#E8B96A · bedroom lavender #B9AECF/#C6BCDC/#8E86AC · store mint (P1)
- **Support:** wood #C98A54 · deep wood #8A5B36 · sage #9DBBA4/#7FA05C (Dad polo)/#6B8A4E · gold #F2C066 · coral #E8917A · lavender accent #B39ECF · night #3E4270 · stone #9A8B7E · pants #9A7B5A
- **Skin (amended):** family #D7AB87 · baby #E4C29F · blush #F2A9A0 · hair #5A4436 · Abuela hair #CFC3B4
- **Glow (sanctioned exception):** #FFDF9E/#FFD873/#FFF6D8 radial fades, light sources only
- **Type:** Baloo 2 (Google Fonts), weights 500–800. Reading target ≥40px (bedroom sentence 50px). No other display face.
- **Shape language:** over-rounded; pills for buttons; 10–26px radii on cards; ink under-shadows (0 4–8px 0 #6F4B35) on tappables.

## Depth layers (PRD §3.8)
Every scene decomposes for 2.5D parallax: **background wall → mid furniture → foreground props → hands/instrument** (+ characters between mid and foreground). Each `.dc.html` SVG is grouped accordingly (`#layer-bg`, `#layer-mid`, `#fridge`, `#dad`, `#crib`, `#baby`, hands overlays). Keep each layer complete behind occluders. Camera notes are in each file's notes strip.

## Assets
No external images. Everything is inline SVG (exportable per layer). Font: Baloo 2 via Google Fonts (bundle it in the iPad app). Emoji used sparingly (🔊 annotation, 🌙) — replace with drawn glyphs in production if desired.

## Files
- `Title.dc.html` — title screen + door push-through transition
- `Living Room.dc.html` — Abuela loop
- `Fridge.dc.html` — Dad's magnet spelling loop
- `Bedroom.dc.html` — baby read-aloud loop
- `design-brief-updated.md` — art-direction brief with adopted amendments (lightened skin tones, glow exception, hermanito, bilingual Mom, no new-story control)
- `support.js` — mock runtime (reference only; ignore for production)

Repo context (not in this bundle): `nerdyv2/PRD.md`, `nerdyv2/CONTEXT.md`.


## Update — Aug 3, 2026
- Living Room: family wall photos redrawn (Mom/Dad/Abuela→desert landscape/baby, warm sand backdrops); guitar detailed (rosette, bridge+pins, strings, frets, tuning pegs); chanclas with Y-thong straps; sweater cuff knit lines; bedroom lamp base turned-wood detail.
- Living Room: chat panel can be minimized (– button in header). When minimized, the phone screen shows ONLY the Abuela notification banner; tapping it restores the panel. Mic/waves/thinking hide while minimized.
- Fridge: freezer photo is now Sofía's crayon drawing (cream paper, no stark white); hanging utensil rail (spoon, molinillo, spatula) centered between fridge and door.
