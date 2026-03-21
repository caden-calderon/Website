# Point-System Plan

## Goal

Build a point-sampled runtime that serves as the visual foundation for Chromatic — a portfolio experience combining a 3D train world, an AI character, and a functional website, all unified by dense stipple/pointillist rendering.

## Current State

Phase 1 feasibility is largely proven. Both tracks produce compelling results:
- **Track A (3D mesh)**: procedural torus knot with world-space sampling, bloom, orbit controls
- **Track B (2D image)**: image upload with importance sampling, ML depth estimation, background removal, volumetric displacement

The engine architecture supports both source types cleanly through the same `RendererAdapter` interface.

## What's Working

- `SampleSet` → `IngestAdapter` → `ProcessingPipeline` → `RendererAdapter` pipeline
- Two sampling algorithms (rejection + importance) with density gamma
- `GLPointRenderer` with 15+ live-tunable shader uniforms
- ML background removal and depth estimation (6 model options)
- Normal-based lateral displacement for volumetric form
- Full controls UI

## Remaining Phase 1 Work

- Source proper test assets (actual Blender glTF model + high-res reference images)
- Add weighted Voronoi stippling as quality benchmark
- Continue color quality iteration toward Andreion reference
- Reduce route chunk size (lazy-load the heavy 3D demo)
- Add ImageAdapter and GLPointRenderer tests

## Success Criteria

- the look approaches the Andreion Conflux reference quality
- both 3D and 2D sources produce compelling results through the same renderer
- ML depth creates convincing 3D form from 2D images
- the architecture extends without rewrites
- customization knobs produce meaningfully different visual results
- TypeScript strict, no `any`, proper disposal, typed arrays throughout

## Architecture Shape

```
Source Image → [BG Removal] → [Depth Estimation] → ImageAdapter → SampleSet → Pipeline → GLPointRenderer
Source Mesh  →                                      MeshAdapter  → SampleSet → Pipeline → GLPointRenderer
```

Engine lives in `src/lib/engine/` — pure TypeScript + Three.js, zero Svelte imports.
