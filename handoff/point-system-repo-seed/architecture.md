# Point-System Architecture

## Guiding Principles

- Sample-runtime first, app-second. The sample core is the platform; everything else consumes it.
- One canonical sample representation, source-specific ingest paths, app-specific consumers.
- Framework-agnostic engine — zero Svelte imports in the engine directory.
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
| Assets | Blender → glTF/GLB | Planned (using procedural geometry for now) |
| Content system | Typed manifests/content graph | Types defined |
| LLM backend | SvelteKit server routes | Planned |
| Styling | Tailwind CSS v4 | Working |
| Testing | Vitest | 48 tests passing |

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
│   │   │   └── index.ts                        # Public API
│   │   ├── content/
│   │   │   └── types.ts                        # ProjectManifest, ContentMapping, ContentGraph
│   │   ├── scene/
│   │   │   ├── Bloom.svelte                    # UnrealBloomPass + custom render loop
│   │   │   └── PointCloudScene.svelte          # Camera, controls, mounts renderer
│   │   └── ui/
│   │       └── Controls.svelte                 # Full parameter controls panel
│   ├── routes/
│   │   ├── +layout.svelte
│   │   └── +page.svelte                        # Demo page (mesh + image modes)
│   └── app.html, app.css, app.d.ts
├── tests/engine/                              # 48 tests
├── handoff/                                   # Architecture docs, planning, legacy
└── package.json, vite.config.ts, tsconfig.json
```

## Engine Pipeline

```
Source Image → [BG Removal] → [Depth Estimation] → ImageAdapter → SampleSet → Pipeline → GLPointRenderer
Source Mesh  →                                      MeshAdapter  → SampleSet → Pipeline → GLPointRenderer
```

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
- Clean disposal patterns everywhere
- TypeScript strict mode, no `any`
- ML preprocessing is lazy-loaded and browser-side (no server dependency)

## Main Risks

1. **Temporal coherence for video/animation** — hardest technical problem for Phase 2+
2. **Renderer migration cost** — later surfel/splat quality or WebGPU may require a second renderer
3. **Product cohesion** — making website + world + character feel like one product requires careful design
4. **Route chunk size** — the demo page currently ships the full Three.js stack; needs lazy-loading before the site shell hardens
