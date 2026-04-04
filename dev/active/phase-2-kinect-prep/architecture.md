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

### Browser ML preprocessing
- `src/lib/engine/preprocessing/BackgroundRemoval.ts`
- `src/lib/engine/preprocessing/backgroundRemovalClient.ts`
- `src/lib/engine/preprocessing/backgroundRemoval.worker.ts`
- `src/lib/engine/preprocessing/DepthEstimation.ts`
- `src/lib/engine/preprocessing/depthEstimationClient.ts`
- `src/lib/engine/preprocessing/depthEstimation.worker.ts`
- `src/lib/engine/preprocessing/webgpu-probe.ts`

### App-layer sequence sources
- `src/lib/browser/imageEncoding.ts`
- `src/lib/browser/imageEncodingClient.ts`
- `src/lib/browser/imageEncoding.worker.ts`
- `src/lib/demo/pointSequenceSources.ts`
- `src/lib/demo/pointSequencePlayback.ts`
- `src/lib/demo/imageSampling.ts`
- `src/lib/demo/imageSamplingClient.ts`
- `src/lib/demo/imageSampling.worker.ts`
- `src/lib/demo/rgbdDerivedSequence.ts`
- `src/lib/demo/rgbdDerivedSequenceClient.ts`
- `src/lib/demo/rgbdDerivedSequence.worker.ts`
- `src/lib/demo/rgbdSequenceTypes.ts`
- `src/lib/demo/rgbdSequenceSources.ts`
- `src/lib/demo/rgbdSequencePlayback.ts`
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
- RGBD sequence preparation is workerized.
- Image-mode sample preparation is also workerized once raster/depth data is available.
- Derived-image RGBD clip baking is also workerized once raster/depth inputs are ready.
- Browser image serialization/encoding is also workerized where the browser supports `Worker` + `createImageBitmap` + `OffscreenCanvas`.
- Browser BG model inference is also workerized where the browser supports `Worker` + `createImageBitmap` + `OffscreenCanvas`.
- Browser depth-estimation model inference is also workerized where the browser supports `Worker` + `createImageBitmap` + `OffscreenCanvas`.
- Playback is still main-thread.
- Raw point-sequence loading is still main-thread.

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

## Measured Raw ITOP Ceiling

Measured on 2026-04-04 with Headless Chromium 146.0.7680.164 against the production preview build.

- `itop-side-test-short`
  - 24 frames
  - 503 ms startup
  - 4.34 MiB payload
  - 3.91 MiB prepared CPU
  - 0.17 MiB playback buffer
  - 24.04 MiB browser UA memory after GC

- `itop-side-test-medium`
  - 48 frames
  - 870 ms startup
  - 8.72 MiB payload
  - 7.86 MiB prepared CPU
  - 0.17 MiB playback buffer
  - 28.00 MiB browser UA memory after GC

- `itop-side-test-long`
  - 96 frames
  - 1.38 s startup
  - 17.42 MiB payload
  - 15.71 MiB prepared CPU
  - 0.17 MiB playback buffer
  - 35.74 MiB browser UA memory after GC

Interpretation:
- the current eager raw-point path is still acceptable for these bounded rehearsal clips
- the memory growth is dominated by fetched frame bytes plus prepared per-frame `SampleSet` storage, not playback-buffer residency
- chunked/streaming playback should stay parked until a future clip materially exceeds this envelope

## Immediate Technical Debt / Open Edges

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
