# Phase 2 Kinect Prep Context

## Date

2026-04-07

## Purpose

The Kinect hardware is now physically available and has been validated with `libfreenect2`/`Protonect`.

The production ingestion direction has changed again based on the first live Kinect test:

- primary production path: Kinect-only registered RGBD capture using the Kinect RGB camera plus Kinect depth
- secondary art/look-dev path: recorded video + offline depth estimation
- optional later upgrade: external-camera/iPhone RGB aligned to Kinect depth only if Kinect RGB proves insufficient

The goal of Phase 2 is now to replace mock capture-control frames with real Kinect registered RGBD frames and route one usable take through the existing capture-bundle -> export-rgbd -> playback path.

## Current Position

- Phase 1 image+mesh point-engine demo is complete enough to stand alone as a featured portfolio project
- the same engine is still the long-term base for character playback and the broader Chromatic experience
- raw point playback and stylized RGBD playback are now both working in-browser

## Read This Next

- `dev/active/phase-2-kinect-prep/architecture.md`
- `dev/active/phase-2-kinect-prep/capture-control.md`
- `dev/active/phase-2-kinect-prep/hybrid-spike.md`
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
- the hybrid iPhone/Kinect path is explicitly deprioritized; do not add external RGB complexity until Kinect-only RGBD has been tested end-to-end and found visually insufficient

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
- `python/kinect_capture/capture.py` now also exposes capture-control commands for:
  - preview
  - explicit record start / stop
  - take list / take review
  - keep / discard / rename
  - trim metadata on edited takes without mutating raw takes
- the capture-control data model now exists locally under:
  - `tmp/kinect-capture/raw-takes/<take-id>/` for immutable raw registered bundles
  - `tmp/kinect-capture/edited-takes/<take-id>.json` for trim/decision metadata
  - `tmp/kinect-capture/preview/latest.json` for the current operator preview frame
- the repo now includes a separate operator-facing route at `/capture-control` plus thin `/api/capture-control/*` endpoints
- the Kinect hardware is physically present and `Protonect` shows live RGB/depth/IR output
- Kinect RGB looks good enough for the first production capture pass, so Kinect-only RGBD is now the primary path
- `/home/caden/libfreenect2` contains the local upstream `libfreenect2` build; `Protonect` was built successfully with the CMake compatibility flag `-DCMAKE_POLICY_VERSION_MINIMUM=3.5`
- the repo now includes a native C++ libfreenect2 helper at `cpp/kinect_capture/kinect_capture_helper.cpp`
- `scripts/build-kinect-capture-helper.sh` builds that helper into `tmp/bin/kinect_capture_helper`
- the helper is currently linked against `/home/caden/libfreenect2/build-turbojpeg` because the first VAAPI-enabled build failed on this machine's unsupported VA profile; the TurboJPEG/CPU path works
- `python3 -m python.kinect_capture.capture probe` now detects the native helper; inside the Codex sandbox it reports `device_count: 0` because USB access is restricted, while an escalated/outside-sandbox helper probe sees Kinect serial `188705633947`
- `python3 -m python.kinect_capture.capture live-bundle --output tmp/kinect-capture/live-kinect-rgbd-smoke --frames 1 --warmup-frames 5 --pipeline cpu` succeeded against the live Kinect
- `python3 -m python.kinect_capture.process export-rgbd --input-dir tmp/kinect-capture/live-kinect-rgbd-smoke --output tmp/rgbd-sequences/live-kinect-rgbd-smoke` succeeded, proving the real Kinect RGBD bundle routes through the existing RGBD export/playback contract
- `Kinect2Dataset.zip` and `MultiViewDataset.zip` are now present locally as accessible Kinect v2 rehearsal data
- `scripts/convert-utd-to-point-sequences.py` now converts selected UTD depth+skeleton `.mat` clips into the existing point-sequence manifest + PLY layout
- local UTD rehearsal clips `utd-kinect2-high-wave`, `utd-kinect2-hand-clap`, and `utd-multiview-front-throw` now exist under `tmp/point-sequences/`
- the UTD archives are useful for the raw point/body rehearsal branch, but they do not provide registered color frames for the stylized RGBD branch
- a fallback shortlist of non-hardware RGBD/body rehearsal datasets is now recorded in `dev/active/phase-2-kinect-prep/datasets.md`
- the browser demo now includes the uploaded recorded-video RGBD rehearsal path (`recorded-video-rgbd-study`) with user-tunable fps and frame-cap controls
- this recorded-video path has already been validated informally on a short butterfly clip and is the current best match for the desired art style
- `python3 -m python.kinect_capture.capture probe` now reports helper availability; normal sandboxed runs may still report `device_count: 0`, but live USB access has been verified outside the sandbox
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
- the first real converted human-clip playback result changed the direction once:
  - the stylized RGBD path works end-to-end in browser for converted VDA clips
  - but monocular/video-depth flattening is still too weak for forward-reaching motion such as an arm extending toward camera
  - this matches the earlier architectural concern that model-estimated depth gives plausible relief, not reliable truth for strong camera-axis motion
  - the current conclusion is that Kinect depth remains necessary for the main production geometry signal
  - so the next primary branch is no longer “better monocular depth first”
- the first live Kinect test changed the direction again:
  - Kinect has usable RGB and depth available at the same time
  - Kinect-only registered RGBD avoids iPhone sync/calibration/parallax complexity
  - the next primary branch is now Kinect-only registered RGBD capture-control, not external-camera hybrid alignment
- the first narrow hybrid spike is now defined in `dev/active/phase-2-kinect-prep/hybrid-spike.md`
- the operator-facing capture-control requirements are now defined in `dev/active/phase-2-kinect-prep/capture-control.md`
- the capture/export scaffold still encodes the optional hybrid contract:
  - `capture.py mock-bundle --color-source external-camera-rgb` writes a mock hybrid-aligned registered bundle
  - `process.py export-rgbd` validates the required external-camera calibration/sync/alignment metadata for that bundle type
  - the exported manifest preserves that metadata while staying on the existing RGBD playback route
- the minimum operator workflow is now scaffolded on the real raw/edited/export shape and can use live Kinect frames when the native helper sees a device:
  - preview -> record / stop -> raw take saved -> immediate review -> keep/discard/rename -> trim metadata
  - `record-start --provider live` / `record-stop` has been smoke-tested against Kinect serial `188705633947`
  - a live stopped take at `tmp/kinect-capture/live-control-stop-smoke-2` wrote `70` immutable raw RGBD frames plus edited metadata, then listed cleanly through `list-takes`
  - that stopped raw take exported through `process.py export-rgbd` to `tmp/rgbd-sequences/live-control-stop-smoke-2` with `70` frames and valid per-frame depth ranges
  - sandboxed/no-device runs still fall back to the mock provider so tests and UI development remain deterministic
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
- the real libfreenect2 registration output path now exists; the next architecture step is validating one intentional reviewed human take through export/playback
- the accessible UTD Kinect v2 archives now make the raw point/body rehearsal branch concrete without further data requests
- stylized RGBD rehearsal still depends on registered color + depth, so the real Kinect registration/export spike remains the critical hardware-dependent step
- an additional pre-hardware art-first rehearsal branch now exists: uploaded recorded video -> offline browser frame sampling -> per-frame depth estimation -> existing RGBD prep/playback path
- the first pass for that uploaded-video branch is intentionally bounded but now user-tunable in the demo: fps target, frame cap, 640 px max edge, depth-estimation optional, no per-frame BG removal yet
- production direction is now revised by the first human playback test:
  - keep recorded video + depth estimation as a useful art/look-dev branch
  - do not trust monocular/video depth alone for the main production geometry path when forward-reaching motion matters
  - keep the Kinect path alive not just as R&D but as the likely primary depth-truth input
  - keep the hybrid path documented as a fallback where camera RGB carries high-frequency appearance/detail structure and Kinect depth carries the actual spatial extension
  - RGB is not just a color source in that hybrid path:
    - it should help face readability, clothing folds, hand/finger edges, hair contours, and smoother perceived curvature
    - it may still be essential even if the final palette becomes mostly monochrome or emotion-driven rather than literal video color
- the first serious offline video-depth execution plan is still available as a secondary path:
  - rent a Runpod GPU pod
  - run `Metric-Video-Depth-Anything-Large`
  - bake depth outputs offline
  - route the results back into the existing RGBD prep/playback path
- the pod setup friction is now understood, so the repo should own reusable setup/run scripts instead of repeating manual package/debug work

## Most Important Gaps

- one-frame real registered Kinect RGBD capture/export is now in the repo path
- the operator workflow now has live helper-backed preview/record/stop plumbing, but it still needs a deliberate reviewed human take selected in a local operator app and exported for visual look-dev
- idle live preview now uses a persistent helper-backed preview worker, because the initial one-capture-per-request approach made the Kinect power cycle/flicker and produced black preview frames under browser polling
- live preview frames are downsampled for the operator UI to avoid pushing full registered color+depth payloads through the SvelteKit/Python JSON path; raw recorded takes remain full registered Kinect depth-grid resolution
- `/capture-control` should be treated as a browser scaffold/reference, not the final capture-control surface
- browser preview works but is visibly laggy compared with `Protonect`; the next operator implementation target is a fully local/native tool that preserves the same raw-take, edited-take, and `process.py export-rgbd` contracts
- the first real human converted-VDA playback confirmed that monocular depth is not enough for the desired spatial extension
- the hybrid camera-RGB + Kinect-depth path is designed at the capture/export-contract level, but it is now a later fallback rather than the primary next branch
- hand-landmark alignment is still not designed
- the uploaded-video RGBD branch still needs real clip tuning/measurement with local recorded footage
- the offline/server depth-bake path is not implemented yet, so stronger video models are not in the production loop yet

## Immediate Next Step

Continue with the remaining next-session detail in `dev/active/phase-2-kinect-prep/next.md`, now centered on:

- build a local/native operator tool for smooth Kinect preview, record/stop, review, rename, keep/discard, trim, and export
- use that local tool to record and review one intentional live Kinect-only take
- mark that take keep/discard, trim it if needed, then export the raw bundle with `process.py export-rgbd`
- keep the already-defined hybrid spike in `dev/active/phase-2-kinect-prep/hybrid-spike.md` parked unless Kinect RGB proves inadequate
