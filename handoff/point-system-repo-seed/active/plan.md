# Point-System Plan

## Goal

Build a point-sampled runtime that serves as the visual foundation for Chromatic — a portfolio experience combining a 3D train world, an AI character, and a functional website, all unified by dense stipple/pointillist rendering.

## Current State

Phase 1 feasibility is largely proven. Both tracks produce compelling results:
- **Track A (3D mesh)**: real glTF preset asset + procedural fallback with world-space sampling, bloom, orbit controls
- **Track B (2D image)**: preset artworks or upload with importance / weighted Voronoi sampling, ML depth estimation (6 models), browser or server-side background removal, volumetric displacement

The engine architecture supports both source types cleanly through the same `RendererAdapter` interface.

## What's Working

- `SampleSet` → `IngestAdapter` → `ProcessingPipeline` → `RendererAdapter` pipeline
- Three image sampling algorithms (rejection + importance + weighted Voronoi/CVT)
- `GLPointRenderer` with 15+ live-tunable shader uniforms
- ML background removal (6 browser models + optional server-side BRIA/BiRefNet path)
- ML depth estimation (6 models: DA V2 Small/Base × q8/fp16, MiDaS, DA V1)
- Browser compatibility detection + graceful degradation for non-Chromium
- App-shell image preprocessing rebuild path with source/model caches and stale-request protection
- Normal-based lateral displacement for volumetric form
- Full controls UI with model selectors and compatibility notices
- Controls panel widened to fit content without horizontal scrolling
- Lazy-loaded route shell and real preset demo assets
- Direct GLPointRenderer tests

## Remaining Phase 1 Work

- Continue color quality iteration (palette presets, LUT-style grading)
- Harden the optional Python BG removal service for actual deployment
- Consider a second round of deferred chunk splitting inside the runtime if ML bundle cost is still too high

## Architecture Shape

```
Source Image → [BG Removal (browser or server)] → [Depth Estimation (6 models)] → ImageAdapter → SampleSet → Pipeline → GLPointRenderer
Source Mesh  →                                                             MeshAdapter  → SampleSet → Pipeline → GLPointRenderer
```

Engine lives in `src/lib/engine/` — pure TypeScript + Three.js, zero Svelte imports.
