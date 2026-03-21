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

### Engine Implementation
- scaffold SvelteKit + Threlte 8 project
- implement SampleSet data structure with typed arrays
- implement MeshAdapter with world-space sampling, IDs, UVs, normals, material fallback
- implement ImageAdapter with importance/rejection sampling
- implement GLPointRenderer with custom GLSL shaders
- implement processing Pipeline + ColorProcessor
- implement bloom post-processing (UnrealBloomPass via custom Threlte render loop)
- implement content graph types (interfaces only)

### Visual Quality Iteration
- fix point size slider (attenuation constant was too aggressive)
- switch from additive to normal blending (colors no longer wash out)
- add edge sharpness control (hard circle vs soft gaussian)
- add dark cutoff (fade dark points into black background)
- fix brightness to be exposure/gain (preserves saturation)
- add color noise (per-point hue/saturation jitter for broken-color effect)
- add hue shift and warmth (color temperature) controls
- add outlier suppression (kill isolated bright specs in dark regions)
- add luminance-based radius scaling
- add density gamma for contrast control

### ML Preprocessing
- integrate @imgly/background-removal (browser-side, ~40MB model)
- integrate @huggingface/transformers with Depth Anything V2 for depth estimation
- add 6 depth model options (DA V2 Small/Base × q8/fp16 + MiDaS + DA V1)
- implement depth-to-normals for lateral displacement (volumetric form)
- fix blob URL revocation bug (convert to blob/dataURL before passing to ML)

### Code Quality
- fix MeshAdapter world-space sampling bug
- fix blob URL lifecycle leaks
- add mesh ingest tests (transforms, normals, IDs, UVs, material fallback)
- 22 tests passing, 0 type errors, 0 warnings

## Next

- [ ] source proper test assets (Blender glTF model with real geometry + high-res classical paintings)
- [ ] continue visual quality iteration toward Andreion reference
- [ ] add weighted Voronoi stippling as quality benchmark algorithm
- [ ] add direct tests for ImageAdapter and GLPointRenderer
- [ ] reduce initial route chunk size (lazy-load Threlte demo)
- [ ] explore color palette presets / LUT-style color grading
- [ ] evaluate THREE.Points sufficiency vs splat rendering for Phase 2

## Later (Phase 2+)

- animated surface binding (barycentric coordinates)
- MediaPipe / Blender body-matching pipeline for character animation
- pre-recorded animation clip library
- video/webcam ingest with temporal coherence
- train compartment scene (Caden models in Blender)
- AI character integration (provider abstraction, conversation system)
- website layer with point-based visual language
- mobile optimization
