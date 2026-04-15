# Phase 2 Kinect Prep Plan

## Goal

Prepare the Chromatic engine and capture pipeline for Kinect V2 character animation without waiting on the hardware.

This work has to support two product surfaces at once:

- the future Chromatic character/world experience
- the already-valid standalone Phase 1 point-engine project that will be featured inside the portfolio website

## Architecture Decisions

### 1. Preserve the existing engine boundaries

- `PlyAdapter` remains a pure ingest adapter: `ArrayBuffer -> SampleSet`
- browser fetch logic, filename conventions, and static asset routing stay outside the pure engine
- `FrameSequenceLoader` accepts caller-provided frame loading callbacks or raw `ArrayBuffer` lists

### 2. Make `SampleSet.count` the active-range contract

- typed arrays may be larger than `count`
- only the prefix `[0, count)` is active
- this enables one reusable playback buffer for variable-size animation frames
- renderers must treat buffer capacity separately from draw count

### 3. Tighten the animation runtime contract

- `FrameSequence` owns one shared mutable playback `SampleSet`
- `tick(deltaMs)` advances time but only copies frame data when the frame index changes
- clip playback supports `loop`, `once`, and `ping-pong`
- clip switching must reset time/direction deterministically
- endpoint behavior must be tested explicitly

### 4. Treat Kinect registration as the source of truth

- use `libfreenect2` registration outputs for depth/color alignment
- do not hand-roll camera transforms unless they are proven equivalent to the calibrated registration path
- persist calibration and processing metadata with the captured assets

### 5. Add a sequence manifest from day one

Every captured or generated sequence should have a manifest carrying:

- `fps`
- `frameCount`
- frame timestamps
- clip definitions
- coordinate system and units
- processing settings
- capture metadata such as sensor serial and calibration snapshot

### 6. Keep raw RGBD truth separate from stylized RGBD sampling

- raw point-cloud playback remains the truth/debug/stress-test surface
- the eventual art-directed Kinect surface should not be limited to replaying sparse point-cloud files
- instead, registered color + depth should feed the same sampling logic that already works well for still images
- the engine should expose reusable raster/RGBD sampling primitives; the app layer should decide when to use raw point playback vs stylized RGBD sampling
- body playback stays separate from hand interaction overlays and other semantic layers

## Implementation Shape

1. Harden `GLPointRenderer` for reusable over-allocated buffers.
2. Build `PlyAdapter` with strict header parsing and explicit unsupported-format errors.
3. Build `FrameSequence` and its tests around frame-change-only memcpy.
4. Build `FrameSequenceLoader` around injected frame loaders, not hard-coded URL fetch patterns.
5. Build synthetic PLY generation plus manifest output.
6. Build the Kinect Python scaffold and prove one-frame registration/export before higher-level batch tooling.
7. Integrate the animation path into the scene/app layer.
8. Refactor the image sampler into a reusable raster/RGBD sampling path so future Kinect RGBD frames can reuse image-style controls with true sensor depth.
9. Add an app-layer RGBD sequence source format plus local API route so rehearsal data can be loaded without teaching the engine about raster/depth asset routing.
10. Prove the RGBD path with a generated sequence that exercises registered-color-style sampling plus real per-frame depth before Kinect hardware arrives.
11. Move expensive RGBD sequence preparation off the main thread so interactive tuning can keep high-cost algorithms like weighted Voronoi without freezing the UI.

## Next Session Focus

1. Keep the converted ITOP clips as the raw point-cloud benchmark path for playback truth and browser stress testing.
2. The bounded eager path is now measured through `itop-side-test-long` and is still acceptable at the current ceiling:
   - `short` (24 frames): 503 ms startup, 4.34 MiB payload, 3.91 MiB prepared CPU, 24.04 MiB UA memory
   - `medium` (48 frames): 870 ms startup, 8.72 MiB payload, 7.86 MiB prepared CPU, 28.00 MiB UA memory
   - `long` (96 frames): 1.38 s startup, 17.42 MiB payload, 15.71 MiB prepared CPU, 35.74 MiB UA memory
   - playback buffer stays ~0.17 MiB because the runtime reuses one shared active-range buffer
3. Use the new RGBD sequence path as the stylized playback architecture for future Kinect RGBD frames, not as a replacement for the raw point benchmark path.
4. Use the live helper-backed Kinect RGBD export path to capture one intentional reviewed take and feed it through the app-layer RGBD manifest/source path.
5. The pre-hardware browser-side heavy transforms are now workerized through BG removal and depth-estimation inference where the browser supports it, keeping the main thread focused on UI and rendering.
6. If the long raw clip or future RGBD clips start to look marginal, make chunked/streaming playback the next architecture step instead of extending the eager preload path.
7. The Kinect export contract is now scaffolded under `python/kinect_capture/` with both mock and live helper-backed registered RGBD writers; the one-frame live registration/export spike has succeeded.
8. The first narrow hybrid spike is defined in `dev/active/phase-2-kinect-prep/hybrid-spike.md`, but it is parked until Kinect-only RGBD has produced one reviewed/exported take and Kinect RGB is judged insufficient.

## Measured Browser Baseline

Measured on 2026-04-04 with `pnpm run preview` plus `pnpm run measure:itop-browser`, using Headless Chromium 146.0.7680.164 against the production preview build.

- The raw ITOP benchmark path remains viable through the current 96-frame clip ceiling.
- The expensive part is eager fetch + parse + prepared-frame storage, not playback-buffer residency.
- Chunked/streaming playback is not required yet for the current bounded ITOP rehearsal clips.
- Image-mode sample preparation, derived-image clip baking, browser image serialization, browser BG inference, and browser depth inference are now workerized where supported.
- The pre-hardware browser-side Phase 2 work is effectively complete; the RGBD export contract now has mock and live helper-backed registered clip writers.
- The next major step is one usable reviewed Kinect-only take through capture-control, `process.py export-rgbd`, and the existing browser RGBD playback route.
- Revisit chunking when either:
  - clips exceed the current 96-frame / ~17.4 MiB payload / ~15.7 MiB prepared CPU envelope
  - future RGBD/Kinect rehearsal clips materially exceed the current long-clip memory profile

## Guardrails

- prefer simple, explicit contracts over speculative abstractions
- keep the engine framework-agnostic
- avoid asset-loading policy inside the engine
- document coordinate systems and timing metadata early
- do not let Phase 2 work fork away from the standalone project surface
