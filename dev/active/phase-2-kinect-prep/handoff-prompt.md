# Phase 2 Kinect Prep Handoff Prompt

Continue Phase 2 Kinect prep from the current repo state.

Start by reading these in order:

- `/home/caden/projects/WebsiteV2/dev/active/phase-2-kinect-prep/plan.md`
- `/home/caden/projects/WebsiteV2/dev/active/phase-2-kinect-prep/context.md`
- `/home/caden/projects/WebsiteV2/dev/active/phase-2-kinect-prep/architecture.md`
- `/home/caden/projects/WebsiteV2/dev/active/phase-2-kinect-prep/next.md`
- `/home/caden/projects/WebsiteV2/dev/active/phase-2-kinect-prep/tasks.md`

Current status:

- raw point playback, ITOP conversion, RGBD sequence playback, derived-image RGBD rehearsal, and workerized RGBD prep with progress/ETA are already implemented
- those changes were committed and pushed in commit `91e075b` on `main`
- there is also a doc-only follow-up in the current worktree covering the fresh-agent handoff docs
- local artifacts that should stay out of git:
  - `.codex`
  - `ITOP_side_test_point_cloud.h5.gz`
  - `ITOP_side_test_labels.h5.gz`
  - `tmp/`

First tasks:

1. Confirm the handoff docs are current and commit/push them if needed.
2. Capture and document actual browser performance/memory numbers for:
   - `itop-side-test-short`
   - `itop-side-test-medium`
   - `itop-side-test-long`
3. After that, continue the next-session priorities from `next.md`.

Constraints still in force:

- keep dataset-specific conversion and downsampling outside the engine
- keep raw point playback separate from stylized RGBD playback
- keep body playback separate from future hand overlays
- do not move asset-routing/fetch policy into the engine
- use `apply_patch` for edits
- update the phase docs as you go

Do not spend time rediscovering the architecture from scratch. Use `architecture.md` as the codebase map and continue from there.
