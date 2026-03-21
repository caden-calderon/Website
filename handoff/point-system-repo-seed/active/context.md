# Point-System Context

## Current Direction

Art direction is locked: dense pointillism/stipple rendering inspired by Andreion de Castro's Amazon Conflux. Colored points on dark backgrounds, density carries form, restrained bloom for luminosity.

Evolved from ASCII → dithering → points/surfels. This is the final visual direction.

## Key Decisions Made

- **Art style**: Dense colored pointillism, NOT sparse point clouds or ASCII
- **Visual reference**: [Andreion — Amazon Conflux](https://andreion.com/amazon-conflux)
- **Stack**: SvelteKit + Threlte 8 + raw Three.js engine core
- **Renderer strategy**: WebGL2 first with `THREE.Points` as the initial renderer implementation, but behind a renderer adapter boundary so splats/surfels can replace it later
- **Canonical representation**: point-sampled core with optional surfel-oriented attributes for meshes/characters
- **Content architecture**: typed content graph/manifests are required early so site, train props, and AI share one source of truth
- **AI character**: launch-critical, but not Phase 1 implementation work
- **AI backend**: provider abstraction first; final vendor/model choice stays flexible until character integration
- **Project structure**: single repo, engine in `src/lib/engine/` with zero framework deps
- **Phase 1 scope**: two tracks — 3D mesh and 2D image, proving the runtime works on both
- **Ship stance**: public launch requires both experiential and functional layers
- **Mobile stance**: website-first support on mobile; desktop remains the target for the full experience until the 3D layer is proven performant enough
- **Customizability**: highly modular, all visual params tunable at runtime
- **Quality bar**: FAANG-level code quality from the start — strict TS, typed arrays, clean interfaces

## Technical Defaults

- Renderer: `THREE.Points` + custom `ShaderMaterial` for the first feasibility pass
- First 3D asset path: Blender mesh → glTF → `MeshSurfaceSampler`
- First 2D asset path: fast interactive image sampling
- Quality benchmark path: source image → weighted Voronoi stippling
- Post-processing: `UnrealBloomPass`
- Testing: Vitest for engine unit tests

## Review Findings

Andreion's Conflux work is pre-rendered (Processing/p5.js → MP4/PNG). Not real-time. Chromatic's goal is real-time and interactive, which is significantly more ambitious.

- Weighted Voronoi stippling is appropriate as a quality benchmark, not the default live path
- fast primitive distribution / blue-noise-like approaches are better default candidates for interactive iteration
- mesh/character rendering likely wants optional surfel-style attributes rather than permanently limiting the system to bare isotropic dots
- video/live input should be treated as a later adapter problem built around temporal persistence and advection, not as the constraint that defines Phase 1

## Review Outcome

Claude's feasibility scaffold is now in place and has passed a staff-level review pass. The core corrections from review:

- `MeshAdapter` now samples into world space instead of raw geometry-local space, so transformed glTF-style meshes will not render in the wrong location/orientation
- ingest adapters now preserve more of the canonical sample contract by populating stable `ids`, and image/mesh UVs where available
- the page upload flow now revokes blob URLs instead of leaking browser memory on repeated uploads or teardown
- adapter coverage now includes mesh transform, normal, ID, UV, and material-fallback behaviour

## Residual Risks

- The main route still ships a very large client chunk because the full Three.js/Threlte demo lives directly in `+page.svelte`
- `ImageAdapter` and `GLPointRenderer` still lack direct unit coverage
- the current controls/demo shell are feasibility-grade and not yet aligned with the longer-term website/app-shell separation

## Next Steps

1. Evaluate the visual result and rendering quality now that ingest correctness is fixed
2. Split or lazy-load the heavy demo route so the eventual site shell is not coupled to the entire 3D stack on first paint
3. Add direct tests for `ImageAdapter` and `GLPointRenderer` resource/update behaviour
4. Decide whether the current `THREE.Points` renderer is visually sufficient before broadening scope
