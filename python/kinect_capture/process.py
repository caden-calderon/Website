from __future__ import annotations

import argparse
import base64
import json
import math
import struct
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence


@dataclass(frozen=True)
class MockRgbdFrame:
	color_rgba: bytes
	depth_normalized: list[float]
	depth_range_meters: tuple[float, float]
	valid_depth_pixels: int
	invalid_depth_pixels: int


def build_parser() -> argparse.ArgumentParser:
	parser = argparse.ArgumentParser(
		description='Kinect RGBD export scaffolding. The current mock mode writes the same manifest shape the browser already consumes.',
	)
	subparsers = parser.add_subparsers(dest='command', required=True)

	mock_parser = subparsers.add_parser(
		'mock-rgbd',
		help='Write a mock registered Kinect-style RGBD clip using the app-layer RGBD manifest format.',
	)
	mock_parser.add_argument(
		'--output',
		type=Path,
		default=Path('tmp/rgbd-sequences/kinect-rgbd-registration-smoke'),
		help='Output directory for the mock RGBD clip.',
	)
	mock_parser.add_argument('--frames', type=int, default=24, help='Frame count for the mock clip.')
	mock_parser.add_argument('--width', type=int, default=192, help='Registered color/depth frame width.')
	mock_parser.add_argument('--height', type=int, default=160, help='Registered color/depth frame height.')
	mock_parser.add_argument('--fps', type=float, default=12.0, help='Playback FPS for the mock clip.')

	export_parser = subparsers.add_parser(
		'export-rgbd',
		help='Placeholder for the live libfreenect2 registration export path once captured frames exist.',
	)
	export_parser.add_argument('--input-dir', type=Path, required=True, help='Captured-frame input directory.')
	export_parser.add_argument('--output', type=Path, required=True, help='Output directory for exported RGBD assets.')

	return parser


def main() -> int:
	args = build_parser().parse_args()

	if args.command == 'mock-rgbd':
		write_mock_rgbd_clip(
			output_dir=args.output,
			frame_count=args.frames,
			width=args.width,
			height=args.height,
			fps=args.fps,
		)
		print(f'Wrote mock Kinect RGBD clip to {args.output}')
		return 0

	if args.command == 'export-rgbd':
		raise NotImplementedError(
			'Live libfreenect2 export is intentionally not wired yet. Use `mock-rgbd` until registered capture outputs exist, then extend this command to ingest those frames.'
		)

	raise RuntimeError(f'Unsupported command: {args.command}')


def write_mock_rgbd_clip(
	output_dir: Path,
	frame_count: int,
	width: int,
	height: int,
	fps: float,
) -> None:
	if frame_count <= 0:
		raise ValueError(f'frame_count must be positive; received {frame_count}')
	if width <= 0 or height <= 0:
		raise ValueError(f'width and height must be positive; received {width}x{height}')
	if fps <= 0:
		raise ValueError(f'fps must be > 0; received {fps}')

	output_dir.mkdir(parents=True, exist_ok=True)
	frame_entries: list[dict[str, str]] = []
	frame_depth_ranges: list[dict[str, float | int]] = []

	for frame_index in range(frame_count):
		frame = build_mock_frame(frame_index=frame_index, frame_count=frame_count, width=width, height=height)
		color_file = f'color-{frame_index:04d}.json'
		depth_file = f'depth-{frame_index:04d}.json'

		write_json(
			output_dir / color_file,
			{
				'width': width,
				'height': height,
				'encoding': 'rgba8-json-base64',
				'data': base64.b64encode(frame.color_rgba).decode('ascii'),
			},
		)
		write_json(
			output_dir / depth_file,
			{
				'width': width,
				'height': height,
				'encoding': 'float32-json-base64',
				'semantics': '0-far-1-near',
				'data': encode_float32_base64(frame.depth_normalized),
			},
		)

		frame_entries.append({'colorFile': color_file, 'depthFile': depth_file})
		frame_depth_ranges.append(
			{
				'frameIndex': frame_index,
				'nearMeters': round(frame.depth_range_meters[0], 4),
				'farMeters': round(frame.depth_range_meters[1], 4),
				'validDepthPixels': frame.valid_depth_pixels,
				'invalidDepthPixels': frame.invalid_depth_pixels,
			}
		)

	manifest = {
		'version': 1,
		'fps': fps,
		'frameCount': frame_count,
		'frameTimestampsMs': [round(index * (1000.0 / fps), 3) for index in range(frame_count)],
		'frames': frame_entries,
		'clips': [
			{
				'id': 'registration_smoke',
				'startFrame': 0,
				'endFrame': frame_count - 1,
				'mode': 'loop',
			}
		],
		'raster': {
			'width': width,
			'height': height,
			'colorEncoding': 'rgba8-json-base64',
			'description': 'Mock Kinect-style registered color aligned onto the depth raster grid.',
		},
		'depth': {
			'width': width,
			'height': height,
			'encoding': 'float32-json-base64',
			'semantics': '0-far-1-near',
			'description': 'Per-frame normalized depth exported from mock meter depth, preserving original meter ranges in processing metadata.',
		},
		'coordinateSystem': {
			'upAxis': 'y',
			'forwardAxis': '-z',
			'handedness': 'right',
			'description': 'Browser RGBD playback space for registered Kinect-style raster sampling.',
		},
		'units': 'meters',
		'processing': {
			'generator': 'python.kinect_capture.process:mock-rgbd',
			'registration': {
				'provider': 'libfreenect2',
				'status': 'mock-registered-export',
				'alignedTo': 'depth-grid',
			},
			'depthSourceUnits': 'meters',
			'depthNormalization': {
				'strategy': 'per-frame-minmax',
				'semanticsAfterNormalization': '0-far-1-near',
				'invalidFillValue': 0.0,
			},
			'frameDepthRangesMeters': frame_depth_ranges,
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
				'purpose': 'pre-hardware-browser-export-smoke-test',
				'notes': 'Mock registered RGBD clip used to validate the browser/runtime/export contract before Kinect hardware arrives.',
			},
		},
	}

	write_json(output_dir / 'manifest.json', manifest)


def build_mock_frame(frame_index: int, frame_count: int, width: int, height: int) -> MockRgbdFrame:
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
				depth_meters[pixel_index] = 0.0

			color_bytes[base_index] = round(clamp01(color[0]) * 255)
			color_bytes[base_index + 1] = round(clamp01(color[1]) * 255)
			color_bytes[base_index + 2] = round(clamp01(color[2]) * 255)
			color_bytes[base_index + 3] = round(clamp01(alpha) * 255)

	depth_normalized, depth_range_meters, valid_count, invalid_count = normalize_depth_values(depth_meters)
	return MockRgbdFrame(
		color_rgba=bytes(color_bytes),
		depth_normalized=depth_normalized,
		depth_range_meters=depth_range_meters,
		valid_depth_pixels=valid_count,
		invalid_depth_pixels=invalid_count,
	)


def normalize_depth_values(depth_meters: Sequence[float]) -> tuple[list[float], tuple[float, float], int, int]:
	valid_values = [value for value in depth_meters if value > 0 and math.isfinite(value)]
	if not valid_values:
		raise ValueError('Mock depth frame did not contain any valid pixels.')

	near_meters = min(valid_values)
	far_meters = max(valid_values)
	depth_range = max(far_meters - near_meters, 1e-6)

	normalized: list[float] = []
	invalid_count = 0
	for value in depth_meters:
		if value <= 0 or not math.isfinite(value):
			normalized.append(0.0)
			invalid_count += 1
			continue

		zero_to_one = (value - near_meters) / depth_range
		normalized.append(clamp01(1.0 - zero_to_one))

	return normalized, (near_meters, far_meters), len(valid_values), invalid_count


def encode_float32_base64(values: Sequence[float]) -> str:
	return base64.b64encode(struct.pack(f'<{len(values)}f', *values)).decode('ascii')


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


if __name__ == '__main__':
	raise SystemExit(main())
