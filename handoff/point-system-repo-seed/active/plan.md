# Point-System Plan

## Goal

Build a point-sampled runtime that serves as the visual foundation for Chromatic — a portfolio experience combining a 3D train world, an AI character, and a functional website, all unified by dense stipple/pointillist rendering.

## Current State

Phase 1 feasibility is largely proven. Both tracks produce compelling results:
- **Track A (3D mesh)**: procedural torus knot with world-space sampling, bloom, orbit controls
- **Track B (2D image)**: image upload with importance sampling, ML depth estimation (6 models), background removal (4 models), volumetric displacement

The engine architecture supports both source types cleanly through the same `RendererAdapter` interface.

## What's Working

- `SampleSet` → `IngestAdapter` → `ProcessingPipeline` → `RendererAdapter` pipeline
- Two sampling algorithms (rejection + importance) with density gamma
- `GLPointRenderer` with 15+ live-tunable shader uniforms
- ML background removal (4 models: ISNet, BiRefNet Lite, BEN2, BiRefNet Full)
- ML depth estimation (6 models: DA V2 Small/Base × q8/fp16, MiDaS, DA V1)
- Browser compatibility detection + graceful degradation for non-Chromium
- App-shell image preprocessing rebuild path with source/model caches and stale-request protection
- Normal-based lateral displacement for volumetric form
- Full controls UI with model selectors and compatibility notices

## Remaining Phase 1 Work

- Source proper test assets (actual Blender glTF model + high-res reference images)
- Add weighted Voronoi stippling as quality benchmark
- Continue color quality iteration (palette presets, LUT-style grading)
- Reduce route chunk size (lazy-load the heavy 3D demo)
- Add GLPointRenderer tests

## Architecture Shape

```
Source Image → [BG Removal (4 models)] → [Depth Estimation (6 models)] → ImageAdapter → SampleSet → Pipeline → GLPointRenderer
Source Mesh  →                                                            MeshAdapter  → SampleSet → Pipeline → GLPointRenderer
```

Engine lives in `src/lib/engine/` — pure TypeScript + Three.js, zero Svelte imports.
