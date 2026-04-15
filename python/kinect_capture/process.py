from __future__ import annotations

import argparse
import base64
import json
import struct
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

from .mock_data import (
	EXTERNAL_CAMERA_RGB_SOURCE,
	KINECT_REGISTERED_COLOR_SOURCE,
	RAW_COLOR_ENCODING,
	RAW_DEPTH_ENCODING,
	RAW_DEPTH_INVALID_METERS,
	SUPPORTED_COLOR_SOURCES,
	build_mock_capture_bundle_data,
	decode_float32_base64,
	write_json,
)


@dataclass(frozen=True)
class RawRegisteredFrame:
	color_rgba: bytes
	depth_meters: list[float]


@dataclass(frozen=True)
class CaptureBundle:
	payload: dict[str, object]
	frames: list[RawRegisteredFrame]


def build_parser() -> argparse.ArgumentParser:
	parser = argparse.ArgumentParser(
		description='Kinect RGBD export scaffolding. Converts a registered capture bundle into the app-layer RGBD manifest the browser already consumes.',
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
		help='Convert a registered capture bundle into the browser RGBD manifest/frame format.',
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
		export_capture_bundle_to_rgbd(args.input_dir, args.output)
		print(f'Exported Kinect RGBD clip to {args.output}')
		return 0

	raise RuntimeError(f'Unsupported command: {args.command}')


def write_mock_rgbd_clip(
	output_dir: Path,
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
	write_rgbd_export_from_bundle(
		CaptureBundle(
			payload=bundle.capture_payload,
			frames=[
				RawRegisteredFrame(
					color_rgba=frame.color_rgba,
					depth_meters=frame.depth_meters,
				)
				for frame in bundle.frames
			],
		),
		output_dir,
	)


def export_capture_bundle_to_rgbd(input_dir: Path, output_dir: Path) -> None:
	bundle = load_capture_bundle(input_dir)
	write_rgbd_export_from_bundle(bundle, output_dir)


def load_capture_bundle(input_dir: Path) -> CaptureBundle:
	capture_manifest_path = input_dir / 'capture.json'
	if not capture_manifest_path.exists():
		raise FileNotFoundError(f'Capture bundle manifest was not found at {capture_manifest_path}')

	payload = json.loads(capture_manifest_path.read_text(encoding='utf-8'))
	validate_capture_payload(payload)

	color_info = payload['color']
	depth_info = payload['depth']
	frames: list[RawRegisteredFrame] = []
	for frame_index, frame_ref in enumerate(payload['frames']):
		color_payload = json.loads((input_dir / frame_ref['colorFile']).read_text(encoding='utf-8'))
		depth_payload = json.loads((input_dir / frame_ref['depthFile']).read_text(encoding='utf-8'))

		if color_payload.get('encoding') != RAW_COLOR_ENCODING:
			raise ValueError(
				f'Capture frame {frame_index} color encoding must be {RAW_COLOR_ENCODING}; received {color_payload.get("encoding")!r}'
			)
		if depth_payload.get('encoding') != RAW_DEPTH_ENCODING:
			raise ValueError(
				f'Capture frame {frame_index} depth encoding must be {RAW_DEPTH_ENCODING}; received {depth_payload.get("encoding")!r}'
			)

		color_rgba = base64.b64decode(color_payload['data'].encode('ascii'))
		expected_color_length = color_info['width'] * color_info['height'] * 4
		if len(color_rgba) != expected_color_length:
			raise ValueError(
				f'Capture frame {frame_index} color length {len(color_rgba)} does not match expected RGBA length {expected_color_length}'
			)

		depth_meters = decode_float32_base64(depth_payload['data'])
		expected_depth_length = depth_info['width'] * depth_info['height']
		if len(depth_meters) != expected_depth_length:
			raise ValueError(
				f'Capture frame {frame_index} depth length {len(depth_meters)} does not match expected size {expected_depth_length}'
			)

		frames.append(
			RawRegisteredFrame(
				color_rgba=color_rgba,
				depth_meters=depth_meters,
			)
		)

	return CaptureBundle(payload=payload, frames=frames)


def validate_capture_payload(payload: object) -> None:
	if not isinstance(payload, dict):
		raise ValueError('Capture bundle payload must be a JSON object.')

	if payload.get('version') != 1:
		raise ValueError(f'Unsupported capture bundle version: {payload.get("version")!r}')

	frame_count = payload.get('frameCount')
	fps = payload.get('fps')
	frames = payload.get('frames')
	frame_timestamps = payload.get('frameTimestampsMs')
	color_info = payload.get('color')
	depth_info = payload.get('depth')
	registration = payload.get('registration')

	if not isinstance(frame_count, int) or frame_count <= 0:
		raise ValueError(f'Capture bundle frameCount must be a positive integer; received {frame_count!r}')
	if not isinstance(fps, (int, float)) or fps <= 0:
		raise ValueError(f'Capture bundle fps must be > 0; received {fps!r}')
	if not isinstance(frames, list) or len(frames) != frame_count:
		raise ValueError('Capture bundle frames length must match frameCount.')
	if not isinstance(frame_timestamps, list) or len(frame_timestamps) != frame_count:
		raise ValueError('Capture bundle frameTimestampsMs length must match frameCount.')
	if not isinstance(color_info, dict) or not isinstance(depth_info, dict):
		raise ValueError('Capture bundle must define color and depth metadata.')
	if not isinstance(registration, dict):
		raise ValueError('Capture bundle must define registration metadata.')

	for key in ('width', 'height'):
		if not isinstance(color_info.get(key), int) or color_info[key] <= 0:
			raise ValueError(f'Capture bundle color.{key} must be a positive integer; received {color_info.get(key)!r}')
		if not isinstance(depth_info.get(key), int) or depth_info[key] <= 0:
			raise ValueError(f'Capture bundle depth.{key} must be a positive integer; received {depth_info.get(key)!r}')

	provider = registration.get('provider')
	if not isinstance(provider, str) or not provider.strip():
		raise ValueError('Capture bundle registration.provider must be a non-empty string.')
	if registration.get('alignedTo') != 'depth-grid':
		raise ValueError('Capture bundle registration.alignedTo must be "depth-grid".')
	color_source = registration.get('colorSource', KINECT_REGISTERED_COLOR_SOURCE)
	if color_source not in SUPPORTED_COLOR_SOURCES:
		raise ValueError(f'Unsupported capture bundle registration.colorSource {color_source!r}.')
	if color_source == EXTERNAL_CAMERA_RGB_SOURCE:
		validate_hybrid_capture_payload(payload)


def write_rgbd_export_from_bundle(bundle: CaptureBundle, output_dir: Path) -> None:
	output_dir.mkdir(parents=True, exist_ok=True)
	payload = bundle.payload
	color_info = payload['color']
	depth_info = payload['depth']
	frame_entries: list[dict[str, str]] = []
	frame_depth_ranges: list[dict[str, float | int]] = []

	for frame_index, frame in enumerate(bundle.frames):
		color_file = f'color-{frame_index:04d}.json'
		depth_file = f'depth-{frame_index:04d}.json'
		normalized_depth, depth_range_meters, valid_count, invalid_count = normalize_depth_values(
			frame.depth_meters,
			invalid_value=float(depth_info.get('invalidValueMeters', RAW_DEPTH_INVALID_METERS)),
		)

		write_json(
			output_dir / color_file,
			{
				'width': color_info['width'],
				'height': color_info['height'],
				'encoding': 'rgba8-json-base64',
				'data': base64.b64encode(frame.color_rgba).decode('ascii'),
			},
		)
		write_json(
			output_dir / depth_file,
			{
				'width': depth_info['width'],
				'height': depth_info['height'],
				'encoding': 'float32-json-base64',
				'semantics': '0-far-1-near',
				'data': encode_float32_base64(normalized_depth),
			},
		)

		frame_entries.append({'colorFile': color_file, 'depthFile': depth_file})
		frame_depth_ranges.append(
			{
				'frameIndex': frame_index,
				'nearMeters': round(depth_range_meters[0], 4),
				'farMeters': round(depth_range_meters[1], 4),
				'validDepthPixels': valid_count,
				'invalidDepthPixels': invalid_count,
			}
		)

	manifest = {
		'version': 1,
		'fps': payload['fps'],
		'frameCount': payload['frameCount'],
		'frameTimestampsMs': payload['frameTimestampsMs'],
		'frames': frame_entries,
		'clips': payload.get('clips'),
		'raster': {
			'width': color_info['width'],
			'height': color_info['height'],
			'colorEncoding': 'rgba8-json-base64',
			'description': 'Registered color exported for browser RGBD playback.',
		},
		'depth': {
			'width': depth_info['width'],
			'height': depth_info['height'],
			'encoding': 'float32-json-base64',
			'semantics': '0-far-1-near',
			'description': 'Normalized depth exported from registered meter depth.',
		},
		'coordinateSystem': {
			'upAxis': 'y',
			'forwardAxis': '-z',
			'handedness': 'right',
			'description': 'Browser RGBD playback space for registered Kinect-style raster sampling.',
		},
		'units': 'meters',
		'processing': {
			'generator': 'python.kinect_capture.process:export-rgbd',
			'registration': payload.get('registration'),
			'colorSource': payload.get('registration', {}).get('colorSource', KINECT_REGISTERED_COLOR_SOURCE),
			'depthSourceUnits': depth_info.get('units', 'meters'),
			'depthNormalization': {
				'strategy': 'per-frame-minmax',
				'semanticsAfterNormalization': '0-far-1-near',
				'invalidFillValue': 0.0,
			},
			'frameDepthRangesMeters': frame_depth_ranges,
		},
		'capture': payload.get('capture'),
	}

	write_json(output_dir / 'manifest.json', manifest)


def validate_hybrid_capture_payload(payload: dict[str, object]) -> None:
	capture = payload.get('capture')
	if not isinstance(capture, dict):
		raise ValueError('Hybrid capture bundle must define capture metadata.')
	calibration = capture.get('calibration')
	if not isinstance(calibration, dict):
		raise ValueError('Hybrid capture bundle capture.calibration must be a JSON object.')
	external_camera = calibration.get('externalColorCamera')
	if not isinstance(external_camera, dict):
		raise ValueError('Hybrid capture bundle must define capture.calibration.externalColorCamera.')

	camera_id = external_camera.get('cameraId')
	if not isinstance(camera_id, str) or not camera_id.strip():
		raise ValueError('Hybrid capture bundle externalColorCamera.cameraId must be a non-empty string.')

	validate_named_resolution(
		external_camera.get('nativeResolution'),
		name='capture.calibration.externalColorCamera.nativeResolution',
	)

	intrinsics = external_camera.get('intrinsics')
	if not isinstance(intrinsics, dict):
		raise ValueError('Hybrid capture bundle externalColorCamera.intrinsics must be a JSON object.')
	for key in ('fx', 'fy', 'cx', 'cy'):
		value = intrinsics.get(key)
		if not isinstance(value, (int, float)) or value <= 0:
			raise ValueError(f'Hybrid capture bundle externalColorCamera.intrinsics.{key} must be > 0.')
	distortion_model = intrinsics.get('distortionModel')
	if not isinstance(distortion_model, str) or not distortion_model.strip():
		raise ValueError('Hybrid capture bundle externalColorCamera.intrinsics.distortionModel must be a non-empty string.')
	validate_number_list(
		intrinsics.get('distortionCoefficients'),
		name='capture.calibration.externalColorCamera.intrinsics.distortionCoefficients',
		minimum_length=0,
	)

	extrinsics = external_camera.get('extrinsicsToDepthCamera')
	if not isinstance(extrinsics, dict):
		raise ValueError('Hybrid capture bundle externalColorCamera.extrinsicsToDepthCamera must be a JSON object.')
	validate_number_list(
		extrinsics.get('rotationMatrixRowMajor'),
		name='capture.calibration.externalColorCamera.extrinsicsToDepthCamera.rotationMatrixRowMajor',
		exact_length=9,
	)
	validate_number_list(
		extrinsics.get('translationMeters'),
		name='capture.calibration.externalColorCamera.extrinsicsToDepthCamera.translationMeters',
		exact_length=3,
	)
	reprojection_rmse = extrinsics.get('reprojectionRmsePixels')
	if not isinstance(reprojection_rmse, (int, float)) or reprojection_rmse < 0:
		raise ValueError('Hybrid capture bundle externalColorCamera.extrinsicsToDepthCamera.reprojectionRmsePixels must be >= 0.')
	calibration_clip_id = extrinsics.get('calibrationClipId')
	if not isinstance(calibration_clip_id, str) or not calibration_clip_id.strip():
		raise ValueError('Hybrid capture bundle externalColorCamera.extrinsicsToDepthCamera.calibrationClipId must be a non-empty string.')

	metadata = capture.get('metadata')
	if not isinstance(metadata, dict):
		raise ValueError('Hybrid capture bundle capture.metadata must be a JSON object.')
	hybrid = metadata.get('hybrid')
	if not isinstance(hybrid, dict):
		raise ValueError('Hybrid capture bundle capture.metadata.hybrid must be a JSON object.')
	if hybrid.get('captureMode') != 'external-camera-rgb-plus-kinect-depth':
		raise ValueError('Hybrid capture bundle capture.metadata.hybrid.captureMode must describe external camera RGB plus Kinect depth.')

	sync = hybrid.get('sync')
	if not isinstance(sync, dict):
		raise ValueError('Hybrid capture bundle capture.metadata.hybrid.sync must be a JSON object.')
	sync_strategy = sync.get('strategy')
	if not isinstance(sync_strategy, str) or not sync_strategy.strip():
		raise ValueError('Hybrid capture bundle capture.metadata.hybrid.sync.strategy must be a non-empty string.')
	offset_ms = sync.get('offsetMs')
	if not isinstance(offset_ms, (int, float)):
		raise ValueError('Hybrid capture bundle capture.metadata.hybrid.sync.offsetMs must be numeric.')
	residual_jitter_ms = sync.get('residualJitterMs')
	if not isinstance(residual_jitter_ms, (int, float)) or residual_jitter_ms < 0:
		raise ValueError('Hybrid capture bundle capture.metadata.hybrid.sync.residualJitterMs must be >= 0.')

	alignment = hybrid.get('alignment')
	if not isinstance(alignment, dict):
		raise ValueError('Hybrid capture bundle capture.metadata.hybrid.alignment must be a JSON object.')
	if alignment.get('targetGrid') != 'kinect-depth':
		raise ValueError('Hybrid capture bundle capture.metadata.hybrid.alignment.targetGrid must be "kinect-depth".')
	for key in ('method', 'occlusionPolicy'):
		value = alignment.get(key)
		if not isinstance(value, str) or not value.strip():
			raise ValueError(f'Hybrid capture bundle capture.metadata.hybrid.alignment.{key} must be a non-empty string.')
	coverage_ratio = alignment.get('coverageRatio')
	if not isinstance(coverage_ratio, (int, float)) or coverage_ratio < 0 or coverage_ratio > 1:
		raise ValueError('Hybrid capture bundle capture.metadata.hybrid.alignment.coverageRatio must be between 0 and 1.')


def validate_named_resolution(value: object, *, name: str) -> None:
	if not isinstance(value, dict):
		raise ValueError(f'{name} must be a JSON object.')
	for key in ('width', 'height'):
		resolution_value = value.get(key)
		if not isinstance(resolution_value, int) or resolution_value <= 0:
			raise ValueError(f'{name}.{key} must be a positive integer.')


def validate_number_list(
	value: object,
	*,
	name: str,
	exact_length: int | None = None,
	minimum_length: int | None = None,
) -> None:
	if not isinstance(value, list):
		raise ValueError(f'{name} must be a JSON array.')
	if exact_length is not None and len(value) != exact_length:
		raise ValueError(f'{name} must contain exactly {exact_length} values.')
	if minimum_length is not None and len(value) < minimum_length:
		raise ValueError(f'{name} must contain at least {minimum_length} values.')
	for index, item in enumerate(value):
		if not isinstance(item, (int, float)):
			raise ValueError(f'{name}[{index}] must be numeric.')


def normalize_depth_values(
	depth_meters: Sequence[float],
	*,
	invalid_value: float,
) -> tuple[list[float], tuple[float, float], int, int]:
	valid_values = [value for value in depth_meters if value != invalid_value and value > 0]
	if not valid_values:
		raise ValueError('Depth frame did not contain any valid meter samples.')

	near_meters = min(valid_values)
	far_meters = max(valid_values)
	depth_range = max(far_meters - near_meters, 1e-6)

	normalized: list[float] = []
	invalid_count = 0
	for value in depth_meters:
		if value == invalid_value or value <= 0:
			normalized.append(0.0)
			invalid_count += 1
			continue

		zero_to_one = (value - near_meters) / depth_range
		normalized.append(clamp01(1.0 - zero_to_one))

	return normalized, (near_meters, far_meters), len(valid_values), invalid_count


def encode_float32_base64(values: Sequence[float]) -> str:
	return base64.b64encode(struct.pack(f'<{len(values)}f', *values)).decode('ascii')


def clamp01(value: float) -> float:
	return max(0.0, min(1.0, value))


if __name__ == '__main__':
	raise SystemExit(main())
