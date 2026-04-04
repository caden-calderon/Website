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

The next session should not spend time rediscovering architecture. Read `architecture.md` first and continue with the items below.

## Highest-Priority Next Steps

### 1. Prepare the real Kinect RGBD path

This is the next major architecture step once hardware/export data is available:

- define the recorded Kinect RGBD clip format at the app layer
- use registered color + depth as source of truth
- feed those frames through the existing RGBD prep/playback path
- keep raw point-cloud playback as the calibration/benchmark path

Goal:
- the pre-hardware browser-side work is already complete; the next meaningful phase work starts with a real registered Kinect RGBD clip routed through the existing manifest/source path

## Medium-Priority Next Steps

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
- do not spend time on visual polish before landing the real Kinect RGBD export path

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
- note that ITOP measurements are already recorded before making major new architecture changes
