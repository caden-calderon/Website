from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from importlib.util import find_spec
from pathlib import Path


KINECT_COLOR_RESOLUTION = (1920, 1080)
KINECT_DEPTH_RESOLUTION = (512, 424)


@dataclass(frozen=True)
class CaptureProbeResult:
	backend_available: bool
	backend_module: str
	color_resolution: tuple[int, int]
	depth_resolution: tuple[int, int]
	registration_source_of_truth: str


def build_parser() -> argparse.ArgumentParser:
	parser = argparse.ArgumentParser(
		description='Kinect V2 capture scaffolding. Real hardware capture will land on top of this CLI.',
	)
	subparsers = parser.add_subparsers(dest='command', required=True)

	subparsers.add_parser(
		'probe',
		help='Check whether the expected Python Kinect binding is importable on this machine.',
	)

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

	return parser


def main() -> int:
	args = build_parser().parse_args()

	if args.command == 'probe':
		print(json.dumps(asdict(probe_backend()), indent=2))
		return 0

	if args.command == 'mock-snapshot':
		write_mock_snapshot(args.output)
		print(f'Wrote mock capture snapshot to {args.output}')
		return 0

	raise RuntimeError(f'Unsupported command: {args.command}')


def probe_backend() -> CaptureProbeResult:
	return CaptureProbeResult(
		backend_available=find_spec('freenect2') is not None,
		backend_module='freenect2',
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
