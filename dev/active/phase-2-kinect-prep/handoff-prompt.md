# Phase 2 Kinect Prep Handoff Prompt

Continue Phase 2 Kinect prep from the current repo state.

Start by reading these in order:

- `/home/caden/projects/WebsiteV2/dev/active/phase-2-kinect-prep/plan.md`
- `/home/caden/projects/WebsiteV2/dev/active/phase-2-kinect-prep/context.md`
- `/home/caden/projects/WebsiteV2/dev/active/phase-2-kinect-prep/architecture.md`
- `/home/caden/projects/WebsiteV2/dev/active/phase-2-kinect-prep/capture-control.md`
- `/home/caden/projects/WebsiteV2/dev/active/phase-2-kinect-prep/hybrid-spike.md`
- `/home/caden/projects/WebsiteV2/dev/active/phase-2-kinect-prep/next.md`
- `/home/caden/projects/WebsiteV2/dev/active/phase-2-kinect-prep/tasks.md`
- `/home/caden/projects/WebsiteV2/dev/active/phase-2-kinect-prep/datasets.md` if hardware is still unavailable

Current status:

- raw point playback, ITOP conversion, RGBD sequence playback, derived-image RGBD rehearsal, workerized RGBD prep, image-mode workerized sample prep, derived-image workerized clip baking, workerized browser image serialization, workerized browser BG/depth inference, recorded ITOP browser measurements, and the Kinect capture/export scaffold are already implemented on `main`
- commit `91e075b` on `main` is the earlier pushed baseline for the major raw/RGBD playback work
- later relevant commits already on `main`:
  - `4fb7cfa` `feat: finish phase 2 browser-side kinect prep`
  - `185ea78` `feat: scaffold kinect rgbd export path`
  - `413c632` `feat: define kinect capture bundle contract`
  - `31d2297` `docs: refresh phase 2 kinect handoff`
- the repo should now be clean apart from the intentional local artifacts below
- local artifacts that should stay out of git:
  - `.codex`
  - `ITOP_side_test_point_cloud.h5.gz`
  - `ITOP_side_test_labels.h5.gz`
  - `Kinect2Dataset.zip`
  - `MultiViewDataset.zip`
  - `tmp/`
- the Kinect hardware is connected and validated through `Protonect`
- the repo now builds a native libfreenect2 helper with `pnpm build:kinect-helper`
- `python3 -m python.kinect_capture.capture probe` now detects `tmp/bin/kinect_capture_helper`; inside Codex sandbox it can report `device_count: 0`, but outside the sandbox the helper sees Kinect serial `188705633947`
- fallback dataset scouting is now recorded in `dev/active/phase-2-kinect-prep/datasets.md`
- the accessible UTD Kinect v2 archives are now the active pre-hardware rehearsal source for the raw point/body branch
- `pnpm convert:utd` now generates `utd-kinect2-high-wave`, `utd-kinect2-hand-clap`, and `utd-multiview-front-throw`
- the browser demo now includes `recorded-video-rgbd-study` for uploaded recorded video -> offline depth estimation -> RGBD-sequence rehearsal on the existing RGBD runtime
- production direction is now Kinect-only registered RGBD first, using Kinect RGB + Kinect depth; recorded/video-depth remains a look-dev and fallback branch
- current depth-model direction:
  - browser preview: `DA V2 Base (fp16)`
  - first offline/final video-depth target: `Video Depth Anything`
  - secondary comparison target: `Depth Pro`
- current provider direction:
  - first remote provider: `Runpod Pods`
  - first GPU target: `A100 80GB`
  - do not start with TPU for the current first-choice model
- the first remote run is now proven:
  - provider: `Runpod`
  - GPU: `A100 PCIe 80GB`
  - model: `Metric-Video-Depth-Anything-Large`
  - returned artifact contract: `video.mp4 + *_depths.npz`
  - repeatable pod setup/run scripts now live in:
    - `scripts/runpod/setup-video-depth-anything.sh`
    - `scripts/runpod/run-vda-metric-large.sh`
- the local converter is also now implemented:
  - `scripts/convert-video-depth-npz-to-rgbd-sequence.py`
  - tested against local `butterfly` and `Body` VDA bakes
  - output stays in the existing manifest-backed RGBD path
- local manifest-backed RGBD studies are now app-discoverable:
  - server-side source resolution falls back to `tmp/rgbd-sequences/<id>/manifest.json`
  - the demo fetches `/api/rgbd-sequences` so converted studies can appear without adding new asset constants
- the first real converted human-clip playback changed the production conclusion once:
  - the browser/runtime path works
  - but monocular/video-depth flattening is still too weak for forward-reaching motion
  - Kinect depth is required for production geometry truth
- the first live Kinect RGB test changed the conclusion again:
  - Kinect RGB looks good enough for the first production capture pass
  - the immediate branch is Kinect-only registered RGBD, not iPhone/external-camera hybrid
- the hybrid rationale remains documented but parked:
  - Kinect depth should provide the low-frequency geometry truth, especially for forward-reaching limbs
  - camera RGB should provide high-frequency perceptual detail: face readability, clothing folds, hand/finger edges, hair contours, and smoother perceived form
  - RGB is not just for literal color; it may still be essential even if the final palette becomes mostly monochrome or stylized
- the first narrow hybrid spike is now documented in `dev/active/phase-2-kinect-prep/hybrid-spike.md`
- the operator-facing capture-control requirements are now documented in `dev/active/phase-2-kinect-prep/capture-control.md`
- the capture/export scaffold now encodes the hybrid metadata contract:
  - `python3 -m python.kinect_capture.capture mock-bundle --color-source external-camera-rgb` writes a mock hybrid-aligned registered bundle
  - `python3 -m python.kinect_capture.process export-rgbd` validates that bundle’s external-camera calibration/sync/alignment metadata and exports it into the existing RGBD manifest route
- the minimum operator workflow scaffold is now landed and partially live-backed:
  - `/capture-control` is the operator-facing route
  - `python3 -m python.kinect_capture.capture` now exposes preview / record-start / record-stop / list-takes / show-take / rename-take / set-decision / trim-take
  - raw takes are written under `tmp/kinect-capture/raw-takes/`
  - edited take metadata is written under `tmp/kinect-capture/edited-takes/`
  - live preview/record use `cpp/kinect_capture/kinect_capture_helper.cpp` when the helper sees a device
  - no-device/sandboxed runs still use the mock fallback provider
- live hardware smokes completed:
  - `capture.py live-bundle` wrote a one-frame real Kinect RGBD bundle
  - `process.py export-rgbd` converted that bundle into `tmp/rgbd-sequences/live-kinect-rgbd-smoke`
  - `record-start --provider live` / `record-stop` captured a stopped take with `70` real RGBD frames under `tmp/kinect-capture/live-control-stop-smoke-2`
- validation now includes:
  - `pnpm check`
  - `pnpm exec vitest run tests/server/kinectCaptureScaffold.test.ts`

First tasks:

1. Confirm the handoff docs are current and commit/push them if needed.
2. Treat the pre-hardware browser-side work and Kinect capture/export scaffolding as complete and keep the docs aligned with that state.
3. Continue with the next highest-value branches:
   - first: use `/capture-control` to record one intentional human take, review it, keep/trim it, and export it through `process.py export-rgbd`
   - then: inspect the exported Kinect-only RGBD clip in the existing browser playback route and tune capture/framing
   - only if Kinect RGB is visually insufficient: resume the parked hybrid spike from `dev/active/phase-2-kinect-prep/hybrid-spike.md`
4. In either branch:
   - keep dataset-specific conversion and downsampling outside the engine
   - use registered color + depth as the source of truth for the real Kinect path
   - route any real or rehearsal RGBD clip through the existing RGBD prep/playback path rather than inventing a parallel runtime

When planning the hybrid spike, optimize for this artistic target:

- reduce the topographical-map feel of raw Kinect depth
- preserve real arm extension toward camera
- use RGB to improve perceived curvature/detail rather than assuming the final render must keep literal camera color

Constraints still in force:

- keep dataset-specific conversion and downsampling outside the engine
- keep raw point playback separate from stylized RGBD playback
- keep body playback separate from future hand overlays
- do not move asset-routing/fetch policy into the engine
- use `apply_patch` for edits
- update the phase docs as you go

Do not spend time rediscovering the architecture from scratch. Use `architecture.md` as the codebase map and continue from there.
