# Point-System Handoff

## Status

Phase 1 feasibility scaffold is built and producing compelling results. Both tracks (3D mesh and 2D image) work. ML preprocessing (background removal with 6 browser models + optional server-side BRIA/BiRefNet path, plus 6 depth models) is integrated. Visual quality is approaching the Andreion reference with extensive tuning controls. Browser compatibility handling is in place.

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
pnpm dev:full   # local BG service + Vite in one terminal
pnpm test       # 60 tests
pnpm check      # 0 errors
```

Pick a mesh or image preset (or upload your own) → toggle "remove background" → choose browser or server provider → toggle "estimate depth" → adjust depth scale and normal displacement → orbit camera to see 3D form. Tune point size, saturation, dark cutoff, color noise for the Andreion look.

**Best experience on Chromium browsers** (Chrome, Edge, Brave, Opera) for full ML model support. Firefox/Zen fall back to ISNet for BG removal.

## Key Context for New Agents

### Art Direction
- Inspired by [Andreion's Amazon Conflux](https://andreion.com/amazon-conflux) — dense colored pointillism, not sparse point clouds
- Andreion's work is pre-rendered (Processing/p5.js). Ours is real-time and interactive.

### Architecture
- Engine (`src/lib/engine/`) is framework-agnostic — zero Svelte imports
- `THREE.Points` is the first renderer behind `RendererAdapter` interface — splats can follow
- Engine-side ML preprocessing is lazy-loaded and browser-side; the optional Python BG removal path lives behind `/api/bg-remove`
- Content graph exists as types only (`src/lib/content/types.ts`)
- AI character is launch-critical but not Phase 1
- Weighted Voronoi/CVT sampling is now open across the full image slider range for manual quality/performance testing; it improves spatial regularity but is slower than importance sampling

### Character Animation Decision
- Hybrid approach: video→point cloud for body (natural, imperfect look), mesh hands for object interaction
- Fallback if temporal coherence unsolvable: MediaPipe→driven 3D mesh
- LLM action tags will trigger hand animation clips for object manipulation

### Browser Compatibility
- BiRefNet/BEN2 BG removal requires Chromium (WebGPU ONNX runtime)
- Non-Chromium browsers show amber warning and grey out unsupported models
- Depth estimation works everywhere via WASM fallback
- All Transformers.js models use `env.useBrowserCache = true` to fix SSR cache contamination
- Linux/high-quality workflow can bypass browser WebGPU entirely via the local Python service behind `/api/bg-remove`
- `pnpm dev:full` now loads `.env`, starts or reuses the local Python BG service, and launches Vite in one terminal
- the local Python service has been boot-verified in `ai-env` on `http://127.0.0.1:9000/healthz`; its runtime deps were repaired (`httpx`, `anyio`, `transformers<4.56`, `einops`, `timm`) and a direct BiRefNet request now succeeds after model download, but `ai-env` is still a shared environment rather than an isolated deployment target

### Code Quality
- TypeScript strict, no `any`, typed arrays, proper GPU disposal
- 60 tests, 0 errors, 0 warnings
- Pipeline instances and preprocessing results cached by model+source
- `mergeSampleSets()` preserves optional metadata across mixed inputs, so image/frame composition no longer drops `ids` or `uv`
- `GLPointRenderer` now has direct adapter-level tests
- Controls panel was widened and constrained to vertical scrolling only so long labels/selects no longer force horizontal scroll

## Legacy Reference

`legacy/CHROMATIC_V2_HANDOFF.md` — original V2 handoff from the ASCII era. Product thinking survives; rendering approach replaced.
`legacy/vision.md` — transitional. Superseded by current `vision.md`.
