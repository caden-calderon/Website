# Phase 2 Kinect Prep Handoff Prompt

Continue Phase 2 Kinect prep from the current repo state.

Start by reading these in order:

- `/home/caden/projects/WebsiteV2/dev/active/phase-2-kinect-prep/plan.md`
- `/home/caden/projects/WebsiteV2/dev/active/phase-2-kinect-prep/context.md`
- `/home/caden/projects/WebsiteV2/dev/active/phase-2-kinect-prep/architecture.md`
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
  - `tmp/`
- on this machine, `python3 -m python.kinect_capture.capture probe` currently reports `backend_available: false`
- fallback dataset scouting is now recorded in `dev/active/phase-2-kinect-prep/datasets.md`

First tasks:

1. Confirm the handoff docs are current and commit/push them if needed.
2. Treat the pre-hardware browser-side work and Kinect capture/export scaffolding as complete and keep the docs aligned with that state.
3. Continue with the next highest-value branch:
   - preferred: replace the mock capture-bundle inputs in `python/kinect_capture/capture.py` with real registered Kinect outputs, then run a one-frame registration/export spike
   - fallback if hardware is still unavailable: convert one small aligned Bonn RGB-D Dynamic or TUM RGB-D clip through the existing RGBD prep/playback path using dataset-specific offline tooling
4. In either branch:
   - keep dataset-specific conversion and downsampling outside the engine
   - use registered color + depth as the source of truth for the real Kinect path
   - route any real or rehearsal RGBD clip through the existing RGBD prep/playback path rather than inventing a parallel runtime

Constraints still in force:

- keep dataset-specific conversion and downsampling outside the engine
- keep raw point playback separate from stylized RGBD playback
- keep body playback separate from future hand overlays
- do not move asset-routing/fetch policy into the engine
- use `apply_patch` for edits
- update the phase docs as you go

Do not spend time rediscovering the architecture from scratch. Use `architecture.md` as the codebase map and continue from there.
