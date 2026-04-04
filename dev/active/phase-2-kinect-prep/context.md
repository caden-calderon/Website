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
- actual Chromium measurements are now recorded for `itop-side-test-short`, `itop-side-test-medium`, and `itop-side-test-long`
- the demo now supports both raw point-sequence assets and RGBD-sequence assets
- RGBD sequence preparation is workerized with progress + rough ETA
- image-mode sample preparation is now workerized with progress + rough ETA
- derived-image RGBD clip baking is now workerized with progress + rough ETA
- browser image serialization/encoding for BG upload, BG PNG prep, and depth JPEG prep is now workerized when supported
- browser BG model inference is now workerized when the browser supports `Worker` + `createImageBitmap` + `OffscreenCanvas`
- browser depth-estimation model inference is now workerized when the browser supports `Worker` + `createImageBitmap` + `OffscreenCanvas`
- derived-image RGBD rehearsal is in place as a bridge to future Kinect RGBD clips
- `pnpm check` and `pnpm test` are green
- the ITOP `.gz` data files and generated `tmp/` outputs are local artifacts and are not committed

## Recorded Browser Measurements

Measured on 2026-04-04 with Headless Chromium 146.0.7680.164 against `pnpm run preview`, using `pnpm run measure:itop-browser`.

- `itop-side-test-short`
  - startup: 503 ms total
  - fetch / parse / prep / build: 285 / 174 / 43 / 1 ms
  - payload / prepared CPU / playback buffer: 4,552,287 B (4.34 MiB) / 4,103,712 B (3.91 MiB) / 173,736 B (0.17 MiB)
  - points/frame: 4,698-4,826 original and prepared
  - browser memory after GC: 10.31 MiB `performance.memory.usedJSHeapSize`, 24.04 MiB `measureUserAgentSpecificMemory()`

- `itop-side-test-medium`
  - startup: 870 ms total
  - fetch / parse / prep / build: 466 / 334 / 68 / 2 ms
  - payload / prepared CPU / playback buffer: 9,140,374 B (8.72 MiB) / 8,240,004 B (7.86 MiB) / 176,868 B (0.17 MiB)
  - points/frame: 4,698-4,913 original and prepared
  - browser memory after GC: 14.07 MiB `performance.memory.usedJSHeapSize`, 28.00 MiB `measureUserAgentSpecificMemory()`

- `itop-side-test-long`
  - startup: 1,384 ms total
  - fetch / parse / prep / build: 594 / 657 / 131 / 2 ms
  - payload / prepared CPU / playback buffer: 18,263,372 B (17.42 MiB) / 16,470,720 B (15.71 MiB) / 181,260 B (0.17 MiB)
  - points/frame: 4,584-5,035 original and prepared
  - browser memory after GC: 21.96 MiB `performance.memory.usedJSHeapSize`, 35.74 MiB `measureUserAgentSpecificMemory()`

## Current Conclusion

- the eager full-sequence raw-point path is still acceptable for the current bounded ITOP clips
- the shared playback-buffer design is doing its job; the playback residency stays nearly flat while payload/prepared storage scales with frame count
- chunked/streaming playback is not the next step for the current ITOP rehearsal assets
- the pre-hardware browser-side heavy work is now complete; the next real architecture step is recorded Kinect RGBD export through the existing RGBD manifest/source path

## Most Important Gaps

- real registered Kinect RGBD clips are not in the browser path yet
- hand-landmark alignment is still not designed

## Immediate Next Step

Continue with the remaining next-session detail in `dev/active/phase-2-kinect-prep/next.md`, now centered on the first real Kinect RGBD export path and any follow-on offline baking once hardware or export data is available.
