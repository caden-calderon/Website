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
- `dev/active/phase-2-kinect-prep/datasets.md` if hardware is still unavailable

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

- `main` now includes the browser-side completion work plus the Kinect scaffold follow-up commits `4fb7cfa`, `185ea78`, and `413c632`
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
- `python/kinect_capture/process.py` can now emit a mock Kinect-style registered RGBD clip in the same manifest/frame layout the browser already consumes
- `python/kinect_capture/capture.py mock-bundle` now writes a raw registered capture bundle and `python/kinect_capture/process.py export-rgbd` converts that bundle into browser RGBD assets
- `python/kinect_capture/capture.py`, `python/kinect_capture/hands.py`, and `python/kinect_capture/README.md` now exist as the first Python scaffold for the hardware phase
- the current local environment still does not have an importable `freenect2` Python binding, so the live registration/export spike remains hardware-blocked here
- a fallback shortlist of non-hardware RGBD/body rehearsal datasets is now recorded in `dev/active/phase-2-kinect-prep/datasets.md`, with `NTU RGB+D` now preferred as the closest pre-hardware Kinect V2 body dataset
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
- the pre-hardware browser-side heavy work is now complete
- the Kinect RGBD export contract is now defined at two layers:
  - `capture.py` raw registered bundle
  - `process.py export-rgbd` browser manifest export
- both layers are smoke-testable without hardware and route through the existing RGBD manifest/source path
- the next real architecture step is replacing the mock capture bundle with real libfreenect2 registration output once hardware arrives
- until hardware arrives, `NTU RGB+D` is now the preferred rehearsal dataset for Kinect V2-like body motion, while TUM/Bonn are only secondary aligned-RGBD contract-smoke options

## Most Important Gaps

- real registered Kinect RGBD clips are not in the browser path yet
- hand-landmark alignment is still not designed

## Immediate Next Step

Continue with the remaining next-session detail in `dev/active/phase-2-kinect-prep/next.md`, now centered on either:

- the one-frame real registration/export spike once `libfreenect2` capture is actually available
- or a bounded `NTU RGB+D` rehearsal spike, with any NTU-specific RGB/depth alignment work staying offline and outside the engine
