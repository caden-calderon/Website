# Phase 2 Kinect Prep Context

## Date

2026-04-07

## Purpose

The Kinect hardware is now physically available, but the production ingestion direction has become clearer:

- primary art path: recorded video + offline depth estimation
- parallel truth/R&D path: real Kinect registered RGBD capture/export

The goal of Phase 2 is now to finish both paths without confusing their roles.

## Current Position

- Phase 1 image+mesh point-engine demo is complete enough to stand alone as a featured portfolio project
- the same engine is still the long-term base for character playback and the broader Chromatic experience
- raw point playback and stylized RGBD playback are now both working in-browser

## Read This Next

- `dev/active/phase-2-kinect-prep/architecture.md`
- `dev/active/phase-2-kinect-prep/next.md`
- `dev/active/phase-2-kinect-prep/tasks.md`
- `dev/active/phase-2-kinect-prep/datasets.md` if hardware is still unavailable

## Key Decisions Still In Force

- variable-count animation needs renderer hardening first; the old assumption about `setDrawRange()` alone was incomplete
- `SampleSet.count` must become the authoritative active prefix contract
- `FrameSequenceLoader` should not own URL-pattern fetch logic inside the engine
- PLY parsing needs type-aware color normalization and strict unsupported-format handling
- Kinect registration must be the alignment source of truth
- sequence assets need a sidecar manifest for timing and coordinate metadata
- raw point-cloud playback remains the truth/debug/stress-test path
- stylized RGBD sampling remains a separate app-layer surface above shared engine primitives
- the hybrid iPhone/Kinect path stays explicitly optional; do not assume overlapping RGB/depth capture until there is a concrete calibration plan

## Current State Summary

- `main` now includes the browser-side completion work plus the Kinect scaffold follow-up commits `4fb7cfa`, `185ea78`, and `413c632`
- `PlyAdapter`, `FrameSequence`, `FrameSequenceLoader`, and `GLPointRenderer` are in place and covered by tests
- synthetic point-sequence playback works in-browser
- bounded ITOP clips can be converted into manifest + frame-file directories and loaded in the demo
- actual Chromium measurements are now recorded for `itop-side-test-short`, `itop-side-test-medium`, and `itop-side-test-long`
- the demo now supports both raw point-sequence assets and RGBD-sequence assets
- RGBD sequence preparation is workerized with progress + rough ETA
- image-mode sample preparation is now workerized with progress + rough ETA
- derived-image RGBD clip baking is now workerized with progress + rough ETA
- browser image serialization/encoding for BG upload, BG PNG prep, and depth JPEG prep is now workerized when supported
- browser BG model inference is now workerized when the browser supports `Worker` + `createImageBitmap` + `OffscreenCanvas`
- browser depth-estimation model inference is now workerized when the browser supports `Worker` + `createImageBitmap` + `OffscreenCanvas`
- derived-image RGBD rehearsal is in place as a bridge to future Kinect RGBD clips
- `python/kinect_capture/process.py` can now emit a mock Kinect-style registered RGBD clip in the same manifest/frame layout the browser already consumes
- `python/kinect_capture/capture.py mock-bundle` now writes a raw registered capture bundle and `python/kinect_capture/process.py export-rgbd` converts that bundle into browser RGBD assets
- `python/kinect_capture/capture.py`, `python/kinect_capture/hands.py`, and `python/kinect_capture/README.md` now exist as the first Python scaffold for the hardware phase
- the Kinect hardware is now physically present, but the repo still needs the real libfreenect2 bring-up and first registration/export spike
- `Kinect2Dataset.zip` and `MultiViewDataset.zip` are now present locally as accessible Kinect v2 rehearsal data
- `scripts/convert-utd-to-point-sequences.py` now converts selected UTD depth+skeleton `.mat` clips into the existing point-sequence manifest + PLY layout
- local UTD rehearsal clips `utd-kinect2-high-wave`, `utd-kinect2-hand-clap`, and `utd-multiview-front-throw` now exist under `tmp/point-sequences/`
- the UTD archives are useful for the raw point/body rehearsal branch, but they do not provide registered color frames for the stylized RGBD branch
- a fallback shortlist of non-hardware RGBD/body rehearsal datasets is now recorded in `dev/active/phase-2-kinect-prep/datasets.md`
- the browser demo now includes the uploaded recorded-video RGBD rehearsal path (`recorded-video-rgbd-study`) with user-tunable fps and frame-cap controls
- this recorded-video path has already been validated informally on a short butterfly clip and is the current best match for the desired art style
- the current model direction is:
  - browser preview: `DA V2 Base (fp16)` in the existing demo
  - first offline/final video-depth target: `Video Depth Anything`
  - secondary per-frame comparison target: `Depth Pro`
- the current infrastructure direction is:
  - first remote provider: `Runpod Pods`
  - first GPU target: `A100 80GB`
  - fallback GPU target: `H100 80GB` if speed matters more than cost
  - do not start with TPU for the current first-choice model
- the first remote bake has now been proven on a `Runpod A100 PCIe 80GB` pod using `Metric-Video-Depth-Anything-Large`
- the proven artifact contract from that bake is:
  - original source video remains local
  - baked depth comes back as `*_depths.npz`
  - the `npz` currently stores one `depths` array shaped `(frames, height, width)` in `float32`
  - `PLY` frames, preview videos, and EXR frames are optional side artifacts, not the primary ingest contract
- reusable pod scripts now live in:
  - `scripts/runpod/setup-video-depth-anything.sh`
  - `scripts/runpod/run-vda-metric-large.sh`
- the local offline converter now also exists:
  - `scripts/convert-video-depth-npz-to-rgbd-sequence.py`
  - input: `video.mp4 + *_depths.npz`
  - output: `tmp/rgbd-sequences/<clip-id>/manifest.json + color/depth frame JSON files`
  - the converter keeps full-clip duration while applying explicit output controls for target fps, max frame count, and max edge
- local manifest-backed RGBD studies under `tmp/rgbd-sequences/<id>` are now discovered automatically by the app layer:
  - server asset resolution no longer requires hard-coding each converted study
  - the demo fetches `/api/rgbd-sequences` and merges discovered local manifest clips into the sequence picker
- local smoke outputs currently exist outside git at:
  - `tmp/rgbd-sequences/vda-butterfly-study`
  - `tmp/rgbd-sequences/vda-body-study`
- `pnpm check` and `pnpm test` are green
- the ITOP `.gz` data files and generated `tmp/` outputs are local artifacts and are not committed

## Recorded Browser Measurements

Measured on 2026-04-04 with Headless Chromium 146.0.7680.164 against `pnpm run preview`, using `pnpm run measure:itop-browser`.

- `itop-side-test-short`
  - startup: 503 ms total
  - fetch / parse / prep / build: 285 / 174 / 43 / 1 ms
  - payload / prepared CPU / playback buffer: 4,552,287 B (4.34 MiB) / 4,103,712 B (3.91 MiB) / 173,736 B (0.17 MiB)
  - points/frame: 4,698-4,826 original and prepared
  - browser memory after GC: 10.31 MiB `performance.memory.usedJSHeapSize`, 24.04 MiB `measureUserAgentSpecificMemory()`

- `itop-side-test-medium`
  - startup: 870 ms total
  - fetch / parse / prep / build: 466 / 334 / 68 / 2 ms
  - payload / prepared CPU / playback buffer: 9,140,374 B (8.72 MiB) / 8,240,004 B (7.86 MiB) / 176,868 B (0.17 MiB)
  - points/frame: 4,698-4,913 original and prepared
  - browser memory after GC: 14.07 MiB `performance.memory.usedJSHeapSize`, 28.00 MiB `measureUserAgentSpecificMemory()`

- `itop-side-test-long`
  - startup: 1,384 ms total
  - fetch / parse / prep / build: 594 / 657 / 131 / 2 ms
  - payload / prepared CPU / playback buffer: 18,263,372 B (17.42 MiB) / 16,470,720 B (15.71 MiB) / 181,260 B (0.17 MiB)
  - points/frame: 4,584-5,035 original and prepared
  - browser memory after GC: 21.96 MiB `performance.memory.usedJSHeapSize`, 35.74 MiB `measureUserAgentSpecificMemory()`

## Current Conclusion

- the eager full-sequence raw-point path is still acceptable for the current bounded ITOP clips
- the shared playback-buffer design is doing its job; the playback residency stays nearly flat while payload/prepared storage scales with frame count
- chunked/streaming playback is not the next step for the current ITOP rehearsal assets
- the pre-hardware browser-side heavy work is now complete
- the Kinect RGBD export contract is now defined at two layers:
  - `capture.py` raw registered bundle
  - `process.py export-rgbd` browser manifest export
- both layers are smoke-testable without hardware and route through the existing RGBD manifest/source path
- the next real architecture step is replacing the mock capture bundle with real libfreenect2 registration output once hardware arrives
- the accessible UTD Kinect v2 archives now make the raw point/body rehearsal branch concrete without further data requests
- stylized RGBD rehearsal still depends on registered color + depth, so the real Kinect registration/export spike remains the critical hardware-dependent step
- an additional pre-hardware art-first rehearsal branch now exists: uploaded recorded video -> offline browser frame sampling -> per-frame depth estimation -> existing RGBD prep/playback path
- the first pass for that uploaded-video branch is intentionally bounded but now user-tunable in the demo: fps target, frame cap, 640 px max edge, depth-estimation optional, no per-frame BG removal yet
- production direction is now explicit:
  - use recorded video + depth estimation as the primary art/animation ingestion path
  - keep the Kinect path alive as a real-depth/truth/R&D branch
  - do not force the Kinect-only look into the primary art pipeline
- the first serious offline execution plan is now:
  - rent a Runpod GPU pod
  - run `Metric-Video-Depth-Anything-Large`
  - bake depth outputs offline
  - route the results back into the existing RGBD prep/playback path
- the pod setup friction is now understood, so the repo should own reusable setup/run scripts instead of repeating manual package/debug work

## Most Important Gaps

- real registered Kinect RGBD clips are not in the browser path yet
- hand-landmark alignment is still not designed
- the uploaded-video RGBD branch still needs real clip tuning/measurement with local recorded footage
- the offline/server depth-bake path is not implemented yet, so stronger video models are not in the production loop yet

## Immediate Next Step

Continue with the remaining next-session detail in `dev/active/phase-2-kinect-prep/next.md`, now centered on both of these in parallel:

- bring up the first real Kinect registration/export spike
- define the first offline video-depth bake path for recorded video as the main art-direction branch
