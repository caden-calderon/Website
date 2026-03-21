# Point-System Handoff

## Status

Phase 1 feasibility scaffold is built and producing compelling results. Both tracks (3D mesh and 2D image) work. ML preprocessing (background removal + depth estimation) is integrated. Visual quality is approaching the Andreion reference with extensive tuning controls.

The repo has had a staff-level Codex review pass. All tests pass. No type errors.

## Read Order

1. `README.md` — project overview, what exists
2. `vision.md` — product vision, art direction, experience structure
3. `architecture.md` — system design, engine structure, stack decisions
4. `roadmap.md` — phased delivery plan
5. `active/context.md` — current state, what's built, what's next (START HERE for implementation context)
6. `active/tasks.md` — completed and upcoming work
7. `active/plan.md` — Phase 1 build target and success criteria

## Quick Start

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm test       # 22 tests
pnpm check      # 0 errors
```

Upload an image → toggle "remove background" → toggle "estimate depth" → adjust depth scale and normal displacement → orbit camera to see 3D form. Tune point size, saturation, dark cutoff, color noise for the Andreion look.

## Legacy Reference

`legacy/CHROMATIC_V2_HANDOFF.md` — the original V2 handoff from the ASCII/text-art era. Much product thinking survives (train compartment, content mirroring, character animation, mobile strategy). The rendering approach has been replaced by points/surfels.

`legacy/vision.md` — transitional vision doc. Superseded by current `vision.md`.

## Key Context for New Agents

- Art direction: [Andreion's Amazon Conflux](https://andreion.com/amazon-conflux) — dense colored pointillism, not sparse point clouds
- Andreion's work is pre-rendered. Ours is real-time and interactive — more ambitious.
- Engine (`src/lib/engine/`) is framework-agnostic — zero Svelte imports
- `THREE.Points` is the first renderer behind `RendererAdapter` interface — splats can follow
- ML preprocessing is lazy-loaded and browser-side: `@imgly/background-removal` + `@huggingface/transformers` (Depth Anything V2)
- Content graph exists as types only — full implementation is later
- AI character is launch-critical but not Phase 1
- Quality bar: strict TypeScript, typed arrays, clean interfaces, proper GPU disposal

## What Was Built This Session

### Engine Core
- `SampleSet` canonical data structure
- `MeshAdapter` + `ImageAdapter` ingest
- Rejection + importance sampling algorithms
- `GLPointRenderer` with extensive custom GLSL
- Processing pipeline + ColorProcessor
- Content graph types

### Visual Quality Controls (all live-tunable)
- Point size, perspective scaling, edge sharpness
- Exposure brightness (preserves saturation), saturation (0–5)
- Dark cutoff, color noise, hue shift, warmth
- Additive/normal blending, opacity, depth fade
- Density gamma, outlier suppression, radius from luminance
- Bloom (strength, radius, threshold)

### ML Preprocessing
- Background removal (toggle, cached)
- Depth estimation (6 models: DA V2 Small/Base × q8/fp16, MiDaS, DA V1)
- Surface normals from depth for lateral volumetric displacement

### Infrastructure
- SvelteKit + Threlte 8 scaffold
- Custom bloom render loop
- 22 tests, 0 errors
