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

### 1. Prepare the real Kinect RGBD path

This is the next major architecture step once hardware/export data is available:

- replace the mock capture-bundle writer in `python/kinect_capture/capture.py` with live libfreenect2 registration output
- use registered color + depth as source of truth
- feed those frames through the existing RGBD prep/playback path
- keep raw point-cloud playback as the calibration/benchmark path
- run a one-frame registration/export spike before building any higher-level batch tooling

Goal:
- the pre-hardware browser-side work and export-contract scaffolding are already complete; the next meaningful phase work starts with one real registered Kinect RGBD clip routed through the existing capture-bundle -> export-rgbd -> manifest/source path

## Medium-Priority Next Steps

### If hardware is still blocked

Use the remaining time on the two pre-hardware rehearsal branches instead of speculative runtime changes:

- keep tuning against the converted local UTD Kinect v2 raw point clips because that data is already on disk and already routes through the existing point-sequence path
- use the new uploaded-video RGBD branch for art-direction rehearsal with recorded footage, Depth Anything v2, and the current stylized RGBD sampling controls
- use the shortlist in `dev/active/phase-2-kinect-prep/datasets.md` only if another dataset is needed beyond the current UTD coverage
- keep any dataset-specific conversion/downsampling outside the engine
- favor datasets that help validate the capture-bundle/export contract, depth semantics, or browser memory envelope
- note that the accessible UTD archives de-risk raw point/body playback, not registered RGBD export
- avoid speculative capture/runtime refactors while the hardware path is still unverifiable on this machine

### Uploaded-video RGBD tuning

This is now the highest-value non-hardware art-direction branch:

- record one short local clip with the framing/motion style you actually want to capture later
- load it through `recorded-video-rgbd-study`
- start with `DA V2 Base (fp16)` and the current RGBD sequence sampling controls
- record startup/memory numbers once a representative clip is chosen
- keep this path routed through the current RGBD prep/playback runtime rather than adding a separate video runtime
- do not confuse this branch with real Kinect RGBD; it is for visual rehearsal, not sensor-faithful registration testing

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

## If Kinect Hardware Or Exports Are Suddenly Available

Do this first:

1. produce one short registered RGBD clip
2. replace the mock `python/kinect_capture/capture.py` bundle inputs with the real captured registration outputs
3. route it through the existing RGBD sequence path
4. compare:
- raw truth path
- stylized RGBD path

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
