from __future__ import annotations

import base64
import json
import math
import struct
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence


RAW_COLOR_ENCODING = 'rgba8-json-base64'
RAW_DEPTH_ENCODING = 'float32-meter-json-base64'
RAW_DEPTH_INVALID_METERS = 0.0


@dataclass(frozen=True)
class MockCaptureFrame:
	color_rgba: bytes
	depth_meters: list[float]


@dataclass(frozen=True)
class MockCaptureBundleData:
	capture_payload: dict[str, object]
	frames: list[MockCaptureFrame]


def build_mock_capture_bundle_data(
	*,
	frame_count: int,
	width: int,
	height: int,
	fps: float,
) -> MockCaptureBundleData:
	if frame_count <= 0:
		raise ValueError(f'frame_count must be positive; received {frame_count}')
	if width <= 0 or height <= 0:
		raise ValueError(f'width and height must be positive; received {width}x{height}')
	if fps <= 0:
		raise ValueError(f'fps must be > 0; received {fps}')

	frames = [
		build_mock_capture_frame(
			frame_index=frame_index,
			frame_count=frame_count,
			width=width,
			height=height,
		)
		for frame_index in range(frame_count)
	]

	capture_payload: dict[str, object] = {
		'version': 1,
		'fps': fps,
		'frameCount': frame_count,
		'frameTimestampsMs': [round(index * (1000.0 / fps), 3) for index in range(frame_count)],
		'frames': [
			{
				'colorFile': f'frames/color-{frame_index:04d}.json',
				'depthFile': f'frames/depth-{frame_index:04d}.json',
			}
			for frame_index in range(frame_count)
		],
		'clips': [
			{
				'id': 'registration_smoke',
				'startFrame': 0,
				'endFrame': frame_count - 1,
				'mode': 'loop',
			}
		],
		'color': {
			'width': width,
			'height': height,
			'encoding': RAW_COLOR_ENCODING,
			'description': 'Registered color aligned to the depth raster grid before browser export.',
		},
		'depth': {
			'width': width,
			'height': height,
			'encoding': RAW_DEPTH_ENCODING,
			'units': 'meters',
			'invalidValueMeters': RAW_DEPTH_INVALID_METERS,
			'description': 'Registered depth in meters aligned to the same raster grid.',
		},
		'registration': {
			'provider': 'libfreenect2',
			'alignedTo': 'depth-grid',
			'status': 'mock-captured-bundle',
		},
		'capture': {
			'sensor': 'kinect-v2',
			'serial': 'MOCK-KINECT-V2',
			'calibration': {
				'source': 'mock-calibration-snapshot',
				'registrationProvider': 'libfreenect2',
				'colorResolution': {'width': 1920, 'height': 1080},
				'depthResolution': {'width': 512, 'height': 424},
			},
			'metadata': {
				'purpose': 'pre-hardware-capture-bundle-smoke-test',
				'notes': 'Mock registered capture bundle used to validate the capture/process handoff before Kinect hardware arrives.',
			},
		},
	}

	return MockCaptureBundleData(capture_payload=capture_payload, frames=frames)


def write_mock_capture_bundle(
	output_dir: Path,
	*,
	frame_count: int,
	width: int,
	height: int,
	fps: float,
) -> None:
	bundle = build_mock_capture_bundle_data(
		frame_count=frame_count,
		width=width,
		height=height,
		fps=fps,
	)
	output_dir.mkdir(parents=True, exist_ok=True)
	frames_dir = output_dir / 'frames'
	frames_dir.mkdir(parents=True, exist_ok=True)

	for frame_index, frame in enumerate(bundle.frames):
		write_json(
			frames_dir / f'color-{frame_index:04d}.json',
			{
				'width': width,
				'height': height,
				'encoding': RAW_COLOR_ENCODING,
				'data': base64.b64encode(frame.color_rgba).decode('ascii'),
			},
		)
		write_json(
			frames_dir / f'depth-{frame_index:04d}.json',
			{
				'width': width,
				'height': height,
				'encoding': RAW_DEPTH_ENCODING,
				'units': 'meters',
				'invalidValueMeters': RAW_DEPTH_INVALID_METERS,
				'data': encode_float32_base64(frame.depth_meters),
			},
		)

	write_json(output_dir / 'capture.json', bundle.capture_payload)


def build_mock_capture_frame(frame_index: int, frame_count: int, width: int, height: int) -> MockCaptureFrame:
	color_bytes = bytearray(width * height * 4)
	depth_meters = [0.0] * (width * height)
	phase = 0.0 if frame_count <= 1 else frame_index / (frame_count - 1)
	cycle = phase * math.tau
	head_shift = math.sin(cycle) * 0.08
	shoulder_shift = math.cos(cycle * 0.85) * 0.05
	arm_lift = math.sin(cycle * 1.4) * 0.06

	for y in range(height):
		v = y / max(height - 1, 1)
		for x in range(width):
			u = x / max(width - 1, 1)
			px = (u - 0.5) * 2.0
			py = (v - 0.55) * 2.0
			pixel_index = y * width + x
			base_index = pixel_index * 4

			alpha = 0.0
			depth = 3.6 + 0.18 * (1.0 - v)
			color = [0.0, 0.0, 0.0]

			torso = blob(px, py, 0.02 + shoulder_shift, 0.2, 0.34, 0.56)
			head = blob(px, py, 0.05 + head_shift, -0.35, 0.2, 0.24)
			shoulders = blob(px, py, 0.0 + shoulder_shift * 0.6, -0.02, 0.56, 0.2)
			arm = blob(px, py, -0.33 + shoulder_shift * 0.4, 0.05 - arm_lift, 0.12, 0.42)
			foreground_haze = blob(px, py, 0.44, -0.08, 0.18, 0.56)

			if torso > 0.06:
				alpha = max(alpha, torso)
				color = mix(color, [0.18, 0.22, 0.3], torso)
				depth = min(depth, 2.55 - torso * 0.18)
			if shoulders > 0.06:
				alpha = max(alpha, shoulders)
				color = mix(color, [0.34, 0.4, 0.58], shoulders * 0.7)
				depth = min(depth, 2.4 - shoulders * 0.16)
			if head > 0.06:
				alpha = max(alpha, head)
				color = mix(color, [0.88, 0.8, 0.73], head)
				depth = min(depth, 2.08 - head * 0.24)
			if arm > 0.06:
				alpha = max(alpha, arm)
				color = mix(color, [0.54, 0.6, 0.78], arm * 0.85)
				depth = min(depth, 2.24 - arm * 0.14)
			if foreground_haze > 0.08:
				alpha = max(alpha, foreground_haze * 0.42)
				color = mix(color, [0.74, 0.78, 0.9], foreground_haze * 0.3)
				depth = min(depth, 1.78 - foreground_haze * 0.2)

			if alpha > 0.04:
				depth_meters[pixel_index] = clamp(depth, 1.3, 4.2)
			else:
				depth_meters[pixel_index] = RAW_DEPTH_INVALID_METERS

			color_bytes[base_index] = round(clamp01(color[0]) * 255)
			color_bytes[base_index + 1] = round(clamp01(color[1]) * 255)
			color_bytes[base_index + 2] = round(clamp01(color[2]) * 255)
			color_bytes[base_index + 3] = round(clamp01(alpha) * 255)

	return MockCaptureFrame(color_rgba=bytes(color_bytes), depth_meters=depth_meters)


def encode_float32_base64(values: Sequence[float]) -> str:
	return base64.b64encode(struct.pack(f'<{len(values)}f', *values)).decode('ascii')


def decode_float32_base64(encoded: str) -> list[float]:
	raw_bytes = base64.b64decode(encoded.encode('ascii'))
	return list(struct.unpack(f'<{len(raw_bytes) // 4}f', raw_bytes))


def write_json(path: Path, payload: object) -> None:
	path.write_text(json.dumps(payload, indent=2) + '\n', encoding='utf-8')


def blob(x: float, y: float, cx: float, cy: float, rx: float, ry: float) -> float:
	dx = (x - cx) / rx
	dy = (y - cy) / ry
	distance = dx * dx + dy * dy
	if distance >= 1.0:
		return 0.0
	return 1.0 - distance


def mix(current: Sequence[float], target: Sequence[float], amount: float) -> list[float]:
	return [
		current[0] + (target[0] - current[0]) * amount,
		current[1] + (target[1] - current[1]) * amount,
		current[2] + (target[2] - current[2]) * amount,
	]


def clamp01(value: float) -> float:
	return max(0.0, min(1.0, value))


def clamp(value: float, minimum: float, maximum: float) -> float:
	return max(minimum, min(maximum, value))
