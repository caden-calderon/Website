# Phase 2 Kinect Prep Tasks

## Foundation

- [x] Harden `GLPointRenderer` for capacity-aware attribute reuse and active-range bounds
- [x] Add tests covering variable active counts with fixed-capacity buffers
- [x] Confirm `SampleSet.count` semantics in engine docs/comments

## PLY Ingest

- [x] Implement `PlyAdapter`
- [x] Support binary little-endian first, ASCII second
- [x] Reject unsupported formats clearly (`binary_big_endian`, list properties in vertex payload, compressed variants)
- [x] Normalize color based on property type, not just property name
- [x] Add parser tests for malformed headers, property reordering, CRLF headers, and missing color data

## Animation Runtime

- [x] Implement animation types and tick result semantics
- [x] Implement `FrameSequence`
- [x] Add clip tests for loop / once / ping-pong endpoint behavior
- [x] Ensure frame data only copies when the visible frame index changes
- [x] Implement `FrameSequenceLoader` with injected frame-loading callbacks
- [x] Define and document the sequence manifest format

## Synthetic Assets

- [x] Generate a synthetic test sequence plus manifest
- [x] Verify browser playback against the shared-buffer runtime
- [x] Expand the synthetic source into a richer multi-clip variable-count sequence

## Next Session Focus

- [x] Add an app/scene integration path that loads a generated `PointSequenceManifest`
- [x] Keep frame fetching in the app layer; pass buffers/callbacks into `FrameSequenceLoader`
- [x] Add a simple way to switch between synthetic data and later real downloaded/Kinect data
- [x] Add sequence density controls in the app layer (`maxPointsPerFrame` / equivalent downsample target)
- [x] Add sequence framing/scale controls so sparse clouds are easier to inspect
- [x] Build an offline ITOP converter targeting manifest + frame-file output
- [x] Start with `ITOP_side_test_point_cloud.h5.gz` plus `ITOP_side_test_labels.h5.gz`
- [x] Extract short bounded clips instead of attempting full-split browser preload
- [x] Measure memory/startup cost of converted real clips in the current eager-loading runtime
- [x] Decide whether chunked/streaming playback is required before trying longer real sequences
- [x] Refactor image sampling into a reusable raster/RGBD adapter beneath `ImageAdapter`
- [x] Define the app/runtime boundary between raw point-cloud playback and stylized RGBD sampling
- [x] Add an app-layer RGBD sequence manifest/source path plus local API route
- [x] Reuse image-style sampling controls for RGBD sequence preparation outside the engine
- [x] Generate and wire a bounded procedural RGBD rehearsal asset for the browser demo
- [x] Add a browser-derived RGBD rehearsal preset from a real portrait image so sequence-mode visuals can approximate the still-image art direction
- [x] Add alpha-threshold sampling for masked RGBD/image sources
- [x] Expose BG-removal and depth-model controls for derived RGBD sequences instead of applying them automatically
- [x] Run RGBD sequence preparation in a worker with progress and rough ETA reporting
- [x] Run image-mode sample preparation in a worker with progress and rough ETA reporting
- [x] Run derived-image RGBD clip baking in a worker with progress and rough ETA reporting
- [x] Run browser image serialization/encoding in a worker where supported
- [x] Run browser BG model inference in a worker where supported
- [x] Run browser depth-estimation model inference in a worker where supported
- [x] Add RGBD manifest/playback/server tests and verify `pnpm check` + `pnpm test`

## Kinect Scaffold

- [x] Create `capture.py`
- [ ] Run a one-frame registration/export spike as soon as hardware arrives
- [x] Create `process.py` scaffold with capture-bundle -> RGBD manifest export
- [x] Create `hands.py`
- [x] Write README/setup notes for Arch Linux and libfreenect2
- [x] Define a raw registered capture-bundle contract between `capture.py` and `process.py`
- [ ] Replace the mock `capture.py` bundle writer with live libfreenect2 registration output once captured frames exist
- [ ] Extend `process.py` from capture-bundle export to live registration-backed XYZRGB export once captured frames exist
- [x] Record the hardware-blocked probe result and fallback non-hardware RGBD/body dataset shortlist in the phase docs
- [ ] Acquire access to a bounded `NTU RGB+D` subset and choose the first rehearsal sample IDs
- [ ] Use `NTU RGB+D` as the preferred pre-hardware Kinect V2 rehearsal dataset
- [ ] Decide whether the first NTU spike is raw/depth/body-only rehearsal or an offline RGB/depth alignment solve for stylized RGBD rehearsal
- [ ] Keep any NTU-specific RGB/depth alignment solve outside the engine and route any resulting registered clip through the existing RGBD manifest/playback path

## Integration

- [x] Wire the sequence runtime into the scene/app layer
- [x] Support both raw point-sequence assets and RGBD-sequence assets in the demo without changing engine playback contracts
- [x] Add a mock Kinect-style RGBD export asset that exercises the planned manifest/source path before hardware arrives
- [ ] Define hand-landmark alignment into point-cloud space
- [ ] Coordinate playback/runtime work with CharacterDirector behavior and interaction contracts
- [ ] Package the Phase 1 demo cleanly as a first-class project inside the website
