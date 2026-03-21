# Point-System Architecture

## Guiding Principles

- Sample-runtime first, app-second. The sample core is the platform; everything else consumes it.
- One canonical sample representation, source-specific ingest paths, app-specific consumers.
- Framework-agnostic engine — zero Svelte imports in the engine directory.
- Rendering is only one subsystem. Content mapping, character state, and the website shell are first-class architectural concerns.
- Modular and customizable — every visual parameter is a tunable knob.
- Quality from day one — strict TypeScript, typed arrays, clean interfaces, proper disposal.
- No premature optimization, but no lazy allocations in hot paths either.

## Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| App shell | SvelteKit | Routing, SSR, API endpoints. Caden knows it deeply. |
| 3D scene | Threlte 8 | Declarative Svelte 5 bindings for Three.js. Scene graph, camera, events, interactive objects. |
| Point engine | Raw Three.js + TypeScript | Framework-agnostic sample runtime with pluggable ingest and renderer adapters. |
| Mesh sampling | `MeshSurfaceSampler` | Built into Three.js. Area-weighted random sampling from mesh surfaces. |
| Post-processing | `UnrealBloomPass` | Mature, performant selective bloom. Migrate to TSL `bloom()` when moving to WebGPU. |
| Renderer | WebGL2 (Phase 1) | Start with `THREE.Points`, but keep a renderer adapter boundary so instanced splats can replace it when quality or platform constraints require it. |
| Assets | Blender → glTF/GLB | Standard pipeline, well-supported by Three.js `GLTFLoader`. |
| Content system | Typed manifests/content graph | Projects, website sections, train props, and AI knowledge share one source of truth. |
| Character layer | Animation state machine + provider abstraction | Character logic, action tags, and clip binding stay decoupled from model/vendor selection. |
| LLM backend | SvelteKit server routes | Provider abstraction over character models. Rate limiting, session management, and prompt assembly live here. |
| Styling | Tailwind CSS | Website layer styling. Point-based visuals stay in WebGL. |
| Testing | Vitest | Engine unit tests. |

### Why Threlte + Raw Three.js (Not Either/Or)

Threlte manages the scene — train compartment, props, camera, events, lifecycle, interactive objects.

The point engine is a plain TypeScript module that produces render primitives. A concrete renderer mounts into Threlte via:

```svelte
<T is={renderer.getPrimitive()} />
```

The engine doesn't know Threlte exists. If we ever extract it into a standalone package, nothing changes.

### Why WebGL2 First

- `THREE.Points` with variable `gl_PointSize` works perfectly in WebGL2
- WebGPU only supports 1-pixel point primitives — would require instanced quads from day one
- WebGL2 is simpler to debug, more tutorial resources
- Performance ceiling is more than adequate for 100k-500k points
- Three.js `WebGPURenderer` fallback helps exploration, but migration is not low-risk because `ShaderMaterial`-driven point renderers will need a different implementation strategy

## Project Structure

```
WebsiteV2/
├── src/
│   ├── lib/
│   │   ├── engine/                    # Point engine (framework-agnostic)
│   │   │   ├── core/
│   │   │   │   ├── SampleSet.ts            # Canonical sample data structure
│   │   │   │   ├── SampleBuffer.ts         # GPU buffer management
│   │   │   │   └── types.ts
│   │   │   ├── ingest/
│   │   │   │   ├── MeshAdapter.ts          # glTF mesh → samples
│   │   │   │   ├── ImageAdapter.ts         # 2D image → samples
│   │   │   │   ├── VideoAdapter.ts         # (later) video → samples
│   │   │   │   └── types.ts
│   │   │   ├── algorithms/
│   │   │   │   ├── voronoi-stipple.ts      # Weighted Voronoi benchmark path
│   │   │   │   ├── fast-distribution.ts    # Fast interactive image sampling
│   │   │   │   ├── poisson-disk.ts         # Poisson disk sampling
│   │   │   │   └── types.ts
│   │   │   ├── processing/
│   │   │   │   ├── Pipeline.ts
│   │   │   │   ├── DensityProcessor.ts
│   │   │   │   ├── ColorProcessor.ts
│   │   │   │   └── types.ts
│   │   │   ├── render/
│   │   │   │   ├── adapters/
│   │   │   │   │   ├── GLPointRenderer.ts
│   │   │   │   │   ├── InstancedSplatRenderer.ts
│   │   │   │   │   └── types.ts
│   │   │   │   ├── shaders/
│   │   │   │   │   ├── point.vert.glsl
│   │   │   │   │   └── point.frag.glsl
│   │   │   │   ├── PostProcessing.ts
│   │   │   │   └── types.ts
│   │   │   └── index.ts
│   │   ├── content/                   # Project/content graph and manifests
│   │   ├── character/                 # Character state, clip metadata, provider abstractions
│   │   ├── scene/
│   │   ├── ui/
│   │   ├── llm/
│   │   ├── stores/
│   │   └── utils/
│   ├── routes/
│   │   ├── +layout.svelte
│   │   ├── +page.svelte
│   │   ├── api/
│   │   │   └── chat/+server.ts
│   │   └── (site)/
│   │       ├── about/
│   │       ├── projects/
│   │       └── contact/
│   └── app.html
├── static/
│   └── assets/
├── tests/
│   └── engine/
├── svelte.config.js
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Engine Design

### Pipeline

```
Source → IngestAdapter → SampleSet → ProcessingPipeline → RendererAdapter → RenderPrimitive
```

### Core Data Structure

All sample data is backed by typed arrays — no object-per-sample allocations:

```typescript
interface SampleSet {
  ids?: Uint32Array             // stable identity for temporal coherence
  positions: Float32Array       // [x,y,z, x,y,z, ...] stride 3
  colors: Float32Array          // [r,g,b, r,g,b, ...] stride 3
  radii: Float32Array           // per-sample footprint radius
  opacities: Float32Array       // per-sample opacity
  normals?: Float32Array        // optional, for lighting/orientation
  orientations?: Float32Array   // optional tangent frame / anisotropy data
  velocities?: Float32Array     // optional, for temporal effects
  anchors?: Uint32Array         // optional source-specific anchor indices
  barycentrics?: Float32Array   // optional mesh surface attachment
  uv?: Float32Array             // optional image/video coordinates
  count: number
}
```

Not every adapter fills every field. Static image paths may only need `positions`, `colors`, `radii`, and `opacities`. Mesh and character paths should preserve enough metadata to support stable re-projection and later animation binding.

### Ingest Adapters

Each source type implements a common interface:

```typescript
interface IngestAdapter<TSource, TOptions> {
  sample(source: TSource, options: TOptions): SampleSet
  update?(source: TSource, existing: SampleSet): SampleSet
}
```

Phase 1 adapters:

- `MeshAdapter` — loads glTF, samples points from mesh surfaces using `MeshSurfaceSampler`
- `ImageAdapter` — takes a source image, runs a selectable sampling algorithm, produces colored samples

Later adapters:

- `VideoAdapter` — temporal sample advection with persistence across frames
- `LiveAdapter` — real-time variant of `VideoAdapter`

### Algorithms

Pluggable sampling algorithms, selectable at runtime:

- **Weighted Voronoi stippling** — organic density variation, iterative (slower, higher quality). Best as a static/offline quality benchmark.
- **Fast primitive distribution / blue-noise-like approaches** — faster, more uniform, and a better default for interactive iteration.
- **Poisson disk sampling** — even distribution with minimum distance constraint. Good for mesh surfaces.

Each algorithm implements:

```typescript
interface StippleAlgorithm {
  readonly name: string
  generate(input: AlgorithmInput, options: AlgorithmOptions): StippleResult
}
```

### Processing Pipeline

Composable chain of sample processors:

```typescript
interface SampleProcessor {
  readonly name: string
  process(cloud: SampleSet, params: ProcessorParams): SampleSet
}
```

Processors:

- `DensityProcessor` — thin or densify regions
- `ColorProcessor` — HSL adjustments, saturation, brightness, contrast, color mapping

The pipeline is a simple ordered list. Add/remove/reorder processors without touching other code.

### Renderer Adapters

```typescript
interface RendererAdapter {
  setSamples(samples: SampleSet): void
  updateUniforms(params: RenderParams): void
  getPrimitive(): THREE.Object3D
  dispose(): void
}

class GLPointRenderer implements RendererAdapter {
  constructor(options: RendererOptions)
  setSamples(samples: SampleSet): void
  updateUniforms(params: RenderParams): void
  getPrimitive(): THREE.Points
  dispose(): void
}
```

Phase 1 uses `GLPointRenderer` backed by `THREE.Points`. The architecture should leave room for `InstancedSplatRenderer` when oriented footprints, surfel behavior, or future platform constraints make that necessary.

Core renderer controls:

- `pointSize` — base size
- `sizeAttenuation` — perspective scaling toggle
- `sizeRange` — min/max clamp
- `brightnessMultiplier`
- `saturationMultiplier`
- `globalOpacity`
- `depthFade` — opacity falloff with distance

GPU buffer management:

- typed arrays map directly to `BufferAttribute`
- `needsUpdate` flags only when data actually changes
- buffer reuse — don't reallocate when only uniforms change
- proper `dispose()` on all geometries, materials, and textures

### Post-Processing

- `UnrealBloomPass` for glow
- selective bloom — apply only to points, not DOM overlays
- configurable: strength, radius, threshold

### Content Graph

The rendering runtime is not enough on its own. Chromatic needs a typed content graph that maps:

- project metadata → website routes/cards
- project metadata → train props/interactions
- project metadata → AI knowledge/context
- project metadata → showcase runtime selection

Without this layer, the engine remains clean but the actual portfolio integration becomes ad hoc.

### Character Layer

The character should sit behind explicit interfaces:

- clip library metadata
- animation state machine
- action tags from dialogue
- model/provider abstraction for backend inference

The AI character is launch-critical, but it should not dictate Phase 1 engine design beyond these interfaces.

### Customization Controls

All visual parameters are reactive — change a value, see the result immediately:

| Category | Parameters |
|----------|-----------|
| Sampling | Algorithm selection, density/count, seed |
| Point size | Base size, min/max, attenuation curve, per-point randomization |
| Color | Hue shift, saturation, brightness, contrast, color mapping |
| Opacity | Global opacity, depth falloff, edge fade |
| Bloom | Strength, radius, threshold |
| Motion | Jitter amount, drift speed (atmospheric) |

## Design Constraints

- Engine must have zero framework dependencies (no Svelte, no Threlte)
- Source adapters are separated from the render runtime
- `THREE.Points` is the first renderer implementation, not the architectural end state
- preserve stable point correspondence for temporal coherence
- mesh/character paths should preserve enough source metadata to support later animation binding
- no product-layer hacks in ingest paths
- clean disposal patterns everywhere (Three.js memory leaks are the #1 footgun)
- TypeScript strict mode, no `any` escape hatches

## Main Risks

1. **Temporal coherence for video/animation** — stable sample identity across frames is the hardest technical problem. Mesh animation is tractable through surface attachment; video/live input likely needs optical flow, advection, decay, and reseeding rather than naive per-frame restippling.
2. **Renderer migration cost** — `THREE.Points` is excellent for feasibility, but later surfel/splat quality or WebGPU support will require a second renderer implementation.
3. **Weighted Voronoi stippling performance** — iterative algorithm, potentially slow for high point counts. Better treated as an offline benchmark than the default interactive path.
4. **Product cohesion** — making the website layer, world layer, and AI character feel like one product requires a strong content graph and careful design iteration, not just a renderer.
