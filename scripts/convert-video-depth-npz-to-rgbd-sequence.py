from __future__ import annotations

import argparse
import base64
import json
import math
import re
import subprocess
import tempfile
import zipfile
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image


DEFAULT_TARGET_FPS = 24.0
DEFAULT_MAX_FRAME_COUNT = 150
DEFAULT_MAX_EDGE = 640
DEFAULT_DEPTH_MODEL_LABEL = 'metric-video-depth-anything'
RAW_COLOR_ENCODING = 'rgba8-json-base64'
RAW_DEPTH_ENCODING = 'float32-json-base64'
RAW_DEPTH_SEMANTICS = '0-far-1-near'
VIDEO_FPS_EPSILON = 1e-6

try:
	DEPTH_RESAMPLE = Image.Resampling.BILINEAR
except AttributeError:
	DEPTH_RESAMPLE = Image.BILINEAR


@dataclass(frozen=True)
class VideoStreamInfo:
	width: int
	height: int
	duration_seconds: float
	avg_fps: float | None
	frame_count: int | None


@dataclass(frozen=True)
class DepthStack:
	frames: np.ndarray
	frame_count: int
	height: int
	width: int
	source_path: Path


@dataclass(frozen=True)
class OutputPlan:
	source_fps: float
	output_fps: float
	source_frame_count: int
	output_frame_count: int
	video_decode_frame_count: int
	source_depth_width: int
	source_depth_height: int
	output_width: int
	output_height: int
	selected_source_indices: tuple[int, ...]
	selected_video_indices: tuple[int, ...]
	frame_timestamps_ms: tuple[float, ...]


def build_parser() -> argparse.ArgumentParser:
	parser = argparse.ArgumentParser(
		description='Convert a recorded video plus baked depth NPZ into the existing browser RGBD manifest/frame layout.',
	)
	parser.add_argument('--video', type=Path, required=True, help='Input RGB video file (for example videos/Body.mp4).')
	parser.add_argument('--depths', type=Path, required=True, help='Input baked depth NPZ containing a `depths` array.')
	parser.add_argument('--output', type=Path, required=True, help='Output directory for the RGBD manifest and frame files.')
	parser.add_argument(
		'--target-fps',
		type=float,
		default=DEFAULT_TARGET_FPS,
		help=f'Desired output fps before any frame-count cap is applied (default: {DEFAULT_TARGET_FPS}).',
	)
	parser.add_argument(
		'--max-frame-count',
		type=int,
		default=DEFAULT_MAX_FRAME_COUNT,
		help=f'Maximum output frame count while preserving the full clip duration (default: {DEFAULT_MAX_FRAME_COUNT}).',
	)
	parser.add_argument(
		'--max-edge',
		type=int,
		default=DEFAULT_MAX_EDGE,
		help=f'Maximum output raster edge length after scaling (default: {DEFAULT_MAX_EDGE}).',
	)
	parser.add_argument(
		'--source-fps',
		type=float,
		default=None,
		help='Optional explicit fps for the baked depth stack. Defaults to depth_frame_count / video_duration.',
	)
	parser.add_argument(
		'--clip-id',
		type=str,
		default=None,
		help='Optional clip id for the manifest. Defaults to a slugified video filename stem.',
	)
	parser.add_argument(
		'--depth-model-label',
		type=str,
		default=DEFAULT_DEPTH_MODEL_LABEL,
		help=f'Metadata label for the baked depth source (default: {DEFAULT_DEPTH_MODEL_LABEL!r}).',
	)
	parser.add_argument(
		'--overwrite',
		action='store_true',
		help='Allow writing into a non-empty output directory by replacing previously generated frame JSON files and manifest.',
	)
	return parser


def main() -> int:
	args = build_parser().parse_args()
	validate_args(args)

	with open_depth_stack(args.depths) as depth_stack:
		video_info = probe_video_stream(args.video)
		plan = build_output_plan(
			video_info=video_info,
			depth_stack=depth_stack,
			target_fps=args.target_fps,
			max_frame_count=args.max_frame_count,
			max_edge=args.max_edge,
			source_fps_override=args.source_fps,
		)
		prepare_output_directory(args.output, overwrite=args.overwrite)
		write_rgbd_sequence(
			video_path=args.video,
			depth_stack=depth_stack,
			video_info=video_info,
			plan=plan,
			output_dir=args.output,
			clip_id=args.clip_id or slugify(args.video.stem),
			depth_model_label=args.depth_model_label,
		)
	print(f'Wrote RGBD sequence to {args.output}')
	print(f'Output frames: {plan.output_frame_count} at {plan.output_fps:.3f} fps ({plan.output_width}x{plan.output_height})')
	return 0


def validate_args(args: argparse.Namespace) -> None:
	if not args.video.exists():
		raise FileNotFoundError(f'Input video was not found at {args.video}')
	if not args.depths.exists():
		raise FileNotFoundError(f'Input depth NPZ was not found at {args.depths}')
	if args.target_fps <= 0:
		raise ValueError(f'--target-fps must be > 0; received {args.target_fps}')
	if args.max_frame_count <= 0:
		raise ValueError(f'--max-frame-count must be > 0; received {args.max_frame_count}')
	if args.max_edge <= 0:
		raise ValueError(f'--max-edge must be > 0; received {args.max_edge}')
	if args.source_fps is not None and args.source_fps <= 0:
		raise ValueError(f'--source-fps must be > 0 when provided; received {args.source_fps}')


@contextmanager
def open_depth_stack(path: Path):
	with tempfile.TemporaryDirectory(prefix='chromatic-depth-npz-') as temp_dir:
		temp_root = Path(temp_dir)
		array_path = materialize_depth_array(path, temp_root)
		frames = np.load(array_path, mmap_mode='r')
		if frames.ndim != 3:
			raise ValueError(f'Depth NPZ `depths` array must be rank-3 (frames, height, width); received shape {frames.shape}')
		if frames.shape[0] <= 0 or frames.shape[1] <= 0 or frames.shape[2] <= 0:
			raise ValueError(f'Depth NPZ `depths` array must have positive extents; received shape {frames.shape}')
		yield DepthStack(
			frames=frames,
			frame_count=int(frames.shape[0]),
			height=int(frames.shape[1]),
			width=int(frames.shape[2]),
			source_path=path,
		)


def materialize_depth_array(path: Path, temp_root: Path) -> Path:
	if path.suffix.lower() == '.npy':
		return path
	if path.suffix.lower() != '.npz':
		raise ValueError(f'Unsupported depth file format {path.suffix!r}; expected .npz or .npy.')

	array_path = temp_root / 'depths.npy'
	with zipfile.ZipFile(path) as archive:
		try:
			entry = archive.open('depths.npy')
		except KeyError as error:
			raise ValueError(f'Depth NPZ at {path} must contain a depths.npy entry.') from error
		with entry, array_path.open('wb') as output_handle:
			while True:
				chunk = entry.read(1024 * 1024)
				if not chunk:
					break
				output_handle.write(chunk)
	return array_path


def probe_video_stream(video_path: Path) -> VideoStreamInfo:
	command = [
		'ffprobe',
		'-v',
		'error',
		'-select_streams',
		'v:0',
		'-show_entries',
		'stream=width,height,avg_frame_rate,nb_frames',
		'-show_entries',
		'format=duration',
		'-of',
		'json',
		str(video_path),
	]
	result = subprocess.run(command, check=True, capture_output=True, text=True)
	payload = json.loads(result.stdout)
	streams = payload.get('streams') or []
	if not streams:
		raise ValueError(f'Video probe for {video_path} did not return a primary video stream.')

	stream = streams[0]
	width = int(stream['width'])
	height = int(stream['height'])
	duration_seconds = float(payload['format']['duration'])
	avg_fps = parse_rational(stream.get('avg_frame_rate'))
	frame_count = parse_optional_int(stream.get('nb_frames'))
	if width <= 0 or height <= 0:
		raise ValueError(f'Video stream dimensions must be positive; received {width}x{height}')
	if not math.isfinite(duration_seconds) or duration_seconds <= 0:
		raise ValueError(f'Video duration must be positive and finite; received {duration_seconds}')

	return VideoStreamInfo(
		width=width,
		height=height,
		duration_seconds=duration_seconds,
		avg_fps=avg_fps,
		frame_count=frame_count,
	)


def build_output_plan(
	*,
	video_info: VideoStreamInfo,
	depth_stack: DepthStack,
	target_fps: float,
	max_frame_count: int,
	max_edge: int,
	source_fps_override: float | None,
) -> OutputPlan:
	source_fps = source_fps_override or (depth_stack.frame_count / video_info.duration_seconds)
	if not math.isfinite(source_fps) or source_fps <= 0:
		raise ValueError(f'Unable to derive a positive source fps from depth frame count and video duration; received {source_fps}')

	output_width, output_height = scale_to_max_edge(depth_stack.width, depth_stack.height, max_edge)
	effective_output_fps = min(target_fps, source_fps)
	effective_output_fps = min(effective_output_fps, max_frame_count / video_info.duration_seconds)
	effective_output_fps = max(effective_output_fps, min(source_fps, 1.0 / video_info.duration_seconds))

	selected_indices = build_resampled_index_plan(
		source_frame_count=depth_stack.frame_count,
		source_fps=source_fps,
		duration_seconds=video_info.duration_seconds,
		output_fps=effective_output_fps,
		max_frame_count=max_frame_count,
	)
	frame_timestamps_ms = tuple(round((index * 1000.0) / source_fps, 3) for index in selected_indices)
	output_fps_from_timestamps = derive_fps_from_timestamps(frame_timestamps_ms, fallback=effective_output_fps)
	if video_info.frame_count is not None and video_info.frame_count > 0:
		selected_video_indices = map_source_indices_to_video_indices(
			source_indices=selected_indices,
			source_frame_count=depth_stack.frame_count,
			video_frame_count=video_info.frame_count,
		)
		video_decode_frame_count = video_info.frame_count
	else:
		selected_video_indices = selected_indices
		video_decode_frame_count = depth_stack.frame_count

	return OutputPlan(
		source_fps=source_fps,
		output_fps=output_fps_from_timestamps,
		source_frame_count=depth_stack.frame_count,
		output_frame_count=len(selected_indices),
		video_decode_frame_count=video_decode_frame_count,
		source_depth_width=depth_stack.width,
		source_depth_height=depth_stack.height,
		output_width=output_width,
		output_height=output_height,
		selected_source_indices=selected_indices,
		selected_video_indices=selected_video_indices,
		frame_timestamps_ms=frame_timestamps_ms,
	)


def build_resampled_index_plan(
	*,
	source_frame_count: int,
	source_fps: float,
	duration_seconds: float,
	output_fps: float,
	max_frame_count: int,
) -> tuple[int, ...]:
	indices: list[int] = []
	frame_index = 0
	while len(indices) < max_frame_count:
		timestamp_seconds = frame_index / output_fps
		if timestamp_seconds >= duration_seconds - VIDEO_FPS_EPSILON:
			break
		source_index = min(int(round(timestamp_seconds * source_fps)), source_frame_count - 1)
		if not indices or source_index != indices[-1]:
			indices.append(source_index)
		frame_index += 1

	if not indices:
		indices.append(0)

	if indices[-1] >= source_frame_count:
		raise ValueError(f'Resampled frame index {indices[-1]} exceeds depth frame count {source_frame_count}.')

	return tuple(indices)


def prepare_output_directory(output_dir: Path, *, overwrite: bool) -> None:
	if output_dir.exists():
		existing_entries = list(output_dir.iterdir())
		if existing_entries and not overwrite:
			raise FileExistsError(
				f'Output directory {output_dir} is not empty. Pass --overwrite or choose a new output directory.'
			)
		if overwrite:
			for pattern in ('color-*.json', 'depth-*.json', 'manifest.json'):
				for path in output_dir.glob(pattern):
					path.unlink()
	else:
		output_dir.mkdir(parents=True, exist_ok=True)


def write_rgbd_sequence(
	*,
	video_path: Path,
	depth_stack: DepthStack,
	video_info: VideoStreamInfo,
	plan: OutputPlan,
	output_dir: Path,
	clip_id: str,
	depth_model_label: str,
) -> None:
	frame_entries: list[dict[str, str]] = []
	frame_depth_ranges: list[dict[str, float | int]] = []
	video_index_to_output_index = {
		video_index: output_index for output_index, video_index in enumerate(plan.selected_video_indices)
	}

	for video_index, rgba_frame in stream_rgba_frames(
		video_path=video_path,
		source_fps=plan.source_fps,
		output_width=plan.output_width,
		output_height=plan.output_height,
		frame_count=plan.video_decode_frame_count,
		use_original_video_frame_count=plan.video_decode_frame_count != plan.source_frame_count,
	):
		output_index = video_index_to_output_index.get(video_index)
		if output_index is None:
			continue

		source_index = plan.selected_source_indices[output_index]
		depth_frame = depth_stack.frames[source_index]
		if depth_frame.shape != (plan.source_depth_height, plan.source_depth_width):
			raise ValueError(
				f'Depth frame {source_index} shape {depth_frame.shape} does not match expected source raster '
				f'{plan.source_depth_height}x{plan.source_depth_width}.'
			)

		if (plan.output_width, plan.output_height) != (plan.source_depth_width, plan.source_depth_height):
			depth_frame = resize_depth_frame(depth_frame, width=plan.output_width, height=plan.output_height)

		normalized_depth, near_meters, far_meters, valid_count, invalid_count = normalize_metric_depth_frame(depth_frame)
		color_file = f'color-{output_index:04d}.json'
		depth_file = f'depth-{output_index:04d}.json'

		write_json(
			output_dir / color_file,
			{
				'width': plan.output_width,
				'height': plan.output_height,
				'encoding': RAW_COLOR_ENCODING,
				'data': base64.b64encode(rgba_frame).decode('ascii'),
			},
		)
		write_json(
			output_dir / depth_file,
			{
				'width': plan.output_width,
				'height': plan.output_height,
				'encoding': RAW_DEPTH_ENCODING,
				'semantics': RAW_DEPTH_SEMANTICS,
				'data': base64.b64encode(normalized_depth.tobytes(order='C')).decode('ascii'),
			},
		)

		frame_entries.append({'colorFile': color_file, 'depthFile': depth_file})
		frame_depth_ranges.append(
			{
				'frameIndex': output_index,
				'sourceFrameIndex': source_index,
				'nearMeters': round(near_meters, 4),
				'farMeters': round(far_meters, 4),
				'validDepthPixels': valid_count,
				'invalidDepthPixels': invalid_count,
			},
		)

	if len(frame_entries) != plan.output_frame_count:
		raise RuntimeError(
			f'Expected to write {plan.output_frame_count} RGBD frames but wrote {len(frame_entries)}. '
			'This usually means ffmpeg sampling did not match the baked depth timeline.'
		)

	manifest = {
		'version': 1,
		'fps': round(plan.output_fps, 6),
		'frameCount': plan.output_frame_count,
		'frameTimestampsMs': list(plan.frame_timestamps_ms),
		'frames': frame_entries,
		'clips': [
			{
				'id': clip_id,
				'startFrame': 0,
				'endFrame': plan.output_frame_count - 1,
				'mode': 'loop',
			}
		],
		'raster': {
			'width': plan.output_width,
			'height': plan.output_height,
			'colorEncoding': RAW_COLOR_ENCODING,
			'description': 'Recorded video frames resampled and scaled for browser RGBD playback.',
		},
		'depth': {
			'width': plan.output_width,
			'height': plan.output_height,
			'encoding': RAW_DEPTH_ENCODING,
			'semantics': RAW_DEPTH_SEMANTICS,
			'description': 'Per-frame normalized depth derived from baked metric monocular depth.',
		},
		'coordinateSystem': {
			'upAxis': 'y',
			'forwardAxis': '-z',
			'handedness': 'right',
			'description': 'Recorded-video RGBD playback space for stylized raster sampling.',
		},
		'units': 'meters',
		'processing': {
			'generator': 'scripts/convert-video-depth-npz-to-rgbd-sequence.py',
			'videoDepthSource': {
				'model': depth_model_label,
				'depthFile': depth_stack.source_path.name,
			},
			'videoSampling': {
				'sourceWidth': video_info.width,
				'sourceHeight': video_info.height,
				'sourceDurationSeconds': round(video_info.duration_seconds, 6),
				'sourceVideoFps': video_info.avg_fps,
				'sourceVideoFrameCount': video_info.frame_count,
				'derivedDepthFps': round(plan.source_fps, 6),
				'selectedSourceFrameIndices': list(plan.selected_source_indices),
				'selectedVideoFrameIndices': list(plan.selected_video_indices),
				'maxEdge': plan.output_width if plan.output_width >= plan.output_height else plan.output_height,
			},
			'depthSourceUnits': 'meters',
			'depthNormalization': {
				'strategy': 'per-frame-minmax',
				'semanticsAfterNormalization': RAW_DEPTH_SEMANTICS,
				'invalidFillValue': 0.0,
			},
			'frameDepthRangesMeters': frame_depth_ranges,
		},
		'capture': {
			'sensor': 'recorded-video',
			'metadata': {
				'fileName': video_path.name,
				'sourceFrameCount': video_info.frame_count,
				'depthFrameCount': depth_stack.frame_count,
				'sourceDepthRaster': {
					'width': plan.source_depth_width,
					'height': plan.source_depth_height,
				},
			},
		},
	}
	write_json(output_dir / 'manifest.json', manifest)


def stream_rgba_frames(
	*,
	video_path: Path,
	source_fps: float,
	output_width: int,
	output_height: int,
	frame_count: int,
	use_original_video_frame_count: bool,
):
	frame_size = output_width * output_height * 4
	command = [
		'ffmpeg',
		'-v',
		'error',
		'-i',
		str(video_path),
		'-an',
		'-sn',
		'-dn',
	]
	if use_original_video_frame_count:
		command.extend(
			[
				'-vf',
				f'scale={output_width}:{output_height}:flags=lanczos',
			]
		)
	else:
		command.extend(
			[
				'-vf',
				f'fps={format_fps(source_fps)},scale={output_width}:{output_height}:flags=lanczos',
			]
		)
	command.extend(
		[
		'-frames:v',
		str(frame_count),
		'-f',
		'rawvideo',
		'-pix_fmt',
		'rgba',
		'pipe:1',
		]
	)
	process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
	if process.stdout is None or process.stderr is None:
		raise RuntimeError('Failed to create ffmpeg frame-extraction pipes.')

	try:
		for frame_index in range(frame_count):
			frame_bytes = read_exact(process.stdout, frame_size)
			if len(frame_bytes) != frame_size:
				stderr = process.stderr.read().decode('utf-8', errors='replace')
				raise RuntimeError(
					f'ffmpeg produced {len(frame_bytes)} bytes for frame {frame_index}, expected {frame_size}. '
					f'ffmpeg stderr:\n{stderr}'
				)
			yield frame_index, frame_bytes

		extra = process.stdout.read(1)
		if extra:
			raise RuntimeError('ffmpeg produced more color frames than expected for the baked depth stack.')
	finally:
		process.stdout.close()
		stderr_text = process.stderr.read().decode('utf-8', errors='replace')
		process.stderr.close()
		return_code = process.wait()
		if return_code != 0:
			raise RuntimeError(f'ffmpeg failed while decoding {video_path} (exit {return_code}).\n{stderr_text}')


def read_exact(handle, size: int) -> bytes:
	chunks = bytearray()
	while len(chunks) < size:
		chunk = handle.read(size - len(chunks))
		if not chunk:
			break
		chunks.extend(chunk)
	return bytes(chunks)


def resize_depth_frame(frame: np.ndarray, *, width: int, height: int) -> np.ndarray:
	image = Image.fromarray(frame.astype(np.float32), mode='F')
	resized = image.resize((width, height), resample=DEPTH_RESAMPLE)
	return np.asarray(resized, dtype=np.float32)


def normalize_metric_depth_frame(frame: np.ndarray) -> tuple[np.ndarray, float, float, int, int]:
	frame = np.asarray(frame, dtype=np.float32)
	valid_mask = np.isfinite(frame) & (frame > 0)
	valid_values = frame[valid_mask]
	if valid_values.size <= 0:
		raise ValueError('Depth frame did not contain any valid positive samples.')

	near_meters = float(valid_values.min())
	far_meters = float(valid_values.max())
	depth_range = max(far_meters - near_meters, 1e-6)
	normalized = np.zeros(frame.shape, dtype=np.float32)
	normalized[valid_mask] = 1.0 - ((frame[valid_mask] - near_meters) / depth_range)
	return normalized, near_meters, far_meters, int(valid_values.size), int(frame.size - valid_values.size)


def scale_to_max_edge(width: int, height: int, max_edge: int) -> tuple[int, int]:
	if max_edge <= 0:
		raise ValueError(f'max_edge must be positive; received {max_edge}')
	longest_edge = max(width, height, 1)
	scale = min(1.0, max_edge / longest_edge)
	return max(1, int(round(width * scale))), max(1, int(round(height * scale)))


def derive_fps_from_timestamps(timestamps_ms: tuple[float, ...], *, fallback: float) -> float:
	if len(timestamps_ms) <= 1:
		return fallback
	duration_ms = timestamps_ms[-1] - timestamps_ms[0]
	if duration_ms <= 0:
		return fallback
	return (len(timestamps_ms) - 1) * 1000.0 / duration_ms


def map_source_indices_to_video_indices(
	*,
	source_indices: tuple[int, ...],
	source_frame_count: int,
	video_frame_count: int,
) -> tuple[int, ...]:
	if source_frame_count <= 1 or video_frame_count <= 1:
		return tuple(0 for _ in source_indices)

	scale = (video_frame_count - 1) / (source_frame_count - 1)
	return tuple(min(int(round(source_index * scale)), video_frame_count - 1) for source_index in source_indices)


def format_fps(value: float) -> str:
	if abs(value - round(value)) <= 1e-9:
		return str(int(round(value)))
	return f'{value:.12f}'.rstrip('0').rstrip('.')


def parse_rational(value: str | None) -> float | None:
	if value in (None, '', '0/0'):
		return None
	if '/' in value:
		numerator_text, denominator_text = value.split('/', 1)
		numerator = float(numerator_text)
		denominator = float(denominator_text)
		if denominator == 0:
			return None
		return numerator / denominator
	return float(value)


def parse_optional_int(value: str | None) -> int | None:
	if value in (None, '', 'N/A'):
		return None
	return int(value)


def slugify(value: str) -> str:
	slug = re.sub(r'[^a-z0-9]+', '-', value.lower()).strip('-')
	return slug or 'clip'


def write_json(path: Path, payload: Any) -> None:
	path.write_text(f'{json.dumps(payload, indent=2)}\n', encoding='utf-8')


if __name__ == '__main__':
	raise SystemExit(main())
