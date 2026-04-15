from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from importlib.util import find_spec
from pathlib import Path

from .control import (
	DEFAULT_CAPTURE_ROOT,
	DEFAULT_PREVIEW_HEIGHT,
	DEFAULT_PREVIEW_WIDTH,
	DEFAULT_RECORD_FPS,
	DEFAULT_RECORD_MAX_FRAMES,
	capture_preview,
	get_status,
	list_take_summaries,
	read_take_detail,
	read_take_frame,
	rename_take,
	run_record_loop,
	run_live_preview_loop,
	set_take_decision,
	start_recording,
	stop_live_preview_worker,
	stop_recording,
	trim_take,
)
from .mock_data import (
	EXTERNAL_CAMERA_RGB_SOURCE,
	KINECT_REGISTERED_COLOR_SOURCE,
	write_mock_capture_bundle,
)
from .native_helper import (
	capture_live_bundle,
	probe_native_helper,
	read_optional_int,
	read_optional_str,
)


KINECT_COLOR_RESOLUTION = (1920, 1080)
KINECT_DEPTH_RESOLUTION = (512, 424)


@dataclass(frozen=True)
class CaptureProbeResult:
	backend_available: bool
	backend_module: str
	python_binding_available: bool
	helper_available: bool
	helper_path: str | None
	device_count: int | None
	default_serial: str | None
	helper_error: str | None
	color_resolution: tuple[int, int]
	depth_resolution: tuple[int, int]
	registration_source_of_truth: str


def build_parser() -> argparse.ArgumentParser:
	parser = argparse.ArgumentParser(
		description='Kinect V2 capture, operator control, and RGBD bundle utilities.',
	)
	subparsers = parser.add_subparsers(dest='command', required=True)

	subparsers.add_parser(
		'probe',
		help='Check whether the Python binding or native libfreenect2 helper is available.',
	)

	status_parser = subparsers.add_parser(
		'status',
		help='Return capture-control status for preview/record/review tooling.',
	)
	status_parser.add_argument(
		'--root',
		type=Path,
		default=DEFAULT_CAPTURE_ROOT,
		help='Capture-control root directory.',
	)

	preview_parser = subparsers.add_parser(
		'preview',
		help='Capture or read the latest preview frame for the operator workflow.',
	)
	preview_parser.add_argument(
		'--root',
		type=Path,
		default=DEFAULT_CAPTURE_ROOT,
		help='Capture-control root directory.',
	)
	preview_parser.add_argument('--width', type=int, default=DEFAULT_PREVIEW_WIDTH, help='Preview frame width.')
	preview_parser.add_argument('--height', type=int, default=DEFAULT_PREVIEW_HEIGHT, help='Preview frame height.')

	preview_stop_parser = subparsers.add_parser(
		'preview-stop',
		help='Stop the background live preview worker for the operator workflow.',
	)
	preview_stop_parser.add_argument(
		'--root',
		type=Path,
		default=DEFAULT_CAPTURE_ROOT,
		help='Capture-control root directory.',
	)

	record_start_parser = subparsers.add_parser(
		'record-start',
		help='Start recording a raw take in the background.',
	)
	record_start_parser.add_argument(
		'--root',
		type=Path,
		default=DEFAULT_CAPTURE_ROOT,
		help='Capture-control root directory.',
	)
	record_start_parser.add_argument('--label', type=str, default=None, help='Operator label for the take.')
	record_start_parser.add_argument('--width', type=int, default=DEFAULT_PREVIEW_WIDTH, help='Registered frame width.')
	record_start_parser.add_argument('--height', type=int, default=DEFAULT_PREVIEW_HEIGHT, help='Registered frame height.')
	record_start_parser.add_argument('--fps', type=float, default=DEFAULT_RECORD_FPS, help='Recording FPS.')
	record_start_parser.add_argument(
		'--max-frames',
		type=int,
		default=DEFAULT_RECORD_MAX_FRAMES,
		help='Hard safety cap for recorded frames.',
	)
	record_start_parser.add_argument(
		'--provider',
		choices=('auto', 'live', 'mock'),
		default='auto',
		help='Capture provider selection. auto uses live Kinect only when a device is visible.',
	)

	record_stop_parser = subparsers.add_parser(
		'record-stop',
		help='Request stop for the active recording and wait briefly for finalization.',
	)
	record_stop_parser.add_argument(
		'--root',
		type=Path,
		default=DEFAULT_CAPTURE_ROOT,
		help='Capture-control root directory.',
	)
	record_stop_parser.add_argument(
		'--timeout-ms',
		type=int,
		default=5_000,
		help='How long to wait for the background recorder to finalize.',
	)

	list_takes_parser = subparsers.add_parser(
		'list-takes',
		help='List edited take summaries for the capture-control workflow.',
	)
	list_takes_parser.add_argument(
		'--root',
		type=Path,
		default=DEFAULT_CAPTURE_ROOT,
		help='Capture-control root directory.',
	)

	show_take_parser = subparsers.add_parser(
		'show-take',
		help='Read one edited take plus its raw capture metadata.',
	)
	show_take_parser.add_argument(
		'--root',
		type=Path,
		default=DEFAULT_CAPTURE_ROOT,
		help='Capture-control root directory.',
	)
	show_take_parser.add_argument('--take-id', type=str, required=True, help='Edited take id.')

	show_frame_parser = subparsers.add_parser(
		'show-frame',
		help='Read one raw frame for take review.',
	)
	show_frame_parser.add_argument(
		'--root',
		type=Path,
		default=DEFAULT_CAPTURE_ROOT,
		help='Capture-control root directory.',
	)
	show_frame_parser.add_argument('--take-id', type=str, required=True, help='Edited take id.')
	show_frame_parser.add_argument('--frame-index', type=int, required=True, help='Zero-based frame index.')

	rename_take_parser = subparsers.add_parser(
		'rename-take',
		help='Rename an edited take without mutating the raw capture.',
	)
	rename_take_parser.add_argument(
		'--root',
		type=Path,
		default=DEFAULT_CAPTURE_ROOT,
		help='Capture-control root directory.',
	)
	rename_take_parser.add_argument('--take-id', type=str, required=True, help='Edited take id.')
	rename_take_parser.add_argument('--label', type=str, required=True, help='New operator label.')

	decision_parser = subparsers.add_parser(
		'set-decision',
		help='Set keep/discard/pending on an edited take.',
	)
	decision_parser.add_argument(
		'--root',
		type=Path,
		default=DEFAULT_CAPTURE_ROOT,
		help='Capture-control root directory.',
	)
	decision_parser.add_argument('--take-id', type=str, required=True, help='Edited take id.')
	decision_parser.add_argument(
		'--decision',
		choices=('pending', 'keep', 'discard'),
		required=True,
		help='Edited-take decision state.',
	)

	trim_parser = subparsers.add_parser(
		'trim-take',
		help='Store trim metadata on an edited take without mutating the raw take.',
	)
	trim_parser.add_argument(
		'--root',
		type=Path,
		default=DEFAULT_CAPTURE_ROOT,
		help='Capture-control root directory.',
	)
	trim_parser.add_argument('--take-id', type=str, required=True, help='Edited take id.')
	trim_parser.add_argument('--in-frame', type=int, required=True, help='Inclusive trim in-frame.')
	trim_parser.add_argument('--out-frame', type=int, required=True, help='Inclusive trim out-frame.')

	mock_snapshot_parser = subparsers.add_parser(
		'mock-snapshot',
		help='Write a mock capture metadata snapshot so downstream processing code can be exercised without hardware.',
	)
	mock_snapshot_parser.add_argument(
		'--output',
		type=Path,
		default=Path('tmp/kinect-capture/mock-snapshot.json'),
		help='Path to write the mock capture metadata JSON.',
	)

	mock_bundle_parser = subparsers.add_parser(
		'mock-bundle',
		help='Write a mock registered capture bundle that `process.py export-rgbd` can convert into browser RGBD assets.',
	)
	mock_bundle_parser.add_argument(
		'--output',
		type=Path,
		default=Path('tmp/kinect-capture/kinect-rgbd-registration-smoke'),
		help='Directory to write the mock registered capture bundle.',
	)
	mock_bundle_parser.add_argument('--frames', type=int, default=24, help='Frame count for the mock bundle.')
	mock_bundle_parser.add_argument('--width', type=int, default=192, help='Registered frame width.')
	mock_bundle_parser.add_argument('--height', type=int, default=160, help='Registered frame height.')
	mock_bundle_parser.add_argument('--fps', type=float, default=12.0, help='FPS for the mock bundle.')
	mock_bundle_parser.add_argument(
		'--color-source',
		choices=(KINECT_REGISTERED_COLOR_SOURCE, EXTERNAL_CAMERA_RGB_SOURCE),
		default=KINECT_REGISTERED_COLOR_SOURCE,
		help='Whether the mock registered bundle should represent native Kinect color or offline-aligned external camera RGB.',
	)

	live_bundle_parser = subparsers.add_parser(
		'live-bundle',
		help='Capture live registered Kinect RGBD frames through the native libfreenect2 helper.',
	)
	live_bundle_parser.add_argument(
		'--output',
		type=Path,
		default=Path('tmp/kinect-capture/live-kinect-rgbd-smoke'),
		help='Directory to write the live registered capture bundle.',
	)
	live_bundle_parser.add_argument('--frames', type=int, default=1, help='Frame count to capture.')
	live_bundle_parser.add_argument('--fps', type=float, default=12.0, help='Target FPS when capturing more than one frame.')
	live_bundle_parser.add_argument('--warmup-frames', type=int, default=5, help='Frames to discard before writing output.')
	live_bundle_parser.add_argument('--timeout-ms', type=int, default=10_000, help='Frame wait timeout in milliseconds.')
	live_bundle_parser.add_argument(
		'--pipeline',
		choices=('cpu', 'gl', 'default'),
		default='cpu',
		help='libfreenect2 packet pipeline for the helper.',
	)
	live_bundle_parser.add_argument(
		'--helper',
		type=Path,
		default=None,
		help='Path to kinect_capture_helper. Defaults to KINECT_CAPTURE_HELPER or tmp/bin/kinect_capture_helper.',
	)

	record_run_parser = subparsers.add_parser(
		'record-run',
		help=argparse.SUPPRESS,
	)
	record_run_parser.add_argument('--root', type=Path, required=True)
	record_run_parser.add_argument('--take-id', type=str, required=True)
	record_run_parser.add_argument('--label', type=str, default=None)
	record_run_parser.add_argument('--width', type=int, required=True)
	record_run_parser.add_argument('--height', type=int, required=True)
	record_run_parser.add_argument('--fps', type=float, required=True)
	record_run_parser.add_argument('--max-frames', type=int, required=True)
	record_run_parser.add_argument('--provider', choices=('auto', 'live', 'mock'), default='auto')

	preview_run_parser = subparsers.add_parser(
		'preview-run',
		help=argparse.SUPPRESS,
	)
	preview_run_parser.add_argument('--root', type=Path, required=True)
	preview_run_parser.add_argument('--fps', type=float, default=6.0)
	preview_run_parser.add_argument('--max-frames', type=int, default=1_000_000)
	preview_run_parser.add_argument('--preview-width', type=int, default=DEFAULT_PREVIEW_WIDTH)
	preview_run_parser.add_argument('--preview-height', type=int, default=DEFAULT_PREVIEW_HEIGHT)

	return parser


def main() -> int:
	args = build_parser().parse_args()

	if args.command == 'probe':
		print(json.dumps(asdict(probe_backend()), indent=2))
		return 0

	if args.command == 'status':
		print(json.dumps(get_status(args.root), indent=2))
		return 0

	if args.command == 'preview':
		print(
			json.dumps(
				capture_preview(
					args.root,
					width=args.width,
					height=args.height,
				),
				indent=2,
			)
		)
		return 0

	if args.command == 'preview-stop':
		stop_live_preview_worker(args.root)
		print(json.dumps(get_status(args.root), indent=2))
		return 0

	if args.command == 'record-start':
		print(
			json.dumps(
				start_recording(
					args.root,
					label=args.label,
					width=args.width,
					height=args.height,
					fps=args.fps,
					max_frames=args.max_frames,
					provider=args.provider,
				),
				indent=2,
			)
		)
		return 0

	if args.command == 'record-stop':
		print(json.dumps(stop_recording(args.root, timeout_ms=args.timeout_ms), indent=2))
		return 0

	if args.command == 'list-takes':
		print(json.dumps(list_take_summaries(args.root), indent=2))
		return 0

	if args.command == 'show-take':
		print(json.dumps(read_take_detail(args.root, args.take_id), indent=2))
		return 0

	if args.command == 'show-frame':
		print(json.dumps(read_take_frame(args.root, args.take_id, args.frame_index), indent=2))
		return 0

	if args.command == 'rename-take':
		print(json.dumps(rename_take(args.root, args.take_id, label=args.label), indent=2))
		return 0

	if args.command == 'set-decision':
		print(json.dumps(set_take_decision(args.root, args.take_id, decision=args.decision), indent=2))
		return 0

	if args.command == 'trim-take':
		print(
			json.dumps(
				trim_take(
					args.root,
					args.take_id,
					trim_in_frame=args.in_frame,
					trim_out_frame=args.out_frame,
				),
				indent=2,
			)
		)
		return 0

	if args.command == 'mock-snapshot':
		write_mock_snapshot(args.output)
		print(f'Wrote mock capture snapshot to {args.output}')
		return 0

	if args.command == 'mock-bundle':
		write_mock_capture_bundle(
			args.output,
			frame_count=args.frames,
			width=args.width,
			height=args.height,
			fps=args.fps,
			color_source=args.color_source,
		)
		print(f'Wrote mock registered capture bundle to {args.output}')
		return 0

	if args.command == 'live-bundle':
		result = capture_live_bundle(
			output_dir=args.output,
			frame_count=args.frames,
			fps=args.fps,
			warmup_frames=args.warmup_frames,
			timeout_ms=args.timeout_ms,
			pipeline=args.pipeline,
			helper_path=args.helper,
		)
		print(json.dumps(result, indent=2))
		return 0

	if args.command == 'record-run':
		run_record_loop(
			args.root,
			take_id=args.take_id,
			label=args.label,
			width=args.width,
			height=args.height,
			fps=args.fps,
			max_frames=args.max_frames,
			provider=args.provider,
		)
		return 0

	if args.command == 'preview-run':
		run_live_preview_loop(
			args.root,
			fps=args.fps,
			max_frames=args.max_frames,
			preview_width=args.preview_width,
			preview_height=args.preview_height,
		)
		return 0

	raise RuntimeError(f'Unsupported command: {args.command}')


def probe_backend() -> CaptureProbeResult:
	helper_probe = probe_native_helper()
	python_binding_available = find_spec('freenect2') is not None
	helper_available = helper_probe.payload is not None
	return CaptureProbeResult(
		backend_available=python_binding_available or helper_available,
		backend_module='freenect2',
		python_binding_available=python_binding_available,
		helper_available=helper_available,
		helper_path=str(helper_probe.path) if helper_probe.path else None,
		device_count=read_optional_int(helper_probe.payload, 'device_count'),
		default_serial=read_optional_str(helper_probe.payload, 'default_serial'),
		helper_error=helper_probe.error,
		color_resolution=KINECT_COLOR_RESOLUTION,
		depth_resolution=KINECT_DEPTH_RESOLUTION,
		registration_source_of_truth='libfreenect2',
	)


def write_mock_snapshot(output_path: Path) -> None:
	output_path.parent.mkdir(parents=True, exist_ok=True)
	payload = {
		'generatedAt': datetime.now(UTC).isoformat(),
		'sensor': 'kinect-v2',
		'serial': 'MOCK-KINECT-V2',
		'colorResolution': {
			'width': KINECT_COLOR_RESOLUTION[0],
			'height': KINECT_COLOR_RESOLUTION[1],
		},
		'depthResolution': {
			'width': KINECT_DEPTH_RESOLUTION[0],
			'height': KINECT_DEPTH_RESOLUTION[1],
		},
		'registration': {
			'provider': 'libfreenect2',
			'status': 'mock-only',
		},
	}
	output_path.write_text(json.dumps(payload, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
	raise SystemExit(main())
