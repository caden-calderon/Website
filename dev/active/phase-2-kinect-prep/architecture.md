# Phase 2 Kinect Prep Architecture

## Purpose

This document is the fast technical map for fresh agents. Read this before exploring the codebase.

## Product Surfaces

There are now two separate playback surfaces and they must stay separate:

1. Raw point-cloud playback
- Purpose: truth/debug/stress testing
- Source examples: synthetic PLY sequence, converted ITOP body clips
- Browser path: manifest + frame files -> app fetch policy -> `FrameSequenceLoader` -> `FrameSequence`

2. Stylized RGBD sampling
- Purpose: product-facing art direction and Kinect look development
- Source examples: manifest-backed RGBD clips, derived-image RGBD rehearsal clips
- Browser path: color/depth frames -> app-layer RGBD prep -> prepared `SampleSet[]` -> `FrameSequenceLoader` -> `FrameSequence`

Do not collapse these into one abstraction. The raw path is the benchmark path. The stylized path is the art path.

## Core Engine Contracts

### `SampleSet.count`
- `count` is the authoritative active-prefix contract
- typed arrays may be over-allocated
- renderers and playback code must treat capacity separately from active count

### Engine boundaries
- Engine does not own URL routing, static asset layout, or fetch policy
- Engine receives bytes or prepared `SampleSet[]`
- Dataset conversion/downsampling policy stays outside the engine

### Playback runtime
- `FrameSequence` owns one shared mutable playback buffer
- `tick(deltaMs)` only recopies frame data when the visible frame changes
- `FrameSequenceLoader` validates manifests and builds playback from:
  - prepared `SampleSet[]`
  - `ArrayBuffer[]`
  - frame-loading callbacks

## Important File Layout

### Sequence runtime
- `src/lib/engine/animation/types.ts`
- `src/lib/engine/animation/FrameSequence.ts`
- `src/lib/engine/animation/FrameSequenceLoader.ts`

### Ingest
- `src/lib/engine/ingest/PlyAdapter.ts`
- `src/lib/engine/ingest/RasterAdapter.ts`
- `src/lib/engine/ingest/ImageAdapter.ts`

### App-layer sequence sources
- `src/lib/demo/pointSequenceSources.ts`
- `src/lib/demo/pointSequencePlayback.ts`
- `src/lib/demo/rgbdSequenceTypes.ts`
- `src/lib/demo/rgbdSequenceSources.ts`
- `src/lib/demo/rgbdSequencePlayback.ts`
- `src/lib/demo/rgbdDerivedSequence.ts`
- `src/lib/demo/rgbdSequencePrepClient.ts`
- `src/lib/demo/rgbdSequencePrep.worker.ts`

### Demo integration
- `src/lib/demo/assets.ts`
- `src/lib/demo/PointEngineDemo.svelte`
- `src/lib/ui/Controls.svelte`
- `src/lib/scene/PointCloudScene.svelte`

### Local asset serving
- `src/lib/server/pointSequenceSources.ts`
- `src/lib/server/rgbdSequenceSources.ts`
- `src/routes/api/point-sequences/[sequence]/[...asset]/+server.ts`
- `src/routes/api/rgbd-sequences/[sequence]/[...asset]/+server.ts`

### Offline tooling
- `scripts/convert-itop-to-point-sequences.py`
- `scripts/generate-test-ply.mjs`
- `scripts/generate-test-rgbd-sequence.mjs`

## Current Data Formats

### Point-sequence manifest
- Defined in `src/lib/engine/animation/types.ts`
- Used for synthetic and converted ITOP clips

### RGBD sequence manifest
- Defined in `src/lib/demo/rgbdSequenceTypes.ts`
- App-layer only by design
- Carries:
  - `fps`
  - `frameCount`
  - `frameTimestampsMs`
  - `frames[{ colorFile, depthFile? }]`
  - clips
  - raster/depth metadata
  - coordinate system / units / processing / capture metadata

## Current Demo Assets

### Raw point sequences
- `synthetic-pulse`
- `itop-side-test-short`
- `itop-side-test-medium`
- `itop-side-test-long`

### RGBD sequences
- `procedural-rgbd-portrait`
  - manifest-backed synthetic RGBD clip
- `pearl-earring-rgbd-study`
  - derived-image RGBD rehearsal clip
  - built from a still image plus optional BG removal and depth estimation

## Derived-Image RGBD Flow

Used for art-direction rehearsal before Kinect hardware:

1. Load a still image asset
2. Optionally apply BG removal
3. Optionally estimate depth
4. Build a bounded RGBD clip by depth-aware warping
5. Prepare sampled frames
6. Build `FrameSequence`

Files involved:
- `src/lib/demo/rgbdDerivedSequence.ts`
- `src/lib/demo/PointEngineDemo.svelte`

## Workerized Prep Flow

Expensive RGBD prep now runs off the main thread.

### Why
- Weighted Voronoi on long/high-density RGBD clips can take minutes
- Main-thread preparation caused “page unresponsive” browser warnings

### Split
1. Main thread:
- load assets
- choose models/settings
- fetch manifest/frames
- build final `FrameSequence`
- update UI/progress state

2. Worker:
- prepare RGBD frames into sampled `SampleSet[]`
- emit progress + rough ETA

### Files
- `src/lib/demo/rgbdSequencePlayback.ts`
- `src/lib/demo/rgbdSequencePrepClient.ts`
- `src/lib/demo/rgbdSequencePrep.worker.ts`

### Scope
Only RGBD sequence preparation is workerized right now. Playback is still main-thread. Raw point-sequence loading is still main-thread.

## Sequence Controls

### Raw point-sequence controls
- clip select
- play/pause/restart
- density cap
- sequence look preset
- auto-center / fit-height / manual scale

### RGBD sequence controls
- clip select
- play/pause/restart
- image-sampling algorithm
- sample count
- depth scale
- normal displacement
- density contrast
- radius/variation
- outlier suppression
- auto-center / fit-height / manual scale

### Derived-image RGBD ML controls
- BG removal on/off
- browser/server provider
- browser BG model
- server BG model
- depth estimation on/off
- depth model

Manifest-backed RGBD clips do not expose live BG/depth preprocessing controls because those clips are already precomputed.

## Current Constraints

- Do not preload whole datasets into the browser
- Keep dataset conversion policy outside the engine
- Keep body playback separate from hand overlay work
- Do not let the engine grow URL-pattern or asset-routing policy
- Do not let the “stylized RGBD” path erase the “raw truth/debug” path

## Immediate Technical Debt / Open Edges

### Still missing measurements
- actual startup/memory numbers for `itop-side-test-short`
- actual startup/memory numbers for `itop-side-test-medium`
- actual startup/memory numbers for `itop-side-test-long`

### Still not workerized
- image-mode sampling prep
- image-mode weighted Voronoi
- browser BG preprocessing/image serialization path
- browser depth-estimation path

### Still not built
- real Kinect RGBD clip export path
- offline stylized RGBD baking path for final playback
- hand-landmark alignment into point-cloud / RGBD space

## Recommended Reading Order For A Fresh Agent

1. `dev/active/phase-2-kinect-prep/plan.md`
2. `dev/active/phase-2-kinect-prep/context.md`
3. `dev/active/phase-2-kinect-prep/architecture.md`
4. `dev/active/phase-2-kinect-prep/next.md`
5. `dev/active/phase-2-kinect-prep/tasks.md`
