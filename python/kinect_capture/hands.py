from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from importlib.util import find_spec
from pathlib import Path


@dataclass(frozen=True)
class HandProbeResult:
	backend_available: bool
	backend_module: str
	output_format: str


def build_parser() -> argparse.ArgumentParser:
	parser = argparse.ArgumentParser(
		description='MediaPipe hand-landmark scaffolding for future Kinect overlay alignment.',
	)
	subparsers = parser.add_subparsers(dest='command', required=True)

	subparsers.add_parser(
		'probe',
		help='Check whether MediaPipe is importable on this machine.',
	)

	mock_parser = subparsers.add_parser(
		'mock-landmarks',
		help='Write a small mock hand-landmark JSON file for downstream alignment experiments.',
	)
	mock_parser.add_argument(
		'--output',
		type=Path,
		default=Path('tmp/kinect-capture/mock-hand-landmarks.json'),
		help='Path to write the mock hand-landmark JSON.',
	)
	mock_parser.add_argument(
		'--frames',
		type=int,
		default=24,
		help='Frame count for the mock landmark clip.',
	)

	return parser


def main() -> int:
	args = build_parser().parse_args()

	if args.command == 'probe':
		print(json.dumps(probe_backend().__dict__, indent=2))
		return 0

	if args.command == 'mock-landmarks':
		write_mock_landmarks(args.output, args.frames)
		print(f'Wrote mock hand landmarks to {args.output}')
		return 0

	raise RuntimeError(f'Unsupported command: {args.command}')


def probe_backend() -> HandProbeResult:
	return HandProbeResult(
		backend_available=find_spec('mediapipe') is not None,
		backend_module='mediapipe',
		output_format='frame-indexed-json',
	)


def write_mock_landmarks(output_path: Path, frame_count: int) -> None:
	if frame_count <= 0:
		raise ValueError(f'frame_count must be positive; received {frame_count}')

	output_path.parent.mkdir(parents=True, exist_ok=True)
	frames = []
	for frame_index in range(frame_count):
		phase = 0.0 if frame_count <= 1 else frame_index / (frame_count - 1)
		wrist_x = 0.48 + (phase - 0.5) * 0.06
		frames.append(
			{
				'frameIndex': frame_index,
				'landmarks': {
					'left': [],
					'right': [
						{'id': 0, 'x': wrist_x, 'y': 0.72, 'z': -0.04},
						{'id': 5, 'x': wrist_x + 0.03, 'y': 0.58, 'z': -0.02},
						{'id': 9, 'x': wrist_x + 0.06, 'y': 0.5, 'z': -0.01},
						{'id': 13, 'x': wrist_x + 0.09, 'y': 0.46, 'z': 0.0},
						{'id': 17, 'x': wrist_x + 0.12, 'y': 0.44, 'z': 0.01},
					],
				},
			}
		)

	output_path.write_text(json.dumps({'frameCount': frame_count, 'frames': frames}, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
	raise SystemExit(main())
