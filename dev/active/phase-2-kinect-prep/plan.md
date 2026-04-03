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

## Implementation Shape

1. Harden `GLPointRenderer` for reusable over-allocated buffers.
2. Build `PlyAdapter` with strict header parsing and explicit unsupported-format errors.
3. Build `FrameSequence` and its tests around frame-change-only memcpy.
4. Build `FrameSequenceLoader` around injected frame loaders, not hard-coded URL fetch patterns.
5. Build synthetic PLY generation plus manifest output.
6. Build the Kinect Python scaffold and prove one-frame registration/export before higher-level batch tooling.
7. Integrate the animation path into the scene/app layer.

## Guardrails

- prefer simple, explicit contracts over speculative abstractions
- keep the engine framework-agnostic
- avoid asset-loading policy inside the engine
- document coordinate systems and timing metadata early
- do not let Phase 2 work fork away from the standalone project surface
