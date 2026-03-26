# Point-System Tasks

## Completed

### Planning & Direction
- lock the art direction (dense pointillism, Andreion reference)
- lock the stack (SvelteKit + Threlte 8 + raw Three.js engine)
- define the project structure (single repo, engine in `src/lib/engine/`)
- define the engine architecture (pipeline, adapters, renderer adapter boundary)
- define Phase 1 scope (two tracks: 3D mesh + 2D image)
- research Andreion's technique (pre-rendered Processing/p5.js dithering)
- research optimal stack (Three.js + Threlte validated as best fit)
- complete Codex architecture review
- clarify ship stance, mobile stance, AI stance
- decide character animation approach (hybrid video→point cloud body + mesh hands)

### Engine Implementation
- scaffold SvelteKit + Threlte 8 project
- implement SampleSet data structure with typed arrays
- implement MeshAdapter with world-space sampling, IDs, UVs, normals, material fallback
- implement ImageAdapter with importance/rejection sampling
- implement GLPointRenderer with custom GLSL shaders (15+ uniforms)
- implement processing Pipeline + ColorProcessor
- implement bloom post-processing (UnrealBloomPass via custom Threlte render loop)
- implement content graph types (interfaces only)

### Visual Quality Iteration
- fix point size slider (attenuation constant was too aggressive)
- switch from additive to normal blending (colors no longer wash out)
- add edge sharpness control (hard circle vs soft gaussian)
- add dark cutoff (fade dark points into black background)
- fix brightness to be exposure/gain (preserves saturation, applied after HSL saturation)
- add color noise (per-point hue/saturation jitter via position hash for broken-color effect)
- add hue shift and warmth (color temperature) controls
- add outlier suppression (kill isolated bright specs in dark regions)
- add luminance-based radius scaling
- add density gamma for contrast control

### ML Preprocessing
- integrate @imgly/background-removal (browser-side, ~40MB model)
- integrate @huggingface/transformers with Depth Anything V2 for depth estimation
- add 6 depth model options (DA V2 Small/Base × q8/fp16 + MiDaS + DA V1)
- add 4 BG removal model options (ISNet, BiRefNet Lite, BEN2, BiRefNet Full)
- implement depth-to-normals for lateral displacement (volumetric form)
- fix blob URL revocation bug (convert to blob/dataURL before passing to ML)
- fix SSR cache contamination (env.useBrowserCache = true after dynamic import)
- fix image preprocessing state drift with explicit rebuild pipeline + caches + stale-request guards
- harden Transformers background-removal for BiRefNet/BEN-style outputs (alpha-mask compositing)
- fix pipeline returning array not single RawImage
- add browser compatibility detection (non-Chromium gets ISNet fallback + greyed out UI)
- add persistent storage request to prevent model cache eviction
- exclude @huggingface/transformers from Vite optimizeDeps

### Code Quality
- fix MeshAdapter world-space sampling bug
- fix blob URL lifecycle leaks
- add mesh ingest tests (transforms, normals, IDs, UVs, material fallback)
- add image ingest tests for transparent-pixel exclusion and depth-map precedence
- add background-removal helper tests for alpha-mask compositing
- 26 tests passing, 0 type errors, 0 warnings

### Visual Customization (Sprint 1 — March 26)
- add background color picker (scene.background)
- add point-based frame generator with rectangular border
- add tunable sizeVariation parameter (0-1) for luminance-based radius scaling
- add mergeSampleSets() utility for combining SampleSets
- cursor-based zoom (zoomToCursor) + zoom-out cap (maxDistance)
- shorten browser compat warning + add dismiss button
- add SampleSet merge tests, FrameGenerator tests, ImageAdapter sizeVariation tests
- 42 tests passing

### Visual Customization (Sprint 2 — March 26)
- split background into inner/outer colors (inner = PlaneGeometry behind points, outer = scene.background)
- reorganize Controls.svelte into collapsible sections with headers
- add settings persistence (localStorage save/load/reset)
- add 4 frame styles: rectangle, double, ornate (corner accents + inner accent), scattered (Gaussian falloff)
- model dropdowns visible before enabling features (pick model first, then run)
- 46 tests passing

### ML Cross-Browser Compatibility (March 26)
- fix depth estimation WebGPU probe (was naive navigator.gpu check, now probes adapter)
- add WASM fallback chain for BG removal and depth estimation (webgpu → wasm → ISNet)
- add 30s WebGPU timeout / 120s WASM timeout with automatic retry
- add ISNet fp16 and ISNet quint8 variants for better WASM BG removal
- fix BackgroundRemoval missing await on ISNet fallback (catch block was dead code)
- fix depth estimation failing on BG-removed images (transparent pixels → opaque JPEG conversion)
- add SvelteKit hooks.server.ts for COOP/COEP headers (SharedArrayBuffer for WASM multi-threading)
- add WebGPU capability detection (webgpu-probe.ts) shared across all ML modules
- fix BG removal cache storing ISNet results under wrong model key on fallback
- 48 tests passing, 0 type errors

### Staff Review Hardening (March 26)
- fix `mergeSampleSets()` so merged sample sets preserve optional metadata instead of dropping `ids`, `uv`, or normals when frame samples are appended
- preserve stable IDs during merges and synthesize fresh IDs only for samples that need them
- align COOP/COEP to `credentialless` in both dev and app responses
- dispose replaced bloom passes during composer rebuilds
- fix settings reset drift so BG removal resets to the same default model as initial load

### Phase 1 Extension (March 26)
- add app-layer BG removal provider abstraction (`browser` vs `server`)
- add SvelteKit `/api/bg-remove` proxy route for local Python inference service
- add local Python background-removal service scaffold for BiRefNet / BRIA RMBG 2.0
- pin Python service deps to the current `ai-env` torch line and verify local boot/health
- add the missing BiRefNet runtime extras (`einops`, `timm`) and fix server-upload/error-handling regressions in the app path
- add `pnpm dev:full` to run the local BG service and Vite together from one terminal
- remove the old low cap on weighted Voronoi so it can be exercised across the full image slider range for manual testing
- widen the controls sidebar and remove horizontal scrolling
- add lazy-loaded route shell for the heavy Threlte / Three runtime
- add real preset demo assets (Khronos glTF mesh + curated public-domain paintings)
- add preset asset selection UI for mesh and image modes
- add weighted Voronoi stippling benchmark algorithm
- add direct GLPointRenderer tests
- 60 tests passing, 0 type errors

## Next

- [ ] continue visual quality iteration toward Andreion reference (color richness, density)
- [ ] explore color palette presets / LUT-style color grading
- [ ] evaluate THREE.Points sufficiency vs splat rendering for Phase 2
- [ ] harden the Python BG removal service for actual deployment (dedicated venv/container, model warmup, licensing notes, app-route end-to-end smoke test against a real upload)
- [ ] further split deferred ML/runtime chunks inside the demo bundle if first-interaction load time is still too heavy

## Later (Phase 2+)

- character animation: video→point cloud body prototype + mesh hands for interactions
- temporal coherence research for video→point cloud
- animated surface binding (barycentric coordinates) as fallback character approach
- MediaPipe → driven mesh pipeline as alternative character approach
- pre-recorded animation clip library (idle, tea, chess, gestures)
- train compartment scene (Caden models in Blender)
- AI character integration (provider abstraction, conversation system, action tags)
- website layer with point-based visual language
- mobile optimization
