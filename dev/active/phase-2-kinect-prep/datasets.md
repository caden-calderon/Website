# Phase 2 Kinect Prep Dataset Notes

## Purpose

Hardware is still unavailable in the current environment, so this document records the highest-value non-hardware RGBD/body datasets to use next without changing the engine/runtime architecture.

The current priority is now Kinect V2-like rehearsal data, not generic aligned-RGBD plumbing. That makes `NTU RGB+D` the preferred non-hardware dataset even though it does not hand us pre-registered color + depth.

Recorded on 2026-04-04 after:

- `python3 -m python.kinect_capture.capture probe` returned `backend_available: false`
- `lsusb` was not usable enough in this environment to validate a live Kinect path

## Selection Criteria

- prefer Kinect V2 capture data when the goal is rehearsing future body-animation recordings
- keep registered color + depth as the source of truth for the eventual real Kinect path
- keep dataset-specific conversion, alignment, and downsampling in offline scripts only
- keep raw point rehearsal and stylized RGBD rehearsal as separate playback surfaces
- prefer bounded clips and narrow action subsets over large bulk conversion

## Recommended Shortlist

### 1. UTD Kinect v2 datasets now local: `Kinect2Dataset.zip` and `MultiViewDataset.zip`

Current active rehearsal source on this machine.

Why:

- they are already downloaded locally, so there is no request-gate delay
- both are Kinect v2 datasets
- both provide depth plus skeleton data in MATLAB files
- `scripts/convert-utd-to-point-sequences.py` now converts selected clips directly into the existing raw point-sequence manifest + PLY layout
- this makes the raw point/body rehearsal branch immediately usable in the browser

Most important caveat:

- the accessible UTD archives do not currently provide registered color frames in the downloaded bundles
- they are therefore not a substitute for the real registered RGBD capture/export path

That means:

- UTD is now the best immediate rehearsal source for the raw point/body branch
- UTD does not remove the need for real registered color + depth once the stylized RGBD branch becomes active
- any dataset-specific reconstruction stays offline and outside the engine

Use it for:

- tuning raw point playback, body scale, clip cadence, and general motion rehearsal before hardware arrives
- comparing single-view and multiview Kinect v2 body motion in the existing point-sequence runtime
- selecting which gestures are worth repeating once the real capture path is online

Caveats:

- no registered color frames in the current local archives
- no direct path from these archives into the stylized RGBD branch without inventing extra reconstruction work that is lower value than waiting for hardware
- still not a substitute for the real libfreenect2 registration/export spike

Sources:

- local archives in the repo root: `Kinect2Dataset.zip` and `MultiViewDataset.zip`

### 2. NTU RGB+D / NTU RGB+D 120

Still the best request-gated option if we later decide we need a larger Kinect V2 rehearsal set with richer modality coverage.

Why:

- the official page says both datasets contain RGB videos, depth map sequences, 3D skeletal data, and IR
- the official page says they were captured by three Kinect V2 cameras concurrently
- the official page lists Kinect V2-native resolutions: `1920x1080` RGB and `512x424` depth
- this is still a closer long-term rehearsal target than older Kinect v1 aligned-RGBD datasets

Caveats:

- request-gated academic access
- not immediately actionable compared with the local UTD archives
- still `RGB+D`, not guaranteed pre-registered `RGBD`

Sources:

- https://rose1.ntu.edu.sg/dataset/actionRecognition/
- https://github.com/shahroudy/NTURGB-D
- https://www.ntu.edu.sg/docs/librariesprovider106/publications/9-action-recognition/ntu-rgb-d-a-large-scale-dataset-for-3d-human-activity-analysis.pdf?sfvrsn=23a1774d_2

### 3. TUM RGB-D Dataset

Useful only if we specifically need a fast aligned-RGBD contract smoke test.

Why:

- official format docs say color and depth are already pre-registered 1:1
- official format docs say depth is stored as 640x480 16-bit PNG and scaled by `5000` units per meter
- calibration/intrinsic notes are documented, so a converter can stay explicit and testable

Use it for:

- a small aligned-RGBD export smoke test if NTU access is delayed and we need to validate only the manifest/export plumbing
- validating converter handling for PNG depth, invalid zero depth, and meter conversion

Caveats:

- not close to the intended Kinect V2 body-animation recording workflow
- older Kinect/OpenNI registration, so it is a contract rehearsal, not a motion-faithful rehearsal

Sources:

- https://cvg.cit.tum.de/data/datasets/rgbd-dataset
- https://cvg.cit.tum.de/data/datasets/rgbd-dataset/file_formats

### 4. Bonn RGB-D Dynamic Dataset

Useful only if we need another already-aligned RGBD source after TUM.

Why:

- official page says the format matches TUM RGB-D
- official page says the depth images are already registered with respect to the corresponding RGB images
- per-sequence downloads make it practical for one aligned RGBD clip

Use it for:

- aligned RGBD contract rehearsal only
- validating depth normalization, invalid-depth handling, and browser memory on a real already-aligned clip

Caveats:

- not Kinect V2-specific
- not the closest proxy for the eventual recording workflow

Source:

- https://www.ipb.uni-bonn.de/data/rgbd-dynamic-dataset/index.html

### 5. EgoBody

Best later-stage dataset for future body + hand/interaction planning, not the immediate rehearsal priority.

Why:

- official page says it contains `219731` synchronized third-person RGBD frames from `3-5 Azure Kinects`
- official page also includes hand/head/gaze context and body-motion annotations
- useful once hand overlays and interaction semantics become active work

Use it for:

- later design work around body playback plus future hand-overlay alignment
- checking whether the current RGBD manifest metadata is enough for richer capture setups

Caveats:

- Azure Kinect, not Kinect V2
- larger and more semantically ambitious than what is needed for the immediate bounded rehearsal spike

Source:

- https://sanweiliti.github.io/egobody/egobody.html

## Recommended Order

1. Use the converted local UTD Kinect v2 clips first for raw point/body rehearsal.
2. Keep ITOP as the older raw point benchmark path for comparison.
3. If we later need broader Kinect v2 rehearsal coverage before hardware, revisit NTU access.
4. If we specifically need an aligned-RGBD plumbing smoke test, temporarily use one small TUM or Bonn clip and do not confuse that with the main rehearsal direction.
5. Once hardware arrives, replace all dataset-side approximations with a real one-frame libfreenect2 registration/export spike as soon as possible.

## What The Local UTD Data Can De-Risk Now

- action selection for short bounded rehearsal clips
- Kinect V2-like depth resolution, body scale, and action timing
- future body playback separation from hand overlays
- which motions and clip lengths are worth tuning for the eventual recording workflow

## What The Local UTD Data Does Not Solve

- registered color + depth export
- true libfreenect2 registration correctness
- the final upload path from your own sensor recordings

Those still depend on:

- real registered color + depth from the Kinect capture path
- and ultimately the real Kinect capture/export path once hardware is here

## Explicit Non-Goals

- do not move any dataset-specific parsing, alignment, scaling, or downsampling into the engine
- do not replace the raw point benchmark path with stylized RGBD playback
- do not treat the UTD archives as a substitute for the real registered Kinect capture spike once hardware is available
