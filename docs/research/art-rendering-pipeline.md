# Art Rendering Pipeline: SVG Mocks → SpriteKit (iOS) + PixiJS v8 (Web)

**Status:** Research, 2026-07-29
**Scope:** Layered 2D scenes delivered as HTML/inline SVG (flat fills + thick ink outlines, radial-gradient glows, SVG filter soft shadows, CSS keyframe ambient animations), fixed 1280×800 logical canvas. Targets: iPad (SpriteKit/SwiftUI) and desktop Chrome (PixiJS v8). 60fps parallax, per-layer sprite transforms.

---

## 1. iOS ingestion of SVG

### 1a. Xcode asset catalogs (SVG)
- Xcode 12+ accepts SVG in asset catalogs (deployment target iOS 13+). With **Preserve Vector Data** ON, vector data ships in the bundle and is re-rasterized at display size; OFF, Xcode bakes @1x/2x/3x PNGs at build time. ([Sarunw](https://sarunw.com/posts/svg-image-assets-supported-in-xcode12/), [Bjango](https://bjango.com/articles/svgassetcatalogs/))
- **Critical limitation:** Xcode's SVG support is a small subset. It ignores `<animate>`/`<animateTransform>`, and **filters (blur, drop-shadow) cause asset-catalog/upload failures**. ([w3tutorials](https://www.w3tutorials.net/blog/how-to-use-svg-images-in-xcode-assets/), [Apple forums](https://developer.apple.com/forums/thread/722536)) Our art uses `feGaussianBlur` and radial gradients heavily → **asset-catalog SVG is not viable for these layers.**
- Preserve Vector Data also has a runtime cost: drawing stretched vector-backed images is much slower than pre-rasterized. ([Microsoft apple-ux-guide](https://microsoft.github.io/apple-ux-guide/iOSImageFileFormat.html))

### 1b. PDF vector assets
Same story: PDFs in asset catalogs are rasterized at build time (or at runtime with Preserve Vector Data), and PDF has no equivalent of SVG filters — a designer export from SVG → PDF would lose/flatten blurs anyway. Slightly worse stretch performance than SVG. ([Microsoft apple-ux-guide](https://microsoft.github.io/apple-ux-guide/iOSImageFileFormat.html))

### 1c. Runtime SVG libraries
- **SVGKit**: alive (issues/commits into 2025, v3.x in development) but CoreAnimation-based, heavyweight, historically incomplete filter support; not a fit for SpriteKit textures. ([SVGKit repo](https://github.com/SVGKit/SVGKit/))
- **Macaw** (exyte): semi-maintained ("PRs merged from time to time"), UIKit-era, partly obsoleted by SwiftUI; filter support partial. ([Macaw repo](https://github.com/exyte/Macaw))
- Verdict: neither is worth the dependency for static layer art that can be pre-rasterized offline.

### 1d. Pre-rasterization (the pragmatic option) — recommended
- **resvg** (linebender, Rust, `resvg` CLI / usvg): the highest-conformance standalone rasterizer — passes the largest share of the SVG test suite; supports SVG 1.1 filters incl. `feGaussianBlur`, plus linear/radial gradients, masks, clip paths. Actively maintained. ([resvg CHANGELOG](https://github.com/RazrFalcon/resvg/blob/master/CHANGELOG.md))
- **rsvg-convert** (librsvg): fast, decent, but filter fidelity is patchier for modern/browser-oriented SVGs (rgba blending, heavy blurs). ([SVG rasterization showdown](https://khadirullah.com/blog/svg-rasterization-engine-showdown/))
- **Headless Chrome/Playwright**: gold standard fidelity — it is literally the engine the mocks were authored against (incl. CSS-in-SVG, CSS variables, `filter: drop-shadow()`), at the cost of a heavier toolchain. ([showdown](https://khadirullah.com/blog/svg-rasterization-engine-showdown/))
- **Choice:** because our mocks live inside HTML and may use CSS (custom properties, CSS filters) that standalone SVG rasterizers don't evaluate, **headless Chrome (Playwright) is the safest exporter**; resvg is a good fallback if layers are extracted to clean standalone .svg files.

### 1e. SpriteKit texture memory budget
- A 1280×800 @2x layer = 2560×1600 RGBA ≈ **16.4 MB** uncompressed. Modern GPUs handle textures up to 4096×4096 efficiently; 2560×1600 is fine per-texture. ([HWS SpriteKit tips](https://www.hackingwithswift.com/articles/184/tips-to-optimize-your-spritekit-game), [Apple forums](https://developer.apple.com/forums/thread/705092))
- Budget: recent iPads have 4–8 GB+ RAM; 4–6 full-screen layers ≈ 65–100 MB texture memory — comfortably safe. Keep it under ~8 full-screen layers; crop layers to their content bounds (props/hands rarely span the full canvas) and let the manifest carry offsets, which typically cuts this by 50%+. Use one `SKTextureAtlas` per scene for the smaller sprites. ([tutsplus SpriteKit optimizations](https://code.tutsplus.com/spritekit-from-scratch-advanced-techniques-and-optimizations--cms-26470t))
- @2x is sufficient for iPad (all current iPads are 2x); do not ship @3x for full-screen layers.

## 2. PixiJS v8 SVG support

- `Assets.load('scene.svg')` works natively. Two modes ([PixiJS SVG guide](https://pixijs.com/8.x/guides/components/assets/svg)):
  1. **Texture mode** (default): rasterizes via the browser to a `Texture`, cached/reused. You can pass load options (`data: { resolution, width, height }`) to control raster size. Texture cap ~4096×4096.
  2. **`parseAsGraphicsContext: true`**: parses into a `GraphicsContext` — true vectors, infinitely scalable, tintable/modifiable — but **complex filters and text are not supported**, and complex holes can triangulate wrong. ([Graphics guide](https://pixijs.com/8.x/guides/components/scene-objects/graphics), [discussion #10953](https://github.com/pixijs/pixijs/discussions/10953))
- Our filter-heavy glow/shadow layers therefore cannot go through GraphicsContext; texture-mode SVG rasterization runs through the browser so filters *do* render, but resolution/caching control and load-time cost make **pre-rasterized PNG (or WebP) textures the more predictable choice** for the big layers.
- DOM/SVG overlay above the canvas: viable for one-off effects (e.g. an animated waveform), but breaks z-interleaving with canvas sprites and costs compositing layers — avoid for core scene art.
- Keep small, crisp, recolorable elements (simple flat-fill props) as `GraphicsContext` SVGs if dynamic tinting/scaling is ever needed; everything else as textures.

## 3. Layer export tooling

There is **no standard off-the-shelf "SVG → per-layer PNG + manifest" tool**; the standard practice is a small project script. Two workable approaches:

1. **Playwright per-layer screenshots (recommended).** Load the mock HTML in headless Chromium at deviceScaleFactor 2; for each layer group (`#bg-wall`, `#mid-furniture`, `#fg-props`, `#hands`), hide all other groups (`visibility:hidden`, not `display:none`, to keep layout identical), screenshot the fixed 1280×800 viewport with `omitBackground: true` (transparent PNG), and record each group's `getBBox()`/`getBoundingClientRect()` into a JSON manifest (`{ name, x, y, w, h, scale, zIndex, parallaxDepth }`). Full CSS/filter fidelity, exactly matches the approved mock. Also freeze CSS animations (`animation: none` or `animation-play-state: paused` at t=0) before capture.
2. **Subtree extraction + resvg.** Script (Node + `svgson`/cheerio) that lifts each `<g id="layer">` plus its referenced `<defs>` (gradients/filters) into a standalone SVG with the original viewBox, then `resvg --zoom 2`. Faster, deterministic, CI-friendly — but only if layers don't rely on external CSS.

Start with (1); move to (2) if the designer delivers clean standalone SVGs later.

## 4. Animation translation

- **Hand-porting is standard practice.** The ambient loops here (pulse = scale/alpha sine, sway = rotation about anchor, steam = translate+alpha on a small sprite, waveform = programmatic anyway) are each 3–10 lines:
  - iOS: `SKAction.repeatForever(.sequence([...]))` or `SKAction.customAction` with sine easing; set `anchorPoint` for sway pivots.
  - Pixi: shared `Ticker` driving `sprite.scale/rotation/alpha` with `Math.sin(elapsed * freq)`, or a tiny tween lib (gsap / `@tweenjs/tween.js`).
- Keep a shared `animations.json` spec (`{ target, type: "pulse|sway|steam", amplitude, period, anchor }`) hand-derived from the CSS keyframes so both platforms read one source of truth. No credible automatic CSS-keyframes→SKAction converter exists.
- **Lottie**: authored from After Effects; the art is SVG, so adopting Lottie means re-authoring in AE plus adding lottie-ios/lottie-web runtimes — poor cost/benefit for transform-only loops.
- **Rive**: excellent runtimes on both platforms and imports SVG, but introduces a new authoring tool, per-seat cost, and its renderer sits alongside (not inside) SpriteKit/Pixi scene graphs. Worth revisiting only if animation needs grow beyond ambient transforms (e.g. character rigs, state machines). For pulse/sway/steam, plain transform code wins.

## 5. Recommended pipeline

### Shared export step (once, feeds both)
1. Tag each mock's SVG groups with stable `id`s (`bg-wall`, `mid-furniture`, `fg-props`, `hands`, plus any glow layers) and give animated elements their own sub-ids.
2. Run a Playwright export script: for each layer, isolate → screenshot transparent PNG at deviceScaleFactor 2 (2560×1600 max), auto-crop to content bounds, and emit `scene.manifest.json` with per-layer `{ file, x, y, w, h, z, parallaxDepth }` in 1280×800 logical coordinates. Check PNGs + manifest into an `art/` package both apps consume.
3. Hand-write `animations.json` from the CSS keyframes (target id, type, amplitude, period).

### iOS (SpriteKit/SwiftUI)
1. Drop exported @2x PNGs into an asset catalog (plain PNGs, no vector data) or a bundle folder; group per-scene `SKTextureAtlas` for small props.
2. `SKScene(size: 1280×800)` with `scaleMode = .aspectFit`; build layers as `SKSpriteNode`s from the manifest (position = manifest x/y, zPosition = z).
3. Parallax: offset each layer node by `parallaxDepth * cameraOffset` per frame (or use `SKCameraNode` + per-layer follow factors).
4. Ambient loops: `SKAction.repeatForever` sequences generated from `animations.json`.
5. Budget check: ≤ ~6 full-screen-equivalent layers (~100 MB); Instruments → Metal/Memory gauge on lowest-supported iPad.

### Web (PixiJS v8)
1. Load the same PNGs via `Assets.load` (add to a manifest bundle); set texture `resolution` to 2 so 2560×1600 PNGs map to 1280×800 logical px.
2. Fixed 1280×800 stage inside a letterboxing resize handler (scale stage to fit window).
3. One `Container` per layer, positioned from the manifest; parallax = per-layer container offset in the ticker.
4. Ambient loops: single `Ticker` applying sine transforms from `animations.json` (or gsap for eased one-shots like bounce).
5. Optional: keep simple flat-fill interactive props as SVG via `parseAsGraphicsContext` for tinting; never route filtered/glow art through GraphicsContext.

### Sources
- https://sarunw.com/posts/svg-image-assets-supported-in-xcode12/
- https://bjango.com/articles/svgassetcatalogs/
- https://www.w3tutorials.net/blog/how-to-use-svg-images-in-xcode-assets/
- https://microsoft.github.io/apple-ux-guide/iOSImageFileFormat.html
- https://github.com/SVGKit/SVGKit/ ; https://github.com/exyte/Macaw
- https://github.com/RazrFalcon/resvg/blob/master/CHANGELOG.md
- https://khadirullah.com/blog/svg-rasterization-engine-showdown/
- https://pixijs.com/8.x/guides/components/assets/svg
- https://pixijs.com/8.x/guides/components/scene-objects/graphics
- https://github.com/pixijs/pixijs/discussions/10953
- https://www.hackingwithswift.com/articles/184/tips-to-optimize-your-spritekit-game
- https://code.tutsplus.com/spritekit-from-scratch-advanced-techniques-and-optimizations--cms-26470t
