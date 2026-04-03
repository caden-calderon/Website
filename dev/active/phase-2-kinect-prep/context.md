# Phase 2 Kinect Prep Context

## Date

2026-04-03

## Why This Exists

Hardware arrives in about a week. The goal is to finish the architecture and scaffolding work that does not depend on the Kinect being physically present.

## Current Repo Position

- Phase 1 image+mesh point-engine demo is complete enough to stand alone as a featured portfolio project
- the same engine is still the long-term base for character playback and the broader Chromatic experience
- handoff docs now reflect that dual role explicitly

## Review Outcomes Incorporated

- variable-count animation needs renderer hardening first; the old assumption about `setDrawRange()` alone was incomplete
- `SampleSet.count` must become the authoritative active prefix contract
- `FrameSequenceLoader` should not own URL-pattern fetch logic inside the engine
- PLY parsing needs type-aware color normalization and strict unsupported-format handling
- Kinect registration must be the alignment source of truth
- sequence assets need a sidecar manifest for timing and coordinate metadata

## Near-Term Unknowns

- whether the current Python `freenect2` binding path is smooth enough or needs a thinner native bridge/spike
- exact point counts and memory pressure of real captured clips
- the precise alignment workflow for MediaPipe hand landmarks against registered point-cloud space

## Immediate Next Step

Start implementation with the renderer and playback contract changes, then build the parser and sequence runtime on top of that corrected foundation.
