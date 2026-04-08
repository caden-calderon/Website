# Phase 2 Kinect Prep Next

## Where We Are

The repo is in a good rehearsal state:

- raw point-sequence playback works
- converted ITOP clips exist as bounded browser test assets
- stylized RGBD sequence playback works
- derived-image RGBD rehearsal works
- expensive RGBD sequence prep is workerized with progress/ETA
- image-mode sample preparation is workerized with progress/ETA
- derived-image RGBD clip baking is workerized with progress/ETA
- browser image serialization/encoding is workerized where the browser supports it
- browser BG model inference is workerized where the browser supports it
- browser depth-estimation model inference is workerized where the browser supports it
- the Kinect export contract is scaffolded under `python/kinect_capture/`
- `capture.py mock-bundle` writes a raw registered capture bundle
- `process.py export-rgbd` converts that bundle into the browser RGBD manifest format
- a mock registered Kinect-style RGBD clip can be generated end-to-end with `pnpm generate:test-kinect-rgbd`
- the current local environment still reports `backend_available: false` for `python3 -m python.kinect_capture.capture probe`
- `Kinect2Dataset.zip` and `MultiViewDataset.zip` are now present locally
- `pnpm convert:utd` now emits raw point-sequence rehearsal clips from those UTD Kinect v2 depth+skeleton archives
- the browser demo now also exposes `recorded-video-rgbd-study`, which samples a bounded uploaded video clip offline, estimates per-frame depth, and routes the result through the existing RGBD sequence path
- that uploaded-video branch now exposes user controls for target fps and frame cap so short clips can be pushed beyond the original 12 fps / 48-frame default

The next session should not spend time rediscovering architecture. Read `architecture.md` first and continue with the items below.

## Highest-Priority Next Steps

### 1. Establish the production capture split

Treat the two capture lanes as separate on purpose:

- primary production lane: recorded video + offline depth estimation
- parallel truth/R&D lane: real Kinect registered RGBD

Do not block the video-first art path on perfect Kinect bring-up, and do not throw away the Kinect path just because it is not the preferred final look.

### 2. Prepare the real Kinect RGBD path

This is the next major architecture step once hardware/export data is available:

- replace the mock capture-bundle writer in `python/kinect_capture/capture.py` with live libfreenect2 registration output
- use registered color + depth as source of truth
- feed those frames through the existing RGBD prep/playback path
- keep raw point-cloud playback as the calibration/benchmark path
- run a one-frame registration/export spike before building any higher-level batch tooling

Goal:
- the pre-hardware browser-side work and export-contract scaffolding are already complete; the next meaningful phase work starts with one real registered Kinect RGBD clip routed through the existing capture-bundle -> export-rgbd -> manifest/source path

### 3. Define the first offline video-depth bake path

This is now the main art-path engineering step:

- keep using the browser uploaded-video branch for fast preview and look tuning
- add an offline/server-side depth backend for higher-quality final bakes
- current model recommendation:
  - preview: `DA V2 Base (fp16)`
  - first offline video target: `Video Depth Anything`
  - secondary comparison target: `Depth Pro`
- do not start with hybrid iPhone+Kinect capture; it adds synchronization and alignment problems before there is a proven need
- first provider choice: `Runpod Pods`
- first hardware choice: `A100 80GB`
- do not wait for a turnkey API if the best checkpoint is not already hosted
- do not start with TPU unless a later model/runtime makes that path clearly easier
- the first successful remote proof used:
  - `Runpod A100 PCIe 80GB`
  - `Metric-Video-Depth-Anything-Large`
  - `*_depths.npz` as the artifact to bring back into this repo
- the first real converted human-clip playback also proved a limit:
  - the stylized RGBD route works
  - but monocular/video-depth flattening is still too weak for motion that projects strongly toward the camera
  - for the target performance language, that is a truth-source failure, not just a tuning problem

Goal:
- one short hybrid clip should be able to move through:
  - camera RGB capture
  - Kinect depth capture
  - offline alignment into the existing RGBD manifest contract
  - existing RGBD prep/playback path
  - without inventing a second runtime

Immediate implementation follow-up:
- keep `PLY` output as optional debug/raw data, not the main production artifact
- use `scripts/runpod/setup-video-depth-anything.sh` and `scripts/runpod/run-vda-metric-large.sh` for repeatable future pod sessions instead of repeating manual setup/debug steps
- use `scripts/convert-video-depth-npz-to-rgbd-sequence.py` to keep frame decimation and downscaling outside the engine while targeting the existing RGBD manifest format

What remains after the converter:
- measure startup/memory for the converted VDA clips now that they load through the current app-layer RGBD route
- stop treating “better monocular depth” as the primary next lever for production geometry
- plan the first hybrid spike around viewpoint matching, sync, and offline RGB/depth alignment

App-layer source discovery is now generalized:
- manifest-backed RGBD studies under `tmp/rgbd-sequences/<id>` can be resolved and listed without new hard-coded asset entries
- the converted-study playback test already served its purpose: it validated the route and exposed the monocular-depth limit that now motivates the hybrid spike

## Medium-Priority Next Steps

### If hardware bring-up is slower than expected

Use the remaining time on the two pre-hardware rehearsal branches instead of speculative runtime changes:

- keep tuning against the converted local UTD Kinect v2 raw point clips because that data is already on disk and already routes through the existing point-sequence path
- use the new uploaded-video RGBD branch for art-direction rehearsal with recorded footage, Depth Anything v2, and the current stylized RGBD sampling controls
- use the shortlist in `dev/active/phase-2-kinect-prep/datasets.md` only if another dataset is needed beyond the current UTD coverage
- keep any dataset-specific conversion/downsampling outside the engine
- favor datasets that help validate the capture-bundle/export contract, depth semantics, or browser memory envelope
- note that the accessible UTD archives de-risk raw point/body playback, not registered RGBD export
- avoid speculative capture/runtime refactors while the hardware path is still unverifiable on this machine

### Uploaded-video RGBD tuning

This remains useful, but it is no longer the main geometry bet:

- record one short local clip with the framing/motion style you actually want to capture later
- load it through `recorded-video-rgbd-study`
- start with `DA V2 Base (fp16)` and the current RGBD sequence sampling controls
- record startup/memory numbers once a representative clip is chosen
- keep this path routed through the current RGBD prep/playback runtime rather than adding a separate video runtime
- do not confuse this branch with real Kinect RGBD; it is now explicitly for visual rehearsal and fallback, not the main truth source

### Hybrid Spike

This is now the highest-value production branch:

- mount the camera as close as practical to the Kinect viewpoint
- capture one short clip with obvious forward-reaching motion
- capture Kinect depth for the same action
- align camera RGB to Kinect depth offline
- export the result into the same RGBD manifest/runtime path already in place
- treat the hybrid roles explicitly as:
  - Kinect depth = low-frequency geometry truth
  - camera RGB = high-frequency appearance/detail guidance
  - final palette may be literal color, stylized color, or mostly monochrome; RGB is still useful either way

Success criterion:
- the aligned hybrid clip should preserve real arm extension toward camera in a way the monocular/video-depth branch does not
- the resulting stylized playback should feel less like a stepped topographical scan and closer to the smoother sculptural/detail-rich target references

### Depth-model direction

Current recommendation, based on official project claims as of 2026-04-07:

- `Video Depth Anything`
  - first model to test for final offline video bakes
  - best fit for this project because temporal consistency matters more than single-frame sharpness alone
- `Depth Pro`
  - strong per-frame comparison candidate, especially for boundary sharpness and metric monocular depth
  - use as a benchmark against per-frame DA/Depth Pro style pipelines, not as the first default for full videos
- `Depth Anything V2`
  - keep as the current browser preview model family and a lightweight offline fallback
- `DepthCrafter`
  - promising, but heavier and not the first integration target unless Video Depth Anything proves insufficient

### Provider direction

Current recommendation, based on official provider/model docs as of 2026-04-07:

- `Runpod Pods`
  - first provider to use for remote video-depth bakes
  - best mix of low setup friction, acceptable reliability, and cost for ad hoc GPU jobs
- `Google Cloud GPU`
  - viable later if we want deeper cloud integration, but not the first cost/complexity choice here
- `Google Cloud TPU`
  - not the first path for `Video Depth Anything`
  - the model is published as a standard GPU-oriented PyTorch stack, not a TPU-first workflow

The first real bake also showed:
- shell SSH on Runpod is usable
- file transfer support is awkward enough that browser/Jupyter upload/download is the safer default for ad hoc sessions
- repeated pod setup should be scripted, not done manually

### ITOP measurement result

The raw point benchmark path is now measured:

- `short`: 503 ms startup, 4.34 MiB payload, 3.91 MiB prepared CPU, 24.04 MiB UA memory
- `medium`: 870 ms startup, 8.72 MiB payload, 7.86 MiB prepared CPU, 28.00 MiB UA memory
- `long`: 1.38 s startup, 17.42 MiB payload, 15.71 MiB prepared CPU, 35.74 MiB UA memory

Conclusion:
- the eager full-sequence path is still acceptable for the current bounded ITOP clips
- do not spend time on chunking yet unless a future clip materially exceeds the current long-clip envelope
- image-mode sample preparation is no longer the blocker; that workerization is already done
- derived-image clip baking is no longer the blocker; that workerization is already done
- browser image serialization/encoding is no longer the blocker; that workerization is already done
- browser BG/depth inference is no longer the blocker; that workerization is also done
- the mock Kinect capture/export path is in place, so the remaining unknown is real hardware registration correctness rather than browser/runtime plumbing

### Offline baking

Add a path to bake stylized RGBD clips offline once settings are chosen.

Desired future workflow:
1. tune settings interactively in browser
2. lock settings
3. run offline bake on source RGBD clips
4. playback uses precomputed prepared assets

The first concrete offline artifact target is now:
- `video.mp4`
- `*_depths.npz`
- converted into the existing app-layer RGBD manifest/frame layout

The first local smoke conversions produced:
- `vda-butterfly-study`: `61` frames at `640x360`
- `vda-body-study`: `96` frames at `270x480`
- both confirm that large baked clips are practical only when fps/max-frame/max-edge controls are applied during conversion

### Chunked playback decision

Only do this after a future clip looks materially worse than the current measured ITOP long clip and/or real RGBD bounded clips.

If eager preload looks marginal, next architecture step is:
- chunked or streaming playback
- not bigger bounded clips on the same eager strategy

## Explicit Non-Goals For The Next Session

- do not invent hand-overlay architecture yet
- do not shove dataset-specific conversion into the engine
- do not replace raw point playback with stylized RGBD playback
- do not spend time on live webcam/runtime work yet
- do not keep chasing monocular/video-depth models as the primary fix for forward-reaching geometry
- do not jump into a broad hybrid system without a narrow calibration/sync/alignment spike first

## If Kinect Hardware Or Exports Are Suddenly Available

Do this first:

1. produce one short registered RGBD clip
2. replace the mock `python/kinect_capture/capture.py` bundle inputs with the real captured registration outputs
3. route it through the existing RGBD sequence path
4. compare:
- raw truth path
- stylized RGBD path
- converted monocular/video-depth path only as a reference baseline

## Fresh-Agent Checklist

- read `architecture.md`
- inspect `PointEngineDemo.svelte`
- inspect `rgbdSequencePlayback.ts`
- inspect `rgbdSequencePrep.worker.ts`
- inspect `assets.ts`
- inspect `python/kinect_capture/capture.py`
- inspect `python/kinect_capture/process.py`
- inspect `scripts/convert-utd-to-point-sequences.py`
- inspect `dev/active/phase-2-kinect-prep/datasets.md`
- if hardware is still unavailable, prefer the already-converted UTD raw point clips over more mock-only plumbing
- note that ITOP measurements are already recorded before making major new architecture changes
