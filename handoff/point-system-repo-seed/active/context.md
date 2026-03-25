# Point-System Context

## Current Direction

Art direction is locked: dense pointillism/stipple rendering inspired by Andreion de Castro's Amazon Conflux. Colored points on dark backgrounds, density carries form, restrained bloom for luminosity.

Evolved from ASCII → dithering → points/surfels. This is the final visual direction.

## What Exists Now (March 25, 2026)

The Phase 1 feasibility scaffold is built and producing compelling results. Both tracks (3D mesh and 2D image) work through the same engine and renderer.

### Engine (`src/lib/engine/`, zero Svelte deps)

- **Core**: `SampleSet` canonical data structure with typed arrays (positions, colors, radii, opacities, + optional ids, normals, orientations, velocities, anchors, barycentrics, uv)
- **Ingest**: `MeshAdapter` (glTF → world-space surface samples) + `ImageAdapter` (image → stipple with ML depth, outlier suppression, luminance radius)
- **Algorithms**: rejection sampling (fast) + CDF importance sampling (better density), both with seeded PRNG and density gamma control
- **Processing**: composable `Pipeline` with `ColorProcessor` (HSL grading, contrast)
- **Rendering**: `GLPointRenderer` implementing `RendererAdapter`, custom GLSL shaders with 15+ live-tunable uniforms
- **Preprocessing**: lazy-loaded ML modules for background removal (4 models) and depth estimation (6 models)

### Shader Controls (all live-tunable via uniforms)

- Point size (direct pixel or perspective-scaled)
- Exposure/brightness (RGB multiply, preserves saturation — applied AFTER saturation in HSL)
- Saturation (0–5, applied in HSL before exposure)
- Dark cutoff (fade dark points into black background, 0–1)
- Color noise (per-point hue/saturation jitter via position-hash for broken-color pointillist look)
- Hue shift (global palette rotation)
- Warmth (color temperature, cool blue ↔ warm amber)
- Edge sharpness (soft gaussian ↔ hard circle)
- Additive vs normal blending toggle
- Opacity, depth fade

### ML Preprocessing (browser-side, lazy-loaded, cached)

- **Background removal**: 4 model options:
  - ISNet via `@imgly/background-removal` (~40MB, fast, works everywhere)
  - BiRefNet Lite via `@huggingface/transformers` (~115MB, much better quality, MIT, Chromium only)
  - BEN2 via `@huggingface/transformers` (~219MB, best edges, MIT, Chromium only)
  - BiRefNet Full via `@huggingface/transformers` (~490MB, highest quality, Chromium only)
  - Non-Chromium browsers (Firefox, Zen) automatically fall back to ISNet; UI greys out unsupported models with "Chromium only" label
- **Depth estimation**: 6 model options via `@huggingface/transformers`:
  - DA V2 Small q8 (27MB, fast, default), Small fp16 (50MB), Base q8 (102MB), Base fp16 (195MB, best detail), MiDaS DPT-Hybrid (500MB), DA V1 Small (99MB)
  - DA V2 Base fp16 produces noticeably better depth detail (cloth wrinkles, facial features) but is slower
- **Normal displacement**: computes surface normals from depth gradients, displaces points laterally for volumetric form
- **Caching**: models cached in browser via Cache API; `env.useBrowserCache = true` set explicitly after dynamic import to fix SSR contamination; persistent storage requested on mount
- **Pipeline caching**: pipeline instances cached by model+dtype key — switching between loaded models is instant; BG removal and depth results cached per source image + model index via WeakMap

### Browser Compatibility

- Chromium browsers (Chrome, Edge, Brave, Opera): full feature support, all ML models work
- Firefox/Zen: ISNet BG removal only (BiRefNet/BEN2 greyed out in UI); depth estimation works via WASM fallback
- UI shows amber compatibility notice on non-Chromium browsers

### App Layer

- SvelteKit + Threlte 8 scaffold
- `UnrealBloomPass` post-processing (custom render loop via `useTask`)
- Full controls UI (scrollable, all parameters, ML preprocessing buttons with loading state, model dropdowns, browser compat notices)
- Mesh mode (procedural torus knot) + image mode (upload + process)
- Image preprocessing orchestration runs through one authoritative `rebuildImagePipeline()` path with per-source/model caches and stale-request guards

### Tests & Quality

- 26 tests passing (SampleSet, algorithms, pipeline, mesh adapter, image adapter, background-removal helpers)
- 0 type errors, 0 warnings
- TypeScript strict mode, no `any` escape hatches

## Key Decisions Made

- **Art style**: Dense colored pointillism, NOT sparse point clouds or ASCII
- **Visual reference**: [Andreion — Amazon Conflux](https://andreion.com/amazon-conflux)
- **Stack**: SvelteKit + Threlte 8 + raw Three.js engine core (confirmed, working)
- **Renderer**: `THREE.Points` + custom `ShaderMaterial`, behind `RendererAdapter` interface
- **Character animation**: hybrid approach — video→point cloud for body (beauty in imperfection), mesh hands with IK for object interactions. Fallback: MediaPipe→driven mesh if temporal coherence is unsolvable.
- **AI character LLM**: provider abstraction first; candidates MiniMax M2 or DeepSeek V3 for cost + personality, plans to fine-tune
- **Content architecture**: typed content graph/manifests defined (interfaces only)
- **Project structure**: single repo, engine in `src/lib/engine/` with zero framework deps
- **Quality bar**: FAANG-level from the start

## Visual Quality Status

The renderer is approaching the Andreion reference quality. Key observations:
- DA V2 Base fp16 depth estimation captures cloth wrinkles and facial features impressively
- Dark cutoff + outlier suppression creates the clean dark→black transitions Andreion achieves
- Color noise adds painterly broken-color richness
- Background removal (BiRefNet Lite on Chromium) provides clean subject isolation
- Colors still slightly less vibrant than Andreion's — his offline pipeline likely has additional color processing
- Our real-time interactive approach is significantly more ambitious than his pre-rendered work
