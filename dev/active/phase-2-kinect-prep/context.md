# Phase 2 Kinect Prep Context

## Date

2026-04-04

## Why This Exists

Hardware arrives in about a week. The goal is to finish the architecture and scaffolding work that does not depend on the Kinect being physically present.

## Current Repo Position

- Phase 1 image+mesh point-engine demo is complete enough to stand alone as a featured portfolio project
- the same engine is still the long-term base for character playback and the broader Chromatic experience
- handoff docs now reflect that dual role explicitly

## Review Outcomes Incorporated

- variable-count animation needs renderer hardening first; the old assumption about `setDrawRange()` alone was incomplete
- `SampleSet.count` must become the authoritative active prefix contract
- `FrameSequenceLoader` should not own URL-pattern fetch logic inside the engine
- PLY parsing needs type-aware color normalization and strict unsupported-format handling
- Kinect registration must be the alignment source of truth
- sequence assets need a sidecar manifest for timing and coordinate metadata

## Near-Term Unknowns

- whether the current Python `freenect2` binding path is smooth enough or needs a thinner native bridge/spike
- exact point counts and memory pressure of real captured clips
- the precise alignment workflow for MediaPipe hand landmarks against registered point-cloud space

## Current Integration State

Renderer hardening, PLY ingest, the core playback runtime, pure sequence loading, synthetic sequence generation, and the first browser playback integration are now in place:

- `GLPointRenderer` reuses GPU attributes by typed-array capacity instead of active count
- active draw count and bounds now honor `SampleSet.count` as the authoritative prefix contract
- tests cover fixed-capacity buffers with changing active counts
- `PlyAdapter` parses ASCII and binary little-endian vertex payloads into `SampleSet`
- unsupported PLY formats fail explicitly (`binary_big_endian`, compressed variants, vertex list properties)
- color and alpha normalization now keys off declared scalar types instead of property names alone
- `FrameSequence` owns one shared mutable playback buffer sized to the maximum active frame count
- `tick(deltaMs)` only recopies frame data when the visible frame index changes and exposes that via `copiedFrame`
- loop / once / ping-pong endpoint behavior and clip reset semantics now have explicit tests
- `PointSequenceManifest` now defines timing, clip, coordinate-system, units, processing, and capture metadata
- `FrameSequenceLoader` builds sequences from caller-provided `ArrayBuffer` lists or injected frame callbacks
- asset-fetch and URL-pattern policy still stay outside the engine boundary
- `scripts/generate-test-ply.mjs` now emits a richer synthetic figure-study PLY sequence plus manifest
- the generator CLI now accepts the exact `pnpm generate:test-ply -- --output ...` invocation used from the package script entrypoint
- generated synthetic assets are verified against `FrameSequenceLoader` and the shared-buffer playback path in tests
- local generation entrypoint: `pnpm generate:test-ply -- --output tmp/synthetic-point-sequence`
- generated manifests can optionally carry `frameFiles`, but the app layer still decides how those filenames map to actual fetches
- the default synthetic source now contains `breathing_idle`, `arm_sweep`, and `turntable_pose` clips instead of a single pulse-only motion
- generated frames now vary active point counts across the sequence to keep exercising `SampleSet.count` semantics through browser playback
- app-layer sequence source loading now lives in `src/lib/demo/pointSequenceSources.ts`
- manifest fetching and frame-byte URL resolution stay above the engine and are injected into `FrameSequenceLoader`
- the synthetic browser source is served from `tmp/synthetic-point-sequence` through `/api/point-sequences/synthetic-pulse/...`
- the demo UI now exposes a `sequence` source mode with source selection, clip selection, play/pause, and restart controls
- `PointCloudScene.svelte` now owns the render-loop hook only; playback decisions remain in the demo/app layer
- browser playback now ticks `FrameSequence` through Threlte, pushing shared-buffer updates into `GLPointRenderer` only when `copiedFrame` is true
- new tests cover app-layer point-sequence fetch policy and server-side source path resolution
- `FrameSequenceLoader` now also accepts caller-prepared `SampleSet[]`, which keeps app-side density policy out of the engine without giving up manifest validation
- the demo now has app-layer sequence density reload controls plus sequence auto-centering, fit-height framing, and manual scale controls
- real/synthetic sequence loads now report eager preload timing plus frame payload bytes, prepared CPU memory, playback-buffer estimate, point-count ranges, and bounds
- `PointCloudScene.svelte` now wraps the renderer primitive in a caller-provided transform so framing stays outside the renderer
- `scripts/convert-itop-to-point-sequences.py` now converts bounded ITOP side-view clips into `manifest.json` + frame-file directories under `tmp/point-sequences`
- the ITOP converter uses labels-side segmentation to isolate body points, keeps clip extraction and optional downsampling policy outside the engine, and emits deterministic short / medium / long source IDs
- converted ITOP clips are now wired into the local API/demo source list as `itop-side-test-short`, `itop-side-test-medium`, and `itop-side-test-long`
- `pnpm check` and the full Vitest suite pass after the new app/runtime changes
- the ITOP converter was rehearsed successfully from the shell against a tiny ITOP-shaped HDF5 fixture, but the actual `ITOP_side_test_point_cloud.h5.gz` / `ITOP_side_test_labels.h5.gz` files were not present in the workspace this session
- once the real ITOP files were added, the converter successfully generated all three bounded clips under `tmp/point-sequences`
- current ITOP playback is now good enough to benchmark real-data eager loading, but it also confirmed that sparse point-cloud replay is not the same aesthetic surface as the image pipeline
- the product direction is now explicit: raw point-cloud playback is for truth/debug/stress testing, while the eventual Kinect art surface should come from registered RGB + depth passed through image-style sampling controls
- the next architectural slice is therefore a reusable raster/RGBD sampling adapter underneath `ImageAdapter`, not more styling inside the raw point-sequence path
- that raster/RGBD sampling adapter is now in place as `RasterAdapter`, and `ImageAdapter` is now just a thin browser DOM wrapper around it
- this creates the clean engine boundary we need for future registered Kinect RGBD frames: dense RGBA + real depth can reuse the still-image sampling controls without another ingest refactor
- raw point-cloud playback remains the benchmark/debug path, while stylized RGBD sampling is now established as a separate app/runtime surface above the same engine primitives
- the demo sequence picker now supports both raw point-sequence assets and RGBD-sequence assets through one app-layer asset union
- `src/lib/demo/rgbdSequenceTypes.ts` defines a raster/depth manifest format for bounded RGBD clips without extending engine animation types
- `src/lib/demo/rgbdSequenceSources.ts` now owns RGBD manifest validation plus color/depth frame decoding; URL policy still stays outside the engine
- `src/lib/demo/rgbdSequencePlayback.ts` prepares RGBD clips by sampling raster + depth frames into `SampleSet[]` before handing them to `FrameSequenceLoader`
- sequence controls now branch cleanly by asset kind: raw point clips keep density/look controls, while RGBD clips reuse the image-sampling controls with shared framing/scale controls
- `scripts/generate-test-rgbd-sequence.mjs` now emits a procedural portrait RGBD clip under `tmp/rgbd-sequences/procedural-rgbd-portrait`
- the local API route `/api/rgbd-sequences/[sequence]/[...asset]` now serves bounded RGBD rehearsal assets from `tmp/rgbd-sequences`
- the generated RGBD rehearsal asset is now wired into the demo as `procedural-rgbd-portrait`
- the demo now also includes `pearl-earring-rgbd-study`, a browser-derived RGBD rehearsal clip built from a real portrait asset plus estimated depth and bounded depth-aware warping
- this derived-image RGBD path is the current bridge between still-image art direction and future Kinect RGBD captures: it exercises the same sampling controls against dense color structure without pretending sparse ITOP clouds should carry the final look
- RGBD/image sampling now supports an explicit `alphaCutoff` so masked or semi-transparent sources can reject low-alpha background leakage before playback
- derived-image RGBD sequence assets no longer force background removal or depth estimation automatically; sequence mode now exposes the same browser/server BG-removal and depth-model controls as image mode
- sequence-mode derived RGBD loads now clear preprocessing status once the clip is ready, fixing the stale "Removing background..." status bug
- expensive RGBD sequence preparation now runs in a dedicated worker, keeping the main thread responsive during long weighted-Voronoi or high-density prep runs
- worker progress now feeds the existing status UI with percent complete plus a rough remaining-time estimate for long runs
- the worker split is intentionally narrow: the app layer still owns asset fetch/model choice, the worker only prepares `SampleSet[]`, and `FrameSequenceLoader` still builds playback on the main thread
- new test coverage now exists for RGBD manifest decoding, RGBD sequence preparation, and server-side RGBD source resolution
- new test coverage now also exists for derived-image RGBD clip building and alpha-threshold raster sampling
- verified commands this session:
  - `pnpm generate:test-rgbd -- --output tmp/rgbd-sequences/procedural-rgbd-portrait`
  - `pnpm check`
  - `pnpm test`

## Next Session Target

The code path is now ready for the real-data rehearsal itself and for the first registered Kinect RGBD export once hardware arrives.

- place `ITOP_side_test_point_cloud.h5.gz` and `ITOP_side_test_labels.h5.gz` somewhere local and run `pnpm convert:itop -- --point-cloud ... --labels ... --output-root tmp/point-sequences`
- generate the deterministic `itop-side-test-short`, `itop-side-test-medium`, and `itop-side-test-long` clips first rather than touching a whole split in-browser
- load those converted clips through the demo and record the new startup/memory report values for each density setting
- use those measurements to decide where eager full-sequence preload stops being acceptable
- if the long clip is already clearly too heavy, move next to chunked/streaming playback instead of pushing the current preload path further
- keep using the new RGBD sequence path for art-direction rehearsal, then swap in real registered Kinect RGBD exports when hardware is available
