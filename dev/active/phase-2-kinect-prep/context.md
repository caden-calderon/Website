# Phase 2 Kinect Prep Context

## Date

2026-04-04

## Purpose

Hardware arrives in about a week. The goal is to finish the architecture and scaffolding work that does not depend on the Kinect being physically present.

## Current Position

- Phase 1 image+mesh point-engine demo is complete enough to stand alone as a featured portfolio project
- the same engine is still the long-term base for character playback and the broader Chromatic experience
- raw point playback and stylized RGBD playback are now both working in-browser

## Read This Next

- `dev/active/phase-2-kinect-prep/architecture.md`
- `dev/active/phase-2-kinect-prep/next.md`
- `dev/active/phase-2-kinect-prep/tasks.md`

## Key Decisions Still In Force

- variable-count animation needs renderer hardening first; the old assumption about `setDrawRange()` alone was incomplete
- `SampleSet.count` must become the authoritative active prefix contract
- `FrameSequenceLoader` should not own URL-pattern fetch logic inside the engine
- PLY parsing needs type-aware color normalization and strict unsupported-format handling
- Kinect registration must be the alignment source of truth
- sequence assets need a sidecar manifest for timing and coordinate metadata
- raw point-cloud playback remains the truth/debug/stress-test path
- stylized RGBD sampling remains a separate app-layer surface above shared engine primitives

## Current State Summary

- `PlyAdapter`, `FrameSequence`, `FrameSequenceLoader`, and `GLPointRenderer` are in place and covered by tests
- synthetic point-sequence playback works in-browser
- bounded ITOP clips can be converted into manifest + frame-file directories and loaded in the demo
- the demo now supports both raw point-sequence assets and RGBD-sequence assets
- RGBD sequence preparation is workerized with progress + rough ETA
- derived-image RGBD rehearsal is in place as a bridge to future Kinect RGBD clips
- `pnpm check` and `pnpm test` are green
- the ITOP `.gz` data files and generated `tmp/` outputs are local artifacts and are not committed

## Most Important Gaps

- actual browser startup/memory measurements for the converted ITOP clips are still not recorded in docs
- chunked/streaming playback has not been evaluated with measured numbers yet
- real registered Kinect RGBD clips are not in the browser path yet
- hand-landmark alignment is still not designed
- browser workerization is only applied to RGBD sequence prep so far

## Immediate Next Step

Capture and document the actual browser metrics for:

- `itop-side-test-short`
- `itop-side-test-medium`
- `itop-side-test-long`

Then continue with the next-session detail in `dev/active/phase-2-kinect-prep/next.md`.
