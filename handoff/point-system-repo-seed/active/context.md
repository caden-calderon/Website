# Point-System Context

## Current Direction

Art direction is locked: dense pointillism/stipple rendering inspired by Andreion de Castro's Amazon Conflux. Colored points on dark backgrounds, density carries form, restrained bloom for luminosity.

Evolved from ASCII → dithering → points/surfels. This is the final visual direction.

## What Exists Now (March 21, 2026)

The Phase 1 feasibility scaffold is built and producing compelling results. Both tracks (3D mesh and 2D image) work through the same engine and renderer.

### Engine (`src/lib/engine/`, zero Svelte deps)

- **Core**: `SampleSet` canonical data structure with typed arrays (positions, colors, radii, opacities, + optional ids, normals, orientations, velocities, anchors, barycentrics, uv)
- **Ingest**: `MeshAdapter` (glTF → world-space surface samples) + `ImageAdapter` (image → stipple with ML depth, outlier suppression, luminance radius)
- **Algorithms**: rejection sampling (fast) + CDF importance sampling (better density), both with seeded PRNG and density gamma control
- **Processing**: composable `Pipeline` with `ColorProcessor` (HSL grading, contrast)
- **Rendering**: `GLPointRenderer` implementing `RendererAdapter`, custom GLSL shaders with extensive live-tunable controls
- **Preprocessing**: lazy-loaded ML modules for background removal and depth estimation

### Shader Controls (all live-tunable via uniforms)

- Point size (direct pixel or perspective-scaled)
- Exposure/brightness (RGB multiply, preserves saturation)
- Saturation (0–5, applied in HSL before exposure)
- Dark cutoff (fade dark points into black background, 0–1)
- Color noise (per-point hue/saturation jitter for broken-color pointillist look)
- Hue shift (global palette rotation)
- Warmth (color temperature, cool blue ↔ warm amber)
- Edge sharpness (soft gaussian ↔ hard circle)
- Additive vs normal blending toggle
- Opacity, depth fade

### ML Preprocessing (browser-side, lazy-loaded)

- **Background removal**: `@imgly/background-removal` (~40MB ONNX model). Toggle on/off, cached after first run.
- **Depth estimation**: `@huggingface/transformers` with Depth Anything V2. 6 model options from DA V2 Small q8 (27MB, fast) to MiDaS DPT-Hybrid (500MB). Creates true 3D displacement from 2D images — understands scene geometry, not just brightness.
- **Normal displacement**: computes surface normals from depth gradients, displaces points laterally for volumetric form (arms look cylindrical, faces rounded).

### Image Adapter Features

- Outlier suppression (kill isolated bright points in dark neighborhoods)
- Luminance-based radius scaling (bright = larger points)
- Density gamma for contrast control
- ML depth map integration (overrides luminance-based depth when available)
- Normal-based lateral displacement

### App Layer

- SvelteKit + Threlte 8 scaffold
- `UnrealBloomPass` post-processing (custom render loop via `useTask`)
- Full controls UI (scrollable, all parameters, ML preprocessing buttons with loading state)
- Mesh mode (procedural torus knot) + image mode (upload + process)

### Tests & Quality

- 22 tests passing (SampleSet, algorithms, pipeline, mesh adapter)
- 0 type errors, 0 warnings
- TypeScript strict mode, no `any` escape hatches

## Key Decisions Made

- **Art style**: Dense colored pointillism, NOT sparse point clouds or ASCII
- **Visual reference**: [Andreion — Amazon Conflux](https://andreion.com/amazon-conflux)
- **Stack**: SvelteKit + Threlte 8 + raw Three.js engine core (confirmed, working)
- **Renderer**: `THREE.Points` + custom `ShaderMaterial`, behind `RendererAdapter` interface
- **ML depth**: Depth Anything V2 Small q8 as default, 6 models available. DA V2 Base fp16 produces noticeably better detail (cloth wrinkles, facial features) but is slower.
- **Background removal**: `@imgly/background-removal` (AGPL). Works well for artwork and photos.
- **Content architecture**: typed content graph/manifests defined (interfaces only, per agreed scope)
- **AI character**: launch-critical, but not Phase 1. Provider abstraction, not hard-coded vendor.
- **Project structure**: single repo, engine in `src/lib/engine/` with zero framework deps
- **Quality bar**: FAANG-level from the start

## Visual Quality Status

The renderer is approaching the Andreion reference quality. Key remaining gaps:
- Colors still slightly less vibrant than Andreion's (his work likely has additional color processing in the offline pipeline)
- Our work is real-time and interactive, which is significantly more ambitious than his pre-rendered approach
- The dark cutoff + outlier suppression + color noise combination gets close to the reference look when tuned well

## What Happens Next

1. Continue iterating on visual quality (color richness, density)
2. Source proper test assets (Blender glTF models, high-res classical paintings)
3. Phase 2: animated surface binding for character work
4. Phase 3: website + content integration
5. Phase 4: AI character integration
