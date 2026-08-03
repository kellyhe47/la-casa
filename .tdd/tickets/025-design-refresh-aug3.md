---
id: 025
title: "Design refresh — Aug 3 handoff (art detail + chat minimize)"
status: green
depends_on: []
touches: [client/src/assets/scenes/LivingRoomScene.tsx, client/src/assets/scenes/FridgeScene.tsx, client/src/assets/scenes/BedroomScene.tsx, client/src/screens/LivingRoomScreen.tsx]
iterations: 2
test_files: [client/src/screens/livingRoomChatPanel.test.tsx]
branch: ""
---

Source of truth: the modified files in `design/handoff/` and the
"Update — Aug 3, 2026" section of `design/handoff/README.md`.

The app's scene components share the design mocks' **1280×800 viewBox and exact
coordinates**, so every art change is a direct markup port (SVG attrs → JSX
camelCase: `stroke-width` → `strokeWidth`, `text-anchor` → `textAnchor`).
Confirmed: the current `LivingRoomScene.tsx` photo block is byte-equivalent to
the design's pre-change markup.

**Only 4 files change.** No new components, no new deps, no server changes.

---

## A. Living Room — chat panel minimize (the only behavioural change)

`client/src/screens/LivingRoomScreen.tsx`

The chat panel is an HTML overlay; the phone is SVG inside `LivingRoomScene`.
Render the notification banner as an HTML overlay inside the **existing
aspect-ratio box** that already locks the mic button to the 1280×800 space
(`LivingRoomScreen.tsx:363`) — do not add it to the scene SVG.

Design geometry → percentages of 1280×800:
banner `x=544 y=546 w=194 h=70` → `left 42.5%, top 68.25%, width 15.16%, height 8.75%`.

Design state logic to reproduce:
```
hidden    = loopState !== 'wait' && panelHidden
chatOpen  = loopState !== 'wait' && !panelHidden
showNotif = loopState === 'arrival' || (loopState !== 'wait' && panelHidden)
micShown  = <existing rule> && !hidden
```

### AC-A1 — minimize control
- [ ] A round `–` button sits in the chat panel header, right of the presence line
- [ ] 38px, `#FBE2D3` fill, 4px `#6F4B35` border, circular, `aria-label="Ocultar chat"`
- [ ] Clicking it hides the chat panel

### AC-A2 — minimized phone shows only the banner
- [ ] While minimized, the chat panel is not rendered
- [ ] While minimized, the Abuela notification banner IS rendered over the phone
- [ ] The banner shows "Abuela" and "ahora" and two ink message-lines
- [ ] The banner is the ONLY thing on the phone screen while minimized

### AC-A3 — tapping the banner restores
- [ ] The banner is clickable and has an accessible name
- [ ] Clicking it re-renders the chat panel
- [x] Clicking it removes the banner
      _(amended after QA r2: the design's `arrival` has no mic at all (`micShown = !has('arrival',…)`), so banner-plus-mic was never a sanctioned frame. This app reuses `arrival` as the resting mic-ready state, so `showNotif` is `panelHidden` alone and the arrival exception cannot arise.)_

### AC-A4 — suppressed affordances while minimized
- [ ] The mic button is not interactive/visible while minimized
- [~] Listening waveform and thinking indicator do not render while minimized — **VACUOUS**: this app renders neither indicator in any state.
- [ ] The panel header (avatar + presence) does not render while minimized

### AC-A5 — scope guards
- [ ] The panel defaults to OPEN — existing `AC14: chat thread component is present` still passes
- [~] Minimize is unavailable in `wait` — **VACUOUS**: `wait` is in the `LoopState` union but never assigned; the screen mounts straight into `arrival`. Verified unreachable in QA r1 and r2.
- [ ] Restoring preserves the existing message history — nothing is re-fetched, no `/generate` or `/tts` call is issued by minimize or restore
- [ ] Minimizing mid-exchange does not interrupt audio or grading

---

## B. Living Room — art (`LivingRoomScene.tsx`)

### AC-B1 — family photos redrawn
- [x] Photo mats change `#FFFAF0` → `#EFDDC3` on the **x486 and x760** frames only
      _(corrected after QA r2: my original wording said all three, but the design diff leaves x628 at `#FFFAF0`. The design is the source of truth. Invisible either way — the desert rect covers that mat.)_
- [ ] Left frame (x486): two shoulders — coral `#E8917A` and sage `#7FA07C` — with Mom (skin `#D7AB87`, eyes, blush, smile) and Dad (skin `#AC7552`, dark hair, open smile)
- [ ] Centre frame (x628): Abuela portrait REPLACED by a desert landscape — sand `#F9D9A8`, sun `#F2A48B`, dune bands `#D98E5F`/`#E0A96D`, saguaro
- [ ] Right frame (x760): baby — yellow shoulders `#F4C95D`, skin `#E4C29F`, hair tuft, blush, smile

### AC-B2 — guitar detail
- [ ] Gold rosette rings around the sound hole
- [ ] Bridge `#5A4436` with three gold string pins
- [ ] Two waist highlight strokes at 0.35 opacity
- [ ] Four gold tuning pegs
- [ ] Three strings running to the bridge (replacing the two short strings)
- [ ] Three frets on the neck

### AC-B3 — chanclas with Y-thong straps
- [ ] Each chancla has an inner sole outline (0.4 opacity)
- [ ] Each has a `#B3402F` Y-thong: cross strap + toe post + toe-post stud
- [ ] The right chancla's rotation is applied via a wrapping `<g>`
- [ ] The lavender baby sock is REMOVED

### AC-B4 — minor tweaks
- [ ] Two sweater-cuff knit lines near `M 497 760` at 0.45 opacity
- [ ] The stray `circle cx=880 cy=46 r=6` is removed

---

## C. Fridge (`FridgeScene.tsx`)

### AC-C1 — freezer photo → Sofía's crayon drawing
- [ ] The photo becomes cream paper `#FBEDD2` (no stark white), `rx=3`
- [ ] Contains a wobbly crayon house (`#E0674A` walls, `#B3402F` roof, `#F2C066` door)
- [ ] Contains a `#F2C066` sun with rays
- [ ] Contains `#7FA05C` scribble grass on both sides
- [ ] The old family-photo faces are gone

### AC-C2 — hanging utensil rail
- [ ] A horizontal rail with two `#C98A54` end caps, wall right of the fridge, wrapped in `translate(-25 62)`
- [ ] A wooden spoon (stem + bowl ellipse + inner ellipse)
- [ ] A molinillo with `#8A5B36` head and two ring lines
- [ ] A flat spatula with a wide blade
- [ ] The rail sits between the fridge and the doorway and overlaps neither

---

## D. Bedroom (`BedroomScene.tsx`)

### AC-D1 — turned-wood lamp base
- [ ] The lamp stem shortens from `v 44` to `v 36`
- [ ] A collar line `M 212 420 h 16` is added
- [ ] The flat triangular foot is replaced by a turned base `#C98A54`
- [ ] A `#8A5B36` foot plate `rect x=192 y=460 w=56 h=10 rx=5` is added
- [ ] The lamp glow (sanctioned light source) still renders

---

## E. Non-regression (all scenes)

- [ ] `npx vitest run` from `client/` is fully green (254 tests at start)
- [ ] `npx tsc --noEmit` exits 0 and `npx vite build` succeeds
- [ ] Server suite unaffected (201 tests) — no server file is touched
- [ ] Fridge magnet spelling, bedroom reading, and living-room mic flows all still work
- [ ] No scene grows a raster asset or external dependency — inline SVG only
- [ ] Ink `#6F4B35`, terracotta `#E0674A` and the one-primary-action rule are preserved

## Test plan

_(test-writer fills in)_

## Attempt log

- iter 1: ported all art + built chat minimize. 276/276. QA r1: 24/26 PASS, one
  defect — banner/mic overlapped 19x164px in `arrival`; banner clipped the mic
  ring and lost its bottom 19px of tap target to the higher-z mic button.
- iter 2: `showNotif` narrowed to `panelHidden`; centre mat reverted to the
  design's `#FFFAF0`; two tests added that derive the collision from the
  components' own geometry. 278/278. QA r2: shippable, no blockers or majors.
  Measured 315/315 banner probe points live, 0/24 mic points stolen.

### Known-latent (recorded, not fixed)

`chatOpen`/`hidden` no longer carry the design's `loopState !== 'wait'` guard,
only `showNotif` was narrowed. Inert while `wait` is unreachable; would diverge
from the design if that state were ever wired up. Deliberately not "fixed" —
guarding an unreachable state is dead code.

### Not verifiable in this environment

AC-A5d's *audio* continuity: with dummy TTS keys no audio element is ever
created, so "minimizing mid-exchange does not interrupt audio" cannot be
observed. Grading continuity across a minimize was verified and passes.
