# Point-System Plan

## Goal

Build a point-sampled runtime that serves two roles at once:

- the visual foundation for Chromatic — a portfolio experience combining a 3D train world, an AI character, and a functional website
- a standalone interactive showcase project that can be featured inside the website alongside other projects

## Current State

Phase 1 feasibility is largely proven. Both tracks produce compelling results:
- **Track A (3D mesh)**: real glTF preset asset + procedural fallback with world-space sampling, bloom, orbit controls
- **Track B (2D image)**: preset artworks or upload with importance / weighted Voronoi sampling, ML depth estimation (6 models), browser or server-side background removal, volumetric displacement

The engine architecture supports both source types cleanly through the same `RendererAdapter` interface. That demo is now strong enough to package as a self-contained portfolio project without abandoning the broader Chromatic roadmap.

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
- Package the Phase 1 demo cleanly as a featured project surface inside the website

## Phase 2 Readiness Decisions

- `SampleSet.count` is the authoritative active prefix; reusable playback buffers may over-allocate typed arrays
- `GLPointRenderer` needs a capacity-aware update path before variable-count animation can be efficient
- `PlyAdapter` stays pure and sequence loading policy stays above the engine
- `FrameSequence` owns one shared mutable playback buffer and only recopies data on frame changes
- sequence assets need a manifest carrying fps, timestamps, clip defs, coordinate system, units, and processing metadata
- Kinect registration is the alignment source of truth for RGB/depth fusion
- `CharacterDirector` should own behavior arbitration between LLM intent, animation families, and prop interactions
- interaction-critical actions should be recipe-driven, with mesh-hand overlays on top of prerecorded body playback

## Architecture Shape

```
Source Image → [BG Removal (browser or server)] → [Depth Estimation (6 models)] → ImageAdapter → SampleSet → Pipeline → GLPointRenderer
Source Mesh  →                                                             MeshAdapter  → SampleSet → Pipeline → GLPointRenderer
PLY File     →                                                             PlyAdapter   → SampleSet → GLPointRenderer
PLY Sequence Manifest + frame loader → FrameSequenceLoader → FrameSequence → SampleSet → GLPointRenderer
```

Engine lives in `src/lib/engine/` — pure TypeScript + Three.js, zero Svelte imports.
