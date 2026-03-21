# Point-System Plan

## Goal

Build a point-sampled runtime that serves as the visual foundation for Chromatic — a portfolio experience combining a 3D train world, an AI character, and a functional website, all unified by dense stipple/pointillist rendering.

## Core Product Decision

The sample runtime is the platform, but a shippable product also requires a first-class content graph and character layer. The website, train experience, AI character, and all future source adapters are consumers of the same underlying systems.

## Phase 1 Build Target

Two parallel proof tracks sharing one engine:

### Track A — 3D Mesh → Samples

- load a static glTF test asset
- sample 50-100k points from mesh surfaces (`MeshSurfaceSampler`)
- render via `THREE.Points` with custom `ShaderMaterial`
- black background, per-point color, bloom

### Track B — 2D Image → Samples

- load a source image
- run a fast interactive sampling path first
- add weighted Voronoi stippling as the quality benchmark path
- render through the same renderer abstraction
- same controls, same look

### Shared Infrastructure

- `SampleSet` typed-array data structure with room for stable IDs and source anchors
- `IngestAdapter` interface with `MeshAdapter` and `ImageAdapter`
- renderer adapter interface with `THREE.Points` as the first implementation
- typed content graph/manifests
- `UnrealBloomPass` post-processing
- Svelte UI for parameter controls
- SvelteKit + Threlte 8 scaffold

## Architecture Shape

```
Source → IngestAdapter → SampleSet → ProcessingPipeline → RendererAdapter → RenderPrimitive
```

Engine lives in `src/lib/engine/` — pure TypeScript + Three.js, zero Svelte imports. Content manifests and character interfaces sit beside it as first-class systems rather than being postponed to the app layer.

## Stack

- SvelteKit (app shell, routing, API endpoints)
- Threlte 8 (scene management, camera, events)
- raw Three.js + TypeScript (point engine core)
- WebGL2 renderer (Phase 1)
- Vitest (engine tests)

## Customization Requirements

Every visual parameter must be tunable at runtime:

- algorithm (Voronoi / blue noise / Poisson), density, count
- point size (base, min/max, attenuation, randomization)
- color (hue, saturation, brightness, contrast)
- opacity (global, depth falloff)
- bloom (strength, radius, threshold)
- motion (jitter, drift)

## Success Criteria

- the look matches the Andreion Conflux reference quality (dense, painterly, luminous)
- both 3D and 2D sources produce compelling results through the same renderer abstraction
- the architecture is clean enough to extend without rewrites
- the architecture leaves room for content mirroring and character integration without a second foundational redesign
- customization knobs produce meaningfully different visual results
- TypeScript strict, no `any`, proper disposal, typed arrays throughout
