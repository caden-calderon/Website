# Phase 2 Kinect Prep Handoff Prompt

Continue Phase 2 Kinect prep from the current repo state.

Start by reading these in order:

- `/home/caden/projects/WebsiteV2/dev/active/phase-2-kinect-prep/plan.md`
- `/home/caden/projects/WebsiteV2/dev/active/phase-2-kinect-prep/context.md`
- `/home/caden/projects/WebsiteV2/dev/active/phase-2-kinect-prep/architecture.md`
- `/home/caden/projects/WebsiteV2/dev/active/phase-2-kinect-prep/next.md`
- `/home/caden/projects/WebsiteV2/dev/active/phase-2-kinect-prep/tasks.md`

Current status:

- raw point playback, ITOP conversion, RGBD sequence playback, derived-image RGBD rehearsal, workerized RGBD prep, image-mode workerized sample prep, derived-image workerized clip baking, workerized browser image serialization, workerized browser BG/depth inference, and recorded ITOP browser measurements are already implemented in the current repo state
- commit `91e075b` on `main` is the earlier pushed baseline for the major raw/RGBD playback work
- the current worktree also includes the later phase-doc updates plus the image/derived/serialization/inference workerization follow-up
- local artifacts that should stay out of git:
  - `.codex`
  - `ITOP_side_test_point_cloud.h5.gz`
  - `ITOP_side_test_labels.h5.gz`
  - `tmp/`

First tasks:

1. Confirm the handoff docs are current and commit/push them if needed.
2. Treat the pre-hardware browser-side work as complete and keep the docs aligned with that state.
3. Continue with the real Kinect RGBD export path:
   - define the first recorded Kinect RGBD clip format at the app layer
   - use registered color + depth as the source of truth
   - route that clip through the existing RGBD prep/playback path

Constraints still in force:

- keep dataset-specific conversion and downsampling outside the engine
- keep raw point playback separate from stylized RGBD playback
- keep body playback separate from future hand overlays
- do not move asset-routing/fetch policy into the engine
- use `apply_patch` for edits
- update the phase docs as you go

Do not spend time rediscovering the architecture from scratch. Use `architecture.md` as the codebase map and continue from there.
