# Phase 2 Hybrid Spike

## Purpose

Define the narrowest defensible external-camera RGB + Kinect depth workflow that preserves the current runtime boundaries.

Status update:

- this is now a parked fallback, not the immediate production path
- the first live Kinect test showed Kinect RGB is usable enough to try Kinect-only RGBD first
- do not add external-camera/iPhone sync, calibration, and parallax complexity until one Kinect-only registered RGBD take has been captured, reviewed, exported, and judged visually insufficient

- Kinect depth remains the geometry truth source
- camera RGB remains an offline-aligned appearance/detail source
- output still lands in the existing `capture bundle -> export-rgbd -> manifest/playback` path
- no new browser/runtime path is introduced

## Why This Spike Exists

The converted Video Depth Anything path already proved two things:

- the RGBD manifest/playback route works for look-dev
- monocular/video depth is still too flat for strong camera-axis motion such as an arm reaching toward camera

Originally that made the next useful spike a hybrid capture/export plan, not more monocular-model churn.

After the first live Kinect RGB/depth test, the next useful spike is simpler:

- Kinect-only registered RGBD capture first
- external-camera hybrid only if Kinect RGB becomes the limiting visual factor

## Success Criterion

One short hybrid clip should preserve true arm extension toward camera while looking perceptually smoother and more readable than raw Kinect depth alone.

More specifically:

- forward-reaching limbs must hold up better than the converted monocular/video-depth baseline
- face/clothing/hand-edge readability should improve over Kinect color alone
- the clip must still export into the current app-layer RGBD manifest and load through the existing prep/playback path

## Spike Boundaries

In scope:

- one short recorded action
- one external camera mounted as close as practical to the Kinect viewpoint
- one offline sync/calibration/alignment pass
- one exported hybrid RGBD clip

Out of scope:

- live runtime alignment
- multi-camera fusion
- hand-overlay architecture
- broad semantic/body-tracking integration
- replacing the raw point-cloud benchmark path

## First Practical Workflow

1. Mount the external RGB camera as close as practical to the Kinect depth viewpoint.
2. Record one short performance with obvious forward-reaching motion.
3. Capture a clear sync event visible to both systems.
4. Record a short calibration board clip visible to both the external camera and Kinect.
5. Capture Kinect registered outputs and timestamps.
6. Solve offline sync and external-camera-to-Kinect-depth calibration.
7. Resample external RGB into the Kinect depth grid and write the existing registered capture bundle.
8. Run `python3 -m python.kinect_capture.process export-rgbd` on that bundle.
9. Review the result in the current browser RGBD playback path against:
   - raw point truth
   - stylized hybrid RGBD
   - monocular/video-depth reference

## Viewpoint Matching

The first pass should be aggressively simple:

- mount the external camera above or beside the Kinect with minimal baseline
- keep focal length moderate rather than wide
- frame the performer so the whole action stays inside both sensors
- avoid exaggerated handheld motion or rolling-shutter-heavy movement

The goal is not perfect overlap yet. The goal is to keep parallax small enough that one offline extrinsic solve plus depth-grid remap is tractable.

## Sync Plan

The first sync contract should stay explicit and low-tech:

- use a single sharp event at clip start such as a clap or LED flash
- treat Kinect depth timestamps as the reference clock
- solve a single constant offset first
- only add drift correction if measured residual error makes it necessary

Persist with the capture bundle:

- sync strategy
- solved offset in milliseconds
- residual jitter/error after alignment review

## Calibration Plan

The first calibration pass should optimize for explainability, not sophistication:

- use one board type consistently, ideally Charuco or checkerboard
- solve external camera intrinsics from the camera footage
- solve external camera extrinsics relative to the Kinect depth camera
- keep `libfreenect2` registration as the Kinect-side source of truth

Persist with the capture bundle:

- external camera id
- native external camera resolution
- external camera intrinsics
- distortion model and coefficients
- extrinsics to the Kinect depth camera
- reprojection error
- calibration clip id or calibration snapshot id

## Offline Alignment Plan

The alignment/export pass should do only this:

1. choose the Kinect depth frame time
2. pick the closest or interpolated external RGB frame
3. undistort external RGB
4. project/resample external RGB into the Kinect depth grid
5. keep Kinect depth visibility as the occlusion source of truth
6. write aligned RGBA + meter depth into the existing registered capture bundle

Important constraint:

- the capture bundle should already contain the aligned per-frame raster/depth pair
- `process.py export-rgbd` should remain a format/export step, not a calibration solver

## Bundle Contract

The bundle contract for hybrid clips is intentionally the same as the current registered bundle plus stricter metadata:

- `registration.colorSource = "external-camera-rgb"`
- `registration.alignedTo = "depth-grid"`
- `registration.provider = "libfreenect2"`
- `capture.calibration.externalColorCamera`
- `capture.metadata.hybrid`

The currently encoded hybrid metadata shape is:

- `capture.calibration.externalColorCamera.cameraId`
- `capture.calibration.externalColorCamera.nativeResolution`
- `capture.calibration.externalColorCamera.intrinsics`
- `capture.calibration.externalColorCamera.extrinsicsToDepthCamera`
- `capture.metadata.hybrid.captureMode`
- `capture.metadata.hybrid.sync`
- `capture.metadata.hybrid.alignment`

The exporter now validates that metadata when `registration.colorSource` is `external-camera-rgb`.

## Current Repo Support

The repo can now exercise the hybrid contract without hardware by generating a mock hybrid-aligned bundle:

```bash
python3 -m python.kinect_capture.capture mock-bundle \
  --color-source external-camera-rgb \
  --output tmp/kinect-capture/kinect-hybrid-registration-smoke

python3 -m python.kinect_capture.process export-rgbd \
  --input-dir tmp/kinect-capture/kinect-hybrid-registration-smoke \
  --output tmp/rgbd-sequences/kinect-hybrid-registration-smoke
```

That is only a contract smoke test. It does not replace the real registration/alignment spike.

## Next Real Implementation Step

Only return to this after a real Kinect-only RGBD take has been exported and reviewed. If Kinect RGB is not good enough:

1. capture one live Kinect registered bundle with timestamps
2. record one external RGB clip plus calibration clip
3. write the offline alignment script that outputs the same hybrid capture bundle contract
4. export it through `process.py export-rgbd`
5. compare it against the monocular/video-depth reference on the same performance
