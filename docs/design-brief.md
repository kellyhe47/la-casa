# La Casa — design-session brief (updated 2026-07-29)

Paste this to the design agent along with: `PRD.md` (§3.1 screen contract + §10 art rules are binding), `CONTEXT.md`, and the best-attempt screenshot with the critique below.

---

## Prompt

You are art-directing **La Casa**, a first-person web literacy game for a Spanish-speaking 7-year-old. Produce screen designs as self-contained HTML/SVG mocks, **one screen at a time**, at exactly **1280×800**, starting with the Living room. PRD §3.1 defines every screen's layout, elements, and states; PRD §10 defines the art rules. Both are binding — do not invent UI the spec doesn't have, do not omit states it does (every room includes its living-scene wait state).

**The signature — non-negotiable, this is what past attempts missed:**
Every shape is drawn in the style of a **cozy coloring book, richly lit**: a visible warm-brown outline (#6F4B35) around every silhouette (~9–10px) and interior line (~6–7px), round caps, **clean confident curves** — polished, not hand-shaky (no wobble/roughen effects). Gradients and soft shadows are welcome — use them for depth, warmth, and light (lamp glow, TV spill, doorway gold, soft object shadows). The ink outline is the non-negotiable signature: richness lives *inside and around* the lines; if a frame could pass as generic outline-less flat illustration, it is wrong. Technical rule: a shadow or glow belongs to the same depth layer as the object casting it (parallax moves them together). Tone references: *Coco* (multigenerational Mexican family warmth), *Cleo & Cuquín*.

**Detail density — the anti-"elementary" rule:**
Rooms must feel *lived in by this specific family*, not furnished from a starter kit. For each room, include 10–15 specific props that tell the family's story (Living room e.g.: Abuela's crocheted blanket draped uneven on the couch, a Virgen de Guadalupe candle on the shelf, a molcajete used as a plant pot, family photos where faces have the cast's silhouettes, baby toys half under the couch, papel picado from a past birthday still strung in a corner, a telenovela paused on the TV). Props follow the same ink-line rules. Clutter is warm; sparse is cold.

**First person (PRD §2):** the camera is Sofía. She never appears — only her hands and held objects enter from the bottom of frame (phone, list, basket, magnets, book), warm skin fill #D7AB87, red sleeve cuff. Characters face and address the camera. Interactive elements anchor to the world (the mic button lives ON her phone, not floating in space).

**Skin tones (updated 2026-07-29):** the whole cast uses lightened warm tones. Family base **#D7AB87** (Sofía's hands, Mom, Abuela, wall-photo faces); the baby one step lighter, **#E4C29F**. The red sleeve cuff remains Sofía's signature.

**Cast note (updated):** the bedroom baby is a little brother (*hermanito*). Mom's dialogue is LLM-generated and band-dependent — she may speak English; do not hard-code Spanish-only lines or any "contéstale en español" grading requirement.

**Color system (PRD §10):** cream grounds #FFFAF0/#FDF3E3, ink #6F4B35, ONE terracotta #E0674A primary action per screen (ink-outlined). Each room owns a hue *under the same ink line*: living room coral, kitchen butter-yellow, store mint, bedroom lavender. Type: Baloo 2, reading text ≥40px.

**Hard prohibitions:** no text labels on store shelf items (pictures only); no save/progress indicators of any kind (nothing persists); no XP/meters/scores; no red X or error styling anywhere; no third-person Sofía; no "new story" control on the title screen (removed 2026-07-29).

**Interaction grammar (PRD §3.2, binding):** fixed zones on every screen — bottom-center: Sofía's hands holding the input instrument (mic lives ON the phone, magnets ON the tray); center stage: the world and characters (all feedback comes from characters in-scene, never toasts); top corner: the carried context (travelling list); side overlay: chat, never covering the hands. Reading target = largest text on screen; exits are diegetic objects.

**Deliver scenes as depth layers (PRD §3.8):** every mock is composed of separable layers — background wall, mid furniture, foreground props, hands — each individually exportable, with a one-line camera note (where the camera enters from and exits to). The build animates these layers as 2.5D parallax, so keep each layer's art complete behind occluding foreground objects (no baked-together overlaps).

**Kid ergonomics (PRD §3.9, binding):** interactive targets ≥96px visible (mic ~160px hero), ≥64px apart. Draw the mic's three states (invite pulse / listening waveform on the phone / character-leaning "thinking"). Design the idle ladder into each screen's states: 5s action-pulse, 10s character points, 20s character demonstrates. Celebrations are content-relevant (the item itself animates), never generic confetti. Every prompt has a small in-world replay affordance.

**Process:** After each mock, self-critique against this brief — specifically: "would this pass as outline-less generic flat illustration?" and "does this room belong to this family?" — and revise once before presenting.

**Render QA (mandatory before presenting):** actually render the mock and inspect a screenshot at 100% — do not judge from the code. Check:
1. No accidental line tangents/collisions — outlines never kiss or cross unless it's deliberate occlusion with correct z-order.
2. Stroke discipline — 9–10px silhouettes / 6–7px interior lines *at rendered scale* (beware transforms silently thinning strokes); no white slivers between fills and outlines.
3. Every silhouette is a closed path — no open outlines, no leaking fills.
4. Canvas integrity at 1280×800 — no unintended clipping at edges; intentional bleeds (hands entering frame) are clean; no off-canvas strays.
5. Text — reading target ≥40px as rendered, no overflow or mid-word wrap; verify the fallback font doesn't break layout.
6. Layer hygiene — render each depth layer in isolation; every layer must be complete on its own (no baked-together overlaps that would tear under parallax).
7. Spec spot-check — exactly one terracotta action; interactive elements visually ≥96px; nothing in the hands zone except hands + instrument.
Fix everything found, re-render, and only then present.

---

## Critique of the best attempt so far (attach the screenshot)

Keep: composition, night-window warmth, the chat-overlay idea, the cat.
Fix:
1. **No ink lines anywhere** — the core style is absent. Every shape needs the clean #6F4B35 outline.
2. **Generic props** — the bookshelf/plant/frames could be any app's empty-state art. Replace with family-specific props (see detail-density rule).
3. **"thread saved ✓" violates spec** — nothing persists (R11.5). Remove.
4. **Floating mic button** — anchor it to the phone in Sofía's hands, bottom of frame (first person).
5. **Faceless portrait people** — the photos should show the actual cast silhouettes (blush, distinct shapes), not avatar placeholders.
6. **No line work** is the core gap — chunky rounded volumes with clean ink outlines is the style; keep the geometry polished.
