# Kinect Capture Scaffold

This directory holds the Phase 2 Kinect V2 capture/export scaffolding.

Current status:

- `capture.py` provides a backend probe plus mock and live capture-bundle commands.
- `capture.py` can now also write a mock registered capture bundle.
- `capture.py` now also exposes the capture-control scaffold:
  - `status`
  - `preview`
  - `record-start` / `record-stop`
  - `list-takes` / `show-take` / `show-frame`
  - `rename-take` / `set-decision` / `trim-take`
- `capture.py mock-bundle --color-source external-camera-rgb` now also exercises the planned hybrid external-camera-RGB + Kinect-depth contract.
- `process.py` converts that capture bundle into the same manifest/frame layout the browser demo consumes.
- `process.py` now validates the hybrid calibration/sync/alignment metadata when the registered bundle declares `registration.colorSource = external-camera-rgb`.
- `hands.py` provides a MediaPipe probe plus a mock landmark export.
- the capture-control scaffold uses live Kinect frames when the native helper can see a device and falls back to mock frames for no-device/sandboxed runs
- live Kinect hardware has been validated with `Protonect`
- live libfreenect2 frame capture is wired through `cpp/kinect_capture/kinect_capture_helper.cpp`
- Kinect-only RGBD is now the primary capture path; external-camera/iPhone hybrid is a later fallback only if Kinect RGB is not good enough

## Arch Linux Notes

The safest current baseline is to build `libfreenect2` from upstream source rather than assuming a maintained distro package. These notes were derived from the upstream `OpenKinect/libfreenect2` Linux instructions and adapted for Arch on 2026-04-04.

Suggested system packages:

```bash
sudo pacman -S --needed base-devel cmake pkgconf libusb glfw-x11 libjpeg-turbo \
  mesa python python-pip
```

Optional acceleration paths:

- NVIDIA/CUDA if you want the CUDA depth pipeline
- OpenCL runtime/headers if you want the OpenCL depth pipeline

Suggested upstream build flow:

```bash
git clone https://github.com/OpenKinect/libfreenect2.git ~/libfreenect2
cd ~/libfreenect2
mkdir build
cd build
cmake .. -DCMAKE_BUILD_TYPE=RelWithDebInfo -DCMAKE_POLICY_VERSION_MINIMUM=3.5
cmake --build . -j
```

On this machine the first VAAPI-enabled build opened the device but failed capture with an unsupported VA profile. The working capture build disables VAAPI and uses the CPU/TurboJPEG path:

```bash
cd ~/libfreenect2
mkdir -p build-turbojpeg
cd build-turbojpeg
cmake .. -DCMAKE_BUILD_TYPE=RelWithDebInfo -DCMAKE_POLICY_VERSION_MINIMUM=3.5 -DENABLE_VAAPI=OFF
cmake --build . -j
```

After building:

1. Install the upstream udev rule from `platform/linux/udev/90-kinect2.rules`.
2. Replug the sensor.
3. Run `./bin/Protonect` from the build directory to confirm RGB/depth capture and registration are healthy before touching the repo scripts here.

Current local build:

- upstream source/build path: `/home/caden/libfreenect2`
- `Protonect` binary: `/home/caden/libfreenect2/build/bin/Protonect`
- capture helper libfreenect2 build: `/home/caden/libfreenect2/build-turbojpeg`
- repo helper binary: `tmp/bin/kinect_capture_helper`
- first live test succeeded and showed RGB, IR, depth, and registered views
- live helper probe outside the sandbox sees Kinect serial `188705633947`
- `record-start --provider live` / `record-stop` has produced a stopped `70`-frame raw take, and `process.py export-rgbd` converted it into `tmp/rgbd-sequences/live-control-stop-smoke-2`

Build the repo helper:

```bash
pnpm build:kinect-helper
```

## Python Entry Points

Probe the expected Kinect binding:

```bash
python3 -m python.kinect_capture.capture probe
```

Capture one live registered Kinect RGBD bundle:

```bash
python3 -m python.kinect_capture.capture live-bundle \
  --output tmp/kinect-capture/live-kinect-rgbd-smoke \
  --frames 1 \
  --warmup-frames 5 \
  --pipeline cpu

python3 -m python.kinect_capture.process export-rgbd \
  --input-dir tmp/kinect-capture/live-kinect-rgbd-smoke \
  --output tmp/rgbd-sequences/live-kinect-rgbd-smoke
```

Inspect capture-control status:

```bash
python3 -m python.kinect_capture.capture status
```

Read a preview frame:

```bash
python3 -m python.kinect_capture.capture preview --width 192 --height 160
```

When live Kinect is available, `preview` starts a persistent helper-backed preview worker and then returns the latest frame from `tmp/kinect-capture/preview/latest.json`. Stop that worker explicitly if needed:

```bash
python3 -m python.kinect_capture.capture preview-stop
```

Record a raw take through the operator scaffold:

```bash
python3 -m python.kinect_capture.capture record-start --provider live --label rehearsal-a
python3 -m python.kinect_capture.capture record-stop
python3 -m python.kinect_capture.capture list-takes
```

Use `--provider mock` for deterministic no-hardware tests, or leave the default `--provider auto` to use live Kinect only when the helper sees a device.

Write a mock registered RGBD clip for browser testing:

```bash
python3 -m python.kinect_capture.capture mock-bundle \
  --output tmp/kinect-capture/kinect-rgbd-registration-smoke

python3 -m python.kinect_capture.process export-rgbd \
  --input-dir tmp/kinect-capture/kinect-rgbd-registration-smoke \
  --output tmp/rgbd-sequences/kinect-rgbd-registration-smoke
```

Write a mock hybrid-aligned bundle that represents external camera RGB already remapped into the Kinect depth grid:

```bash
python3 -m python.kinect_capture.capture mock-bundle \
  --color-source external-camera-rgb \
  --output tmp/kinect-capture/kinect-hybrid-registration-smoke

python3 -m python.kinect_capture.process export-rgbd \
  --input-dir tmp/kinect-capture/kinect-hybrid-registration-smoke \
  --output tmp/rgbd-sequences/kinect-hybrid-registration-smoke
```

Write mock hand landmarks:

```bash
python3 -m python.kinect_capture.hands mock-landmarks
```

## Export Contract

The real Kinect RGBD export path should keep these constraints:

- `libfreenect2` registration is the alignment source of truth
- browser/runtime assets stay in the app-layer RGBD manifest format already used by `src/lib/demo/rgbdSequenceSources.ts`
- raw point playback remains a separate truth/debug path
- dataset-specific conversion and capture tooling stay outside the engine

The current mock capture bundle intentionally writes:

- `capture.json`
- one raw registered color frame per timestep with `rgba8-json-base64`
- one raw registered depth frame per timestep with `float32-meter-json-base64`
- `registration.colorSource` describing whether the aligned color came from Kinect or an offline-aligned external camera

For hybrid bundles (`registration.colorSource = external-camera-rgb`), the contract also requires:

- `capture.calibration.externalColorCamera`
- `capture.metadata.hybrid.sync`
- `capture.metadata.hybrid.alignment`

The current RGBD export intentionally writes:

- `manifest.json`
- one JSON color frame per timestep with `rgba8-json-base64`
- one JSON depth frame per timestep with normalized `float32-json-base64`
- processing metadata that preserves the original per-frame meter ranges used before normalization
- processing metadata that also records the registered color source for the clip

## Capture-Control Storage

The operator scaffold now keeps three local layers separate:

- `tmp/kinect-capture/raw-takes/<take-id>/`
  - immutable raw registered frame bundle
  - same general contract that `process.py export-rgbd` already expects
- `tmp/kinect-capture/edited-takes/<take-id>.json`
  - rename / keep-discard / trim metadata
  - references the raw take instead of mutating it
- `tmp/kinect-capture/preview/latest.json`
  - latest preview frame for the operator surface

The browser operator route lives at `/capture-control`.
