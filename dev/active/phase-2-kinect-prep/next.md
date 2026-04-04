# Phase 2 Kinect Prep Next

## Where We Are

The repo is in a good rehearsal state:

- raw point-sequence playback works
- converted ITOP clips exist as bounded browser test assets
- stylized RGBD sequence playback works
- derived-image RGBD rehearsal works
- expensive RGBD sequence prep is workerized with progress/ETA

The next session should not spend time rediscovering architecture. Read `architecture.md` first and continue with the items below.

## Highest-Priority Next Steps

### 1. Record real browser numbers for ITOP clips

Use the existing sequence report panel and capture:

- `itop-side-test-short`
- `itop-side-test-medium`
- `itop-side-test-long`

For each, record at least:
- startup total
- fetch / parse / prep / build times
- payload bytes
- prepared CPU bytes
- estimated playback bytes
- points/frame range

Goal:
- determine whether the eager full-sequence path is still acceptable for bounded real body clips

### 2. Extend workerization to other heavy browser paths

Best next candidates:
- image-mode weighted Voronoi
- image-mode sample preparation generally
- derived-image clip baking if it still causes visible main-thread stalls

Do this without moving fetch/routing policy into workers. Keep workers focused on pure data transforms.

### 3. Prepare the real Kinect RGBD path

This is the next major architecture step once hardware/export data is available:

- define the recorded Kinect RGBD clip format at the app layer
- use registered color + depth as source of truth
- feed those frames through the existing RGBD prep/playback path
- keep raw point-cloud playback as the calibration/benchmark path

## Medium-Priority Next Steps

### Offline baking

Add a path to bake stylized RGBD clips offline once settings are chosen.

Desired future workflow:
1. tune settings interactively in browser
2. lock settings
3. run offline bake on source RGBD clips
4. playback uses precomputed prepared assets

### Chunked playback decision

Only do this after measuring ITOP and/or real RGBD bounded clips.

If eager preload looks marginal, next architecture step is:
- chunked or streaming playback
- not bigger bounded clips on the same eager strategy

## Explicit Non-Goals For The Next Session

- do not invent hand-overlay architecture yet
- do not shove dataset-specific conversion into the engine
- do not replace raw point playback with stylized RGBD playback
- do not spend time on visual polish without collecting ITOP performance numbers

## If Kinect Hardware Or Exports Are Suddenly Available

Do this first:

1. produce one short registered RGBD clip
2. define its app-layer manifest/frame layout
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
- capture ITOP measurements before making major new architecture changes
