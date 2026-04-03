# Point-System Architecture

## Guiding Principles

- Sample-runtime first, app-second. The sample core is the platform; everything else consumes it.
- One canonical sample representation, source-specific ingest paths, app-specific consumers.
- Framework-agnostic engine — zero Svelte imports in the engine directory.
- The current image+mesh point-engine demo is a real product surface, not throwaway scaffolding.
- Rendering is only one subsystem. Content mapping, character state, and the website shell are first-class concerns.
- Modular and customizable — every visual parameter is a tunable knob.
- Quality from day one — strict TypeScript, typed arrays, clean interfaces, proper disposal.

## Stack (Confirmed, Working)

| Layer | Technology | Status |
|-------|-----------|--------|
| App shell | SvelteKit | Working |
| 3D scene | Threlte 8 | Working |
| Point engine | Raw Three.js + TypeScript | Working |
| Mesh sampling | `MeshSurfaceSampler` | Working |
| Post-processing | `UnrealBloomPass` | Working |
| Renderer | `THREE.Points` + custom `ShaderMaterial` | Working, behind `RendererAdapter` |
| Background removal | `@imgly/background-removal` | Working (lazy-loaded, ~40MB) |
| Depth estimation | `@huggingface/transformers` + Depth Anything V2 | Working (6 models, lazy-loaded) |
| Assets | Curated glTF + public-domain image presets | Working |
| Content system | Typed manifests/content graph | Types defined |
| LLM backend | SvelteKit server routes | Planned |
| Styling | Tailwind CSS v4 | Working |
| Testing | Vitest | 60 tests passing |

## Project Structure (Actual)

```
WebsiteV2/
├── src/
│   ├── lib/
│   │   ├── engine/                        # Point engine (framework-agnostic)
│   │   │   ├── core/
│   │   │   │   ├── SampleSet.ts                # create/clone helpers
│   │   │   │   └── types.ts                    # SampleSet interface
│   │   │   ├── ingest/
│   │   │   │   ├── MeshAdapter.ts              # glTF mesh → world-space samples
│   │   │   │   ├── ImageAdapter.ts             # image → stipple (with ML depth, outliers)
│   │   │   │   └── types.ts
│   │   │   ├── algorithms/
│   │   │   │   ├── rejection-sampling.ts       # Fast weighted rejection
│   │   │   │   ├── importance-sampling.ts      # CDF-based importance sampling
│   │   │   │   ├── weighted-voronoi.ts         # CVT-style stippling sampler
│   │   │   │   └── types.ts
│   │   │   ├── preprocessing/
│   │   │   │   ├── BackgroundRemoval.ts        # @imgly/background-removal wrapper
│   │   │   │   └── DepthEstimation.ts          # Transformers.js depth + normals
│   │   │   ├── processing/
│   │   │   │   ├── Pipeline.ts                 # Composable processor chain
│   │   │   │   ├── ColorProcessor.ts           # HSL grading
│   │   │   │   └── types.ts
│   │   │   ├── render/
│   │   │   │   ├── adapters/
│   │   │   │   │   └── GLPointRenderer.ts      # THREE.Points + custom ShaderMaterial
│   │   │   │   ├── shaders/
│   │   │   │   │   ├── point.vert.glsl         # Position hash, attenuation, depth fade
│   │   │   │   │   └── point.frag.glsl         # Color noise, HSL, exposure, dark cutoff
│   │   │   │   └── types.ts                    # RenderParams, BloomParams, RendererAdapter
│   │   │   ├── animation/                       # PLANNED: Frame-sequence playback
│   │   │   │   ├── types.ts                     # FrameData, AnimationClip, PlaybackMode
│   │   │   │   ├── FrameSequence.ts             # Buffer-reuse playback controller
│   │   │   │   ├── FrameSequenceLoader.ts       # Sequence builder from caller-provided frame data
│   │   │   │   └── index.ts
│   │   │   └── index.ts                        # Public API
│   │   ├── content/
│   │   │   └── types.ts                        # ProjectManifest, ContentMapping, ContentGraph
│   │   ├── character/                          # PLANNED: Character behavior + conversation orchestration
│   │   │   ├── director/                       # CharacterDirector, AnimationDirector, InteractionDirector
│   │   │   ├── memory/                         # Session/content/character memory helpers
│   │   │   ├── llm/                            # Provider abstraction + structured output parsing
│   │   │   └── types.ts                        # Character behavior contracts
│   │   ├── scene/
│   │   │   ├── Bloom.svelte                    # UnrealBloomPass + custom render loop
│   │   │   └── PointCloudScene.svelte          # Camera, controls, mounts renderer
│   │   └── ui/
│   │       └── Controls.svelte                 # Full parameter controls panel
│   ├── routes/
│   │   ├── +layout.svelte
│   │   └── +page.svelte                        # Demo page (mesh + image modes)
│   └── app.html, app.css, app.d.ts
├── tests/engine/                              # engine-focused coverage
├── tests/services/                            # service/app-layer coverage
├── python/
│   ├── bg_remove_service/                     # Local FastAPI BG removal (BiRefNet/BRIA)
│   └── kinect_capture/                        # PLANNED: Kinect V2 capture + processing
│       ├── capture.py                         # libfreenect2 wrapper + mock capture
│       ├── process.py                         # Depth backprojection, PLY export via Open3D
│       ├── hands.py                           # MediaPipe hand landmark extraction
│       └── requirements.txt
├── dev/
│   └── active/
│       ├── phase-2-kinect-prep/               # Multi-session planning + execution docs
│       └── character-director/                # Behavior, interaction, and LLM contract docs
├── scripts/                                   # local dev tooling (e.g. dev:full)
├── handoff/                                   # Architecture docs, planning, legacy
└── package.json, vite.config.ts, tsconfig.json
```

## Engine Pipeline

```
Source Image → [BG Removal] → [Depth Estimation] → ImageAdapter → SampleSet → Pipeline → GLPointRenderer
Source Mesh  →                                      MeshAdapter  → SampleSet → Pipeline → GLPointRenderer
PLY File     →                                      PlyAdapter   → SampleSet ─┐
PLY Sequence Manifest + frame resolver → FrameSequenceLoader → FrameSequence (shared playback buffer) → SampleSet → GLPointRenderer
```

### Product Surfaces

- **Standalone project surface**: the existing image+mesh point-engine demo can ship inside the portfolio as its own featured project
- **Shared runtime surface**: the same engine continues forward into Kinect playback, character animation, and the future train-compartment experience

This repo therefore has to optimize for both immediate standalone quality and long-term engine cleanliness.

### Character Behavior Architecture

- `LLMAdapter` produces structured conversational output, not low-level clip commands
- `CharacterDirector` arbitrates behavior state, attention, variation, and interruption policy
- `AnimationDirector` chooses concrete clip variants from behavior families
- `InteractionDirector` runs authored interaction recipes for props like cups, chess pieces, and laptop gestures
- body playback and hand interaction overlays stay separate systems

This separation is required to keep the AI layer natural without coupling language generation directly to scene mechanics.

### Preprocessing (optional, lazy-loaded)

- **Background removal**: `@imgly/background-removal`. Converts image to blob internally (survives revoked URLs). Returns transparent-alpha image. ~40MB model on first use.
- **Depth estimation**: Depth Anything V2 via `@huggingface/transformers`. 6 model options from 27MB to 500MB. Converts to data URL internally. Returns normalised 0–1 depth map.
- **Normal computation**: derives surface normals from depth gradients for lateral volumetric displacement.

### Core Data Structure

```typescript
interface SampleSet {
  ids?: Uint32Array          // stable identity for temporal coherence
  positions: Float32Array    // [x,y,z, ...] stride 3
  colors: Float32Array       // [r,g,b, ...] stride 3
  radii: Float32Array        // per-sample footprint
  opacities: Float32Array    // per-sample opacity
  normals?: Float32Array     // surface normals
  uv?: Float32Array          // source coordinates
  count: number
  // + orientations, velocities, anchors, barycentrics for future use
}
```

`count` is authoritative. Consumers must treat only the prefix `[0, count)` as active, and must not assume typed-array length is exactly equal to `count`. This matters for reusable playback buffers and future streaming paths.

### Animation Runtime Contract

- `PlyAdapter` stays pure: `ArrayBuffer -> SampleSet`
- `FrameSequenceLoader` should not own browser fetch patterns; callers provide frame data or frame-loading callbacks
- `FrameSequence` owns one mutable playback `SampleSet` sized to the maximum frame capacity
- `tick(deltaMs)` advances time but only recopies frame data when the frame index changes
- renderers must distinguish typed-array capacity from active sample count
- sequence assets should carry a sidecar manifest: fps, frame count, timestamps, clip definitions, coordinate system, units, and processing metadata

### Kinect Capture Contract

- use `libfreenect2` registration as the source of truth for depth/color alignment
- do not treat Kinect V2 color-camera parameters as a generic extrinsic matrix
- either use registration helpers that directly yield XYZRGB points, or use undistorted depth plus IR intrinsics for XYZ and registration output only for color sampling
- persist calibration and processing metadata alongside captured sequences so later website/runtime layers can trust the assets

### Character Interaction Contract

- the point-cloud body is primarily prerecorded playback
- hands are separate controllable overlays for interaction-critical actions
- props use explicit ownership and socketing rather than ad hoc transforms
- interactions are recipe-driven, not general-purpose freeform manipulation
- the LLM suggests intent; the director layer decides whether and how the interaction actually happens

### Renderer Controls (Shader Uniforms)

| Control | Type | Description |
|---------|------|-------------|
| pointSize | float | Direct pixel size or base for attenuation |
| sizeAttenuation | bool | Perspective scaling on/off |
| brightness | float | RGB exposure/gain (preserves saturation) |
| saturation | float | HSL saturation multiplier (0–5) |
| opacity | float | Global opacity |
| depthFade | float | Opacity falloff with camera distance |
| edgeSharpness | float | Hard circle (1) vs soft gaussian (0) |
| darkCutoff | float | Fade dark points into background (0–1) |
| colorNoise | float | Per-point hue/saturation jitter (0–0.3) |
| hueShift | float | Global palette rotation (0–1) |
| warmth | float | Color temperature (-1 cool to +1 warm) |
| additiveBlending | bool | Additive (glowy) vs normal (true color) |

### Depth Models Available

| Model | Size | Quality | Speed |
|-------|------|---------|-------|
| DA V2 Small q8 | 27MB | Good | Fast |
| DA V2 Small fp16 | 50MB | Good+ | Fast |
| DA V2 Base q8 | 102MB | Better | Medium |
| DA V2 Base fp16 | 195MB | Best | Medium |
| MiDaS DPT-Hybrid | 500MB | Different | Slow |
| DA V1 Small | 99MB | Baseline | Medium |

## Design Constraints

- Engine has zero framework dependencies (no Svelte, no Threlte)
- Source adapters separated from render runtime
- `THREE.Points` is the first renderer, not the architectural end state
- Preserve stable point correspondence for temporal coherence
- Treat `SampleSet.count` as active draw count; typed arrays may be over-allocated for buffer reuse
- Asset loading concerns live above the pure engine where possible
- Keep LLM/provider logic out of the renderer and ingest/runtime core
- Clean disposal patterns everywhere
- TypeScript strict mode, no `any`
- Engine-side ML preprocessing is lazy-loaded and browser-side; optional server inference stays in the app layer behind a route boundary

## Main Risks

1. **Kinect capture integration** — bindings, registration correctness, and calibration artifacts are the main near-term risk
2. **Renderer buffer semantics** — variable-count animation only stays efficient if capacity and active count are handled cleanly
3. **Temporal coherence for animation assets** — not as hard as ML depth video, but still a future quality frontier
4. **Behavior orchestration** — natural conversation, animation variation, and prop interactions need a clean director layer or the system will become brittle
5. **Product cohesion** — making the standalone demo, the functional site, and the train experience feel like one family requires deliberate packaging
6. **Renderer migration cost** — later surfel/splat quality or WebGPU may require a second renderer
