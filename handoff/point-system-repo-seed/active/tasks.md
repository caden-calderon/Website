# Point-System Tasks

## Completed

- lock the art direction (dense pointillism, Andreion reference)
- lock the stack (SvelteKit + Threlte 8 + raw Three.js engine)
- define the project structure (single repo, engine in `src/lib/engine/`)
- define the initial engine architecture (pipeline, adapters, renderer)
- define Phase 1 scope (two tracks: 3D mesh + 2D image)
- research Andreion's technique (pre-rendered Processing/p5.js dithering)
- research optimal stack (Three.js + Threlte validated as best fit)
- document everything for Codex review
- complete Codex architecture review
- clarify ship stance: both experiential and functional layers are required before public launch
- clarify mobile stance: website-first fallback is acceptable while desktop remains the full target
- clarify AI stance: launch-critical, but later than engine/scene/style validation
- scaffold Phase 1 feasibility implementation (engine core, scene, controls, tests)
- correct `MeshAdapter` world-space sampling so transformed meshes/glTF nodes render correctly
- preserve stable IDs and UV metadata in current ingest adapters where available
- fix uploaded-image blob URL cleanup in the demo page
- add mesh ingest tests for transforms, normals, IDs, UVs, and material colour fallback

## Next (Phase 1)

- [ ] evaluate the visual result against the Andreion reference before expanding scope
- [ ] reduce initial route chunk size by splitting/lazy-loading the heavy Threlte demo from the site shell
- [ ] add direct tests for `ImageAdapter`
- [ ] add direct tests for `GLPointRenderer` buffer reuse/update/disposal behavior
- [ ] decide whether to keep `THREE.Points` as the Phase 1 renderer or move sooner to splat-like rendering
- [ ] create/source test assets (simple glTF model + reference image)
- [ ] tighten the typed content graph/manifests for projects, routes, train props, and AI knowledge

## Later (Phase 2+)

- animated surface binding (barycentric coordinates)
- MediaPipe / Blender body-matching pipeline
- pre-recorded animation clip library
- video/webcam ingest with temporal coherence
- train compartment scene (Blender)
- AI character integration
- website layer with point-based visual language
- mobile 3D optimization
