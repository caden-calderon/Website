# Point-System Context

## Current Direction

Art direction is locked: dense pointillism/stipple rendering inspired by Andreion de Castro's Amazon Conflux. Colored points on dark backgrounds, density carries form, restrained bloom for luminosity.

Evolved from ASCII → dithering → points/surfels. This is the final visual direction.

## What Exists Now (March 25, 2026)

The Phase 1 feasibility scaffold is built and producing compelling results. Both tracks (3D mesh and 2D image) work through the same engine and renderer.

### Engine (`src/lib/engine/`, zero Svelte deps)

- **Core**: `SampleSet` canonical data structure with typed arrays (positions, colors, radii, opacities, + optional ids, normals, orientations, velocities, anchors, barycentrics, uv)
- **Ingest**: `MeshAdapter` (glTF → world-space surface samples) + `ImageAdapter` (image → stipple with ML depth, outlier suppression, luminance radius)
- **Algorithms**: rejection sampling (fast) + CDF importance sampling (better density) + weighted Voronoi/CVT sampler for more even high-detail still-image stippling
- **Processing**: composable `Pipeline` with `ColorProcessor` (HSL grading, contrast)
- **Rendering**: `GLPointRenderer` implementing `RendererAdapter`, custom GLSL shaders with 15+ live-tunable uniforms
- **Preprocessing**: lazy-loaded ML modules for background removal (6 browser models + optional server-side BRIA/BiRefNet path) and depth estimation (6 models)

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

- **Background removal**: 6 model options:
  - ISNet (fast) via `@imgly/background-removal` (~10MB, quantized, fastest, works everywhere)
  - ISNet via `@imgly/background-removal` (~40MB, standard quality, works everywhere)
  - ISNet (fp16) via `@imgly/background-removal` (~20MB, best quality without WebGPU, works everywhere)
  - BiRefNet Lite via `@huggingface/transformers` (~115MB, much better quality, MIT, WebGPU only)
  - BEN2 via `@huggingface/transformers` (~219MB, best edges, MIT, WebGPU only)
  - BiRefNet Full via `@huggingface/transformers` (~490MB, highest quality, WebGPU only)
  - Models requiring WebGPU are greyed out when WebGPU is unavailable; fallback chain: webgpu → wasm → ISNet
  - Linux Chrome WebGPU has WGSL shader nesting depth limit that breaks ONNX-generated shaders for BiRefNet/BEN2
- **Depth estimation**: 6 model options via `@huggingface/transformers`:
  - DA V2 Small q8 (27MB, fast, default), Small fp16 (50MB), Base q8 (102MB), Base fp16 (195MB, best detail), MiDaS DPT-Hybrid (500MB), DA V1 Small (99MB)
  - All depth models work on WASM (simpler ONNX operators than BG removal)
  - Depth input is forced opaque (black fill behind transparent BG-removed images) to prevent ONNX errors
- **Normal displacement**: computes surface normals from depth gradients, displaces points laterally for volumetric form
- **Caching**: models cached in browser via Cache API; `env.useBrowserCache = true` set explicitly after dynamic import to fix SSR contamination; persistent storage requested on mount
- **Pipeline caching**: pipeline instances cached by model+dtype+device key — switching between loaded models is instant; BG removal and depth results cached per source image + model index via WeakMap
- **Device fallback**: webgpu-probe.ts determines best ONNX device; 30s timeout on WebGPU, 120s on WASM; automatic retry on fallback device

### Browser Compatibility

- Chromium + working WebGPU (macOS/Windows Chrome): full feature support, all ML models work
- Chromium without WebGPU (Linux Chrome): ISNet BG removal (3 variants), all depth models via WASM
- Firefox/Zen: ISNet BG removal only; depth estimation works via WASM
- COOP/COEP headers set via SvelteKit hooks.server.ts for SharedArrayBuffer (WASM multi-threading)
- UI shows compatibility notice when WebGPU unavailable; model dropdowns visible before enabling features

### App Layer

- SvelteKit + Threlte 8 scaffold
- `pnpm dev:full` now manages the local Python BG service and Vite together from one terminal by loading `.env`, reusing a healthy local service when present, and shutting down managed children cleanly
- route shell now lazy-loads the heavy runtime/demo component so the top-level page entry stays light
- `UnrealBloomPass` post-processing (custom render loop via `useTask`)
- Collapsible controls UI organized into sections: Source, Background (inner/outer), Image, ML Preprocessing, Sampling, Frame, Rendering, Bloom, Settings; widened to avoid horizontal overflow
- Mesh mode supports a real glTF preset plus the procedural fallback; image mode supports curated preset artworks plus upload
- background removal can run via browser inference or an app-layer server proxy backed by a local Python service for BRIA/BiRefNet quality on Linux
- Image preprocessing orchestration runs through one authoritative `rebuildImagePipeline()` path with per-source/model caches and stale-request guards
- Settings persistence via localStorage (save/load/reset)
- Inner/outer background colors: outer via scene.background, inner via PlaneGeometry behind points
- Point-based frame system with 4 styles (rectangle, double, ornate, scattered)
- Tunable point size variation (luminance-based, 0-1 range)
- Cursor-based zoom (zoomToCursor on OrbitControls) with zoom-out cap

### Tests & Quality

- 60 tests passing (SampleSet, merge, algorithms including weighted Voronoi, pipeline, mesh/image adapters, BG removal helpers, app-layer BG service helpers, frame generator styles, GLPointRenderer)
- 0 type errors, 0 warnings
- TypeScript strict mode

### Review Hardening (March 26, 2026)

- `mergeSampleSets()` now preserves optional metadata across mixed inputs instead of dropping `ids`, `uv`, or normals when frame samples are appended to image samples
- merged IDs stay stable where possible and only synthesize new IDs for samples that did not already have one or would collide
- COOP/COEP policy is aligned between Vite dev server and SvelteKit responses (`credentialless`) to keep ML/runtime behavior consistent across environments
- bloom pass rebuilds now dispose replaced passes instead of leaving post-processing resources hanging across reconfiguration

### Phase 1 Extension (March 26, 2026)

- added an app-layer background-removal provider boundary with a SvelteKit proxy route and local Python service scaffold for server-side BRIA/BiRefNet inference
- pinned the Python service requirements to the current shared `ai-env` torch 2.11.x line and verified the service boots locally at `127.0.0.1:9000/healthz`
- fixed the server BG removal UX path: the client now downsizes/compresses uploads before posting, upstream FastAPI `detail` errors are surfaced cleanly, and the response body is no longer read twice on failures
- added the missing BiRefNet runtime deps (`einops`, `timm`) to the Python service requirements and verified a direct local BiRefNet request succeeds after the initial model download
- added real preset demo assets in `static/demo-assets/` and wired preset selection for both mesh and image modes
- added a weighted Voronoi / CVT-style stippling path that can now run across the full image slider range for manual quality/performance testing
- widened the controls panel and removed horizontal scrolling so long labels, selects, and file inputs fit the sidebar cleanly
- added direct `GLPointRenderer` tests for attribute upload/update, uniform updates, and disposal
- verified that the route shell now code-splits cleanly; the remaining large chunks are in the deferred runtime/ML payload, not the route entry
- shared `ai-env` still has some unrelated package drift risk because it is not service-isolated, but the Python service import path, `/healthz`, and a direct BiRefNet request now work after explicitly repairing `httpx` / `anyio`, pinning `transformers` below 4.56, and adding the model-code extras

## Key Decisions Made

- **Art style**: Dense colored pointillism, NOT sparse point clouds or ASCII
- **Visual reference**: [Andreion — Amazon Conflux](https://andreion.com/amazon-conflux)
- **Stack**: SvelteKit + Threlte 8 + raw Three.js engine core (confirmed, working)
- **Renderer**: `THREE.Points` + custom `ShaderMaterial`, behind `RendererAdapter` interface
- **Character animation** (updated April 2026): Kinect V2 → libfreenect2 → Python/Open3D → PLY sequences. Hardware depth (ToF sensor), not webcam ML estimation. MediaPipe hands as parallel track for interaction skeleton. Replaces earlier webcam→depth estimation approach.
- **AI character LLM**: provider abstraction first; candidates MiniMax M2 or DeepSeek V3 for cost + personality, plans to fine-tune
- **Content architecture**: typed content graph/manifests defined (interfaces only)
- **Project structure**: single repo, engine in `src/lib/engine/` with zero framework deps
- **Visual engine status**: Phase 1 complete. Parked as portfolio showcase piece. Will resume visual polish when integrated into main website.
- **Quality bar**: FAANG-level from the start

## Phase 2: Kinect V2 Animation Pipeline (April 2026)

### Capture Pipeline (Python, runs on Linux)
Kinect V2 → libfreenect2 (AUR) → Python wrapper (freenect2). Synchronized RGB (1920x1080) + depth (512x424). Registration API aligns color to depth per pixel.

### Processing
Registered RGB+depth → backproject to XYZRGB point cloud (pinhole camera math, Kinect intrinsics) → background filter via depth threshold → numbered PLY files via Open3D.

### Hands
MediaPipe on RGB frames → 3D hand landmarks per frame → JSON export. Simple mesh hands in Threlte aligned to point cloud.

### Playback (Engine)
New `animation/` module: PLY adapter parses files → FrameSequence manages playback → buffer-reuse SampleSet swap per frame (zero allocation via TypedArray.set()) → GLPointRenderer fast path. Animation clips with loop/once/ping-pong modes.

### Key Architecture
- `PlyAdapter` in `src/lib/engine/ingest/` — new IngestAdapter for ArrayBuffer → SampleSet
- `FrameSequence` in `src/lib/engine/animation/` — pre-allocated buffer playback controller
- `FrameSequenceLoader` — async PLY sequence fetcher with concurrency limiting
- Memory: ~137MB for 300 frames × 20k points. Variable point counts handled via setDrawRange.
- GLPointRenderer.setOrUpdateAttribute already supports in-place buffer updates when count matches.

## Visual Quality Status

The renderer is approaching the Andreion reference quality. Key observations:
- DA V2 Base fp16 depth estimation captures cloth wrinkles and facial features impressively
- Dark cutoff + outlier suppression creates the clean dark→black transitions Andreion achieves
- Color noise adds painterly broken-color richness
- Background removal (BiRefNet Lite on Chromium) provides clean subject isolation
- Colors still slightly less vibrant than Andreion's — his offline pipeline likely has additional color processing
- Our real-time interactive approach is significantly more ambitious than his pre-rendered work
