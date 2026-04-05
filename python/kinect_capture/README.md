# Kinect Capture Scaffold

This directory holds the Phase 2 Kinect V2 capture/export scaffolding.

Current status:

- `capture.py` provides a backend probe plus a mock capture-metadata snapshot.
- `capture.py` can now also write a mock registered capture bundle.
- `process.py` converts that capture bundle into the same manifest/frame layout the browser demo consumes.
- `hands.py` provides a MediaPipe probe plus a mock landmark export.
- live libfreenect2 frame capture, one-frame registration validation, and real XYZRGB export still need actual hardware.

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
git clone https://github.com/OpenKinect/libfreenect2.git
cd libfreenect2
mkdir build
cd build
cmake .. -DCMAKE_BUILD_TYPE=RelWithDebInfo
cmake --build . -j
```

After building:

1. Install the upstream udev rule from `platform/linux/udev/90-kinect2.rules`.
2. Replug the sensor.
3. Run `./bin/Protonect` from the build directory to confirm RGB/depth capture and registration are healthy before touching the repo scripts here.

## Python Entry Points

Probe the expected Kinect binding:

```bash
python3 -m python.kinect_capture.capture probe
```

Write a mock registered RGBD clip for browser testing:

```bash
python3 -m python.kinect_capture.capture mock-bundle \
  --output tmp/kinect-capture/kinect-rgbd-registration-smoke

python3 -m python.kinect_capture.process export-rgbd \
  --input-dir tmp/kinect-capture/kinect-rgbd-registration-smoke \
  --output tmp/rgbd-sequences/kinect-rgbd-registration-smoke
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

The current RGBD export intentionally writes:

- `manifest.json`
- one JSON color frame per timestep with `rgba8-json-base64`
- one JSON depth frame per timestep with normalized `float32-json-base64`
- processing metadata that preserves the original per-frame meter ranges used before normalization
