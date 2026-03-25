# Point-System Handoff

## Status

Phase 1 feasibility scaffold is built and producing compelling results. Both tracks (3D mesh and 2D image) work. ML preprocessing (background removal with 4 model options + depth estimation with 6 model options) is integrated. Visual quality is approaching the Andreion reference with extensive tuning controls. Browser compatibility handling is in place.

Multiple Codex review passes have been completed. All tests pass. No type errors.

## Read Order

1. `README.md` — project overview, quick start
2. `vision.md` — product vision, art direction, experience structure
3. `architecture.md` — system design, engine structure, stack decisions
4. `roadmap.md` — phased delivery plan
5. `active/context.md` — **START HERE** for current state, what's built, what's next
6. `active/tasks.md` — completed and upcoming work
7. `active/plan.md` — Phase 1 build target and success criteria

## Quick Start

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm test       # 26 tests
pnpm check      # 0 errors
```

Upload an image → toggle "remove background" → toggle "estimate depth" → adjust depth scale and normal displacement → orbit camera to see 3D form. Tune point size, saturation, dark cutoff, color noise for the Andreion look.

**Best experience on Chromium browsers** (Chrome, Edge, Brave, Opera) for full ML model support. Firefox/Zen fall back to ISNet for BG removal.

## Key Context for New Agents

### Art Direction
- Inspired by [Andreion's Amazon Conflux](https://andreion.com/amazon-conflux) — dense colored pointillism, not sparse point clouds
- Andreion's work is pre-rendered (Processing/p5.js). Ours is real-time and interactive.

### Architecture
- Engine (`src/lib/engine/`) is framework-agnostic — zero Svelte imports
- `THREE.Points` is the first renderer behind `RendererAdapter` interface — splats can follow
- ML preprocessing is lazy-loaded and browser-side
- Content graph exists as types only (`src/lib/content/types.ts`)
- AI character is launch-critical but not Phase 1

### Character Animation Decision
- Hybrid approach: video→point cloud for body (natural, imperfect look), mesh hands for object interaction
- Fallback if temporal coherence unsolvable: MediaPipe→driven 3D mesh
- LLM action tags will trigger hand animation clips for object manipulation

### Browser Compatibility
- BiRefNet/BEN2 BG removal requires Chromium (WebGPU ONNX runtime)
- Non-Chromium browsers show amber warning and grey out unsupported models
- Depth estimation works everywhere via WASM fallback
- All Transformers.js models use `env.useBrowserCache = true` to fix SSR cache contamination

### Code Quality
- TypeScript strict, no `any`, typed arrays, proper GPU disposal
- 26 tests, 0 errors, 0 warnings
- Pipeline instances and preprocessing results cached by model+source

## Legacy Reference

`legacy/CHROMATIC_V2_HANDOFF.md` — original V2 handoff from the ASCII era. Product thinking survives; rendering approach replaced.
`legacy/vision.md` — transitional. Superseded by current `vision.md`.
