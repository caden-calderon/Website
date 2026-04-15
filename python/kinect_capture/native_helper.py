from __future__ import annotations

import json
import os
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any


DEFAULT_HELPER_PATH = Path('tmp/bin/kinect_capture_helper')


@dataclass(frozen=True)
class HelperProbe:
	path: Path | None
	payload: dict[str, Any] | None
	error: str | None


def capture_live_bundle(
	*,
	output_dir: Path,
	frame_count: int,
	fps: float,
	warmup_frames: int,
	timeout_ms: int,
	pipeline: str,
	helper_path: Path | None,
	stop_file: Path | None = None,
) -> dict[str, Any]:
	helper = resolve_helper_path(helper_path)
	if helper is None:
		raise FileNotFoundError(
			'Native Kinect capture helper was not found. Run `pnpm build:kinect-helper` first, '
			'or set KINECT_CAPTURE_HELPER to a built helper path.'
		)

	args = [
		'capture',
		'--output',
		str(output_dir),
		'--frames',
		str(frame_count),
		'--fps',
		str(fps),
		'--warmup-frames',
		str(warmup_frames),
		'--timeout-ms',
		str(timeout_ms),
		'--pipeline',
		pipeline,
	]
	if stop_file is not None:
		args.extend(['--stop-file', str(stop_file)])
	return run_helper_json(helper, args)


def run_live_preview(
	*,
	preview_file: Path,
	heartbeat_file: Path,
	preview_width: int,
	preview_height: int,
	fps: float,
	max_frames: int,
	warmup_frames: int,
	timeout_ms: int,
	idle_timeout_ms: int,
	pipeline: str,
	helper_path: Path | None,
	stop_file: Path,
) -> dict[str, Any]:
	helper = resolve_helper_path(helper_path)
	if helper is None:
		raise FileNotFoundError(
			'Native Kinect capture helper was not found. Run `pnpm build:kinect-helper` first, '
			'or set KINECT_CAPTURE_HELPER to a built helper path.'
		)

	return run_helper_json(
		helper,
		[
			'preview',
			'--preview-file',
			str(preview_file),
			'--heartbeat-file',
			str(heartbeat_file),
			'--preview-width',
			str(preview_width),
			'--preview-height',
			str(preview_height),
			'--frames',
			str(max_frames),
			'--fps',
			str(fps),
			'--warmup-frames',
			str(warmup_frames),
			'--timeout-ms',
			str(timeout_ms),
			'--idle-timeout-ms',
			str(idle_timeout_ms),
			'--pipeline',
			pipeline,
			'--stop-file',
			str(stop_file),
		],
	)


def probe_native_helper() -> HelperProbe:
	helper = resolve_helper_path(None)
	if helper is None:
		return HelperProbe(path=None, payload=None, error='Native helper not found. Run `pnpm build:kinect-helper`.')
	try:
		return HelperProbe(path=helper, payload=run_helper_json(helper, ['probe']), error=None)
	except Exception as error:
		return HelperProbe(path=helper, payload=None, error=str(error))


def live_device_available() -> bool:
	probe = probe_native_helper()
	return read_optional_int(probe.payload, 'device_count') is not None and int(probe.payload['device_count']) > 0


def resolve_helper_path(explicit_path: Path | None) -> Path | None:
	candidates: list[Path] = []
	if explicit_path is not None:
		candidates.append(explicit_path)
	env_path = os.environ.get('KINECT_CAPTURE_HELPER')
	if env_path:
		candidates.append(Path(env_path))
	candidates.append(DEFAULT_HELPER_PATH)

	for candidate in candidates:
		resolved = candidate.expanduser()
		if resolved.exists() and os.access(resolved, os.X_OK):
			return resolved
	return None


def run_helper_json(helper_path: Path, args: list[str]) -> dict[str, Any]:
	completed = subprocess.run(
		[str(helper_path), *args],
		check=False,
		capture_output=True,
		text=True,
	)
	if completed.returncode != 0:
		stderr = completed.stderr.strip()
		stdout = completed.stdout.strip()
		raise RuntimeError(stderr or stdout or f'Kinect helper failed with exit code {completed.returncode}.')
	try:
		return json.loads(completed.stdout)
	except json.JSONDecodeError as error:
		raise RuntimeError(f'Kinect helper did not return JSON: {completed.stdout[:500]}') from error


def read_optional_int(payload: dict[str, Any] | None, key: str) -> int | None:
	if payload is None:
		return None
	value = payload.get(key)
	return value if isinstance(value, int) else None


def read_optional_str(payload: dict[str, Any] | None, key: str) -> str | None:
	if payload is None:
		return None
	value = payload.get(key)
	return value if isinstance(value, str) else None
