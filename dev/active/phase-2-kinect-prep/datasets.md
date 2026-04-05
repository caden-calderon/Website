# Phase 2 Kinect Prep Dataset Notes

## Purpose

Hardware is still unavailable in the current environment, so this document records the highest-value non-hardware RGBD/body datasets to use next without changing the engine/runtime architecture.

Recorded on 2026-04-04 after:

- `python3 -m python.kinect_capture.capture probe` returned `backend_available: false`
- `lsusb` was not usable enough in this environment to validate a live Kinect path

## Selection Criteria

- prefer registered or already aligned color + depth because the real Kinect path should also treat registered color + depth as source of truth
- prefer datasets that can exercise the existing app-layer RGBD manifest/export path without adding engine policy
- keep dataset-specific conversion and downsampling in offline scripts only
- keep raw point rehearsal and stylized RGBD rehearsal as separate playback surfaces
- prefer one small, open clip for immediate rehearsal before any large request-gated dataset

## Recommended Shortlist

### 1. Bonn RGB-D Dynamic Dataset

Best immediate fallback for the RGBD export/playback path.

Why:

- official page says the format matches the TUM RGB-D dataset
- official page says the depth images are already registered with respect to the corresponding RGB images
- the dataset includes dynamic/crowd sequences instead of only static-room camera motion
- per-sequence downloads are available, which makes it practical for a one-clip rehearsal spike

Use it for:

- one dataset-specific offline converter from TUM-style RGB PNG + registered depth PNG into the existing browser RGBD manifest/frame layout
- validating depth normalization, invalid-depth handling, and browser memory on a real aligned RGBD clip

Caveats:

- this is not Kinect V2-specific capture data
- it is better for export/path rehearsal than for body-joint semantics

Source:

- https://www.ipb.uni-bonn.de/data/rgbd-dynamic-dataset/index.html

### 2. TUM RGB-D Dataset

Best open, documented alignment reference for a first conversion spike.

Why:

- official format docs say color and depth are already pre-registered 1:1
- official format docs say depth is stored as 640x480 16-bit PNG and scaled by `5000` units per meter
- calibration/intrinsic notes are documented, so a converter can stay explicit and testable
- widely used format makes it a good baseline for validating the capture-bundle/export contract

Use it for:

- the first small offline conversion spike if Bonn download size or scene choice is inconvenient
- validating converter handling for PNG depth, invalid zero depth, and meter conversion before touching real hardware

Caveats:

- mostly camera-motion/scene sequences rather than curated body-performance clips
- older Kinect/OpenNI registration, so it is a contract rehearsal, not a Kinect V2 fidelity match

Sources:

- https://cvg.cit.tum.de/data/datasets/rgbd-dataset
- https://cvg.cit.tum.de/data/datasets/rgbd-dataset/file_formats

### 3. NTU RGB+D / NTU RGB+D 120

Best large-scale body-motion benchmark once a Kinect V2-specific rehearsal dataset is worth the operational cost.

Why:

- official page says both datasets contain RGB videos, depth map sequences, skeletons, and IR
- official page says they were captured by three Kinect V2 cameras concurrently
- official page lists Kinect V2-native resolutions: `1920x1080` RGB and `512x424` depth
- this is the strongest non-hardware body-motion rehearsal path for later raw-point and body-layer validation

Use it for:

- realistic full-body motion rehearsal after the first smaller aligned RGBD conversion succeeds
- stress-testing raw point playback with bounded clips derived offline from real Kinect V2 depth

Caveats:

- very large download sizes
- request-gated academic access
- license terms are restrictive enough that any local derived conversion workflow should be reviewed before relying on it
- the public overview does not make registered color-to-depth export the main format, so conversion work may be more involved than Bonn/TUM

Source:

- https://rose1.ntu.edu.sg/dataset/actionRecognition/

### 4. EgoBody

Best later-stage dataset for future body + hand/interaction planning, not the immediate export rehearsal.

Why:

- official page says it contains `219731` synchronized third-person RGBD frames from `3-5 Azure Kinects`
- official page also includes hand/head/gaze context and body-motion annotations
- useful once hand overlays and interaction semantics become active work

Use it for:

- later design work around body playback plus future hand-overlay alignment
- checking whether the current RGBD manifest metadata is enough for richer capture setups

Caveats:

- Azure Kinect, not Kinect V2
- larger and more semantically ambitious than what is needed for the immediate one-clip rehearsal

Source:

- https://sanweiliti.github.io/egobody/egobody.html

## Recommended Order

1. Convert one small Bonn RGB-D Dynamic or TUM RGB-D clip through an offline dataset-specific converter into the existing RGBD manifest/frame format.
2. Route that clip through the current browser RGBD prep/playback path without adding a parallel runtime.
3. Keep ITOP as the raw point-cloud benchmark path.
4. Only after that, consider a bounded Kinect V2-specific body dataset such as NTU RGB+D for larger body-motion rehearsal.

## Explicit Non-Goals

- do not move any dataset-specific parsing, scaling, or downsampling into the engine
- do not replace the raw point benchmark path with stylized RGBD playback
- do not treat these datasets as a substitute for the real registered Kinect capture spike once hardware is available
