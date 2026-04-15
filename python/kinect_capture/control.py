from __future__ import annotations

import json
import os
import signal
import subprocess
import sys
import time
import traceback
from datetime import UTC, datetime
from importlib.util import find_spec
from pathlib import Path
from typing import Any

from .mock_data import (
	RAW_COLOR_ENCODING,
	RAW_DEPTH_ENCODING,
	RAW_DEPTH_INVALID_METERS,
	build_mock_capture_frame,
	encode_float32_base64,
	write_json,
)
from .native_helper import (
	capture_live_bundle,
	live_device_available,
	probe_native_helper,
	read_optional_int,
	run_live_preview,
)


DEFAULT_CAPTURE_ROOT = Path('tmp/kinect-capture')
DEFAULT_PREVIEW_WIDTH = 192
DEFAULT_PREVIEW_HEIGHT = 160
DEFAULT_RECORD_FPS = 12.0
DEFAULT_RECORD_MAX_FRAMES = 600
DEFAULT_LIVE_PREVIEW_FPS = 6.0
DEFAULT_LIVE_PREVIEW_MAX_FRAMES = 1_000_000
DEFAULT_LIVE_PREVIEW_IDLE_TIMEOUT_MS = 8_000
PREVIEW_ANIMATION_FRAME_COUNT = 120
CONTROL_STATE_VERSION = 1
EDITED_TAKE_VERSION = 1
PREVIEW_VERSION = 1


def get_status(root_dir: Path) -> dict[str, object]:
	state = load_state(root_dir)
	state = reconcile_recording_state(root_dir, state)
	if not state['recording']['active']:
		state = refresh_provider_state(root_dir, state)
	return {
		**state,
		'takeCount': len(list_take_summaries(root_dir)['takes']),
	}


def capture_preview(
	root_dir: Path,
	*,
	width: int = DEFAULT_PREVIEW_WIDTH,
	height: int = DEFAULT_PREVIEW_HEIGHT,
) -> dict[str, object]:
	state = reconcile_recording_state(root_dir, load_state(root_dir))
	recording = state['recording']
	preview_path = preview_file_path(root_dir)
	if recording['active'] and preview_path.exists():
		return read_json_file(preview_path)
	touch_live_preview_heartbeat(root_dir)
	if not recording['active'] and live_preview_worker_active(root_dir) and preview_path.exists():
		return read_json_file(preview_path)
	if not recording['active'] and live_device_available():
		ensure_live_preview_worker(root_dir, width=width, height=height)
		if preview_path.exists():
			return read_json_file(preview_path)
		return build_live_preview_starting_payload(root_dir)

	frame_index = compute_preview_frame_index()
	frame = build_mock_capture_frame(
		frame_index=frame_index,
		frame_count=PREVIEW_ANIMATION_FRAME_COUNT,
		width=width,
		height=height,
	)
	preview = build_preview_payload(
		color_rgba=frame.color_rgba,
		depth_meters=frame.depth_meters,
		width=width,
		height=height,
		frame_index=frame_index,
		frame_timestamp_ms=round(frame_index * (1000.0 / DEFAULT_RECORD_FPS), 3),
		recording_active=False,
		raw_take_id=None,
		provider_mode=state['providerMode'],
	)
	atomic_write_json(preview_path, preview)
	return preview


def start_recording(
	root_dir: Path,
	*,
	label: str | None,
	width: int,
	height: int,
	fps: float,
	max_frames: int,
	provider: str = 'auto',
) -> dict[str, object]:
	state = reconcile_recording_state(root_dir, load_state(root_dir))
	recording = state['recording']
	if recording['active']:
		raise RuntimeError(f'Recording is already active for take "{recording["takeId"]}".')
	if width <= 0 or height <= 0:
		raise ValueError(f'Recording size must be positive; received {width}x{height}.')
	if fps <= 0:
		raise ValueError(f'Recording fps must be > 0; received {fps!r}.')
	if max_frames <= 0:
		raise ValueError(f'Recording max_frames must be positive; received {max_frames!r}.')
	if provider not in {'auto', 'live', 'mock'}:
		raise ValueError(f'Unsupported recording provider {provider!r}.')

	state = refresh_provider_state(root_dir, state)
	live_available = live_device_available()
	if provider == 'live' and not live_available:
		raise RuntimeError('Live Kinect recording was requested, but the native helper cannot see a Kinect device.')
	use_live = provider == 'live' or (provider == 'auto' and live_available)
	provider_mode = 'live-kinect' if use_live else 'mock-fallback'
	record_width = 512 if use_live else width
	record_height = 424 if use_live else height
	if use_live:
		stop_live_preview_worker(root_dir)

	ensure_root_layout(root_dir)
	take_id = allocate_take_id(root_dir)
	command = [
		sys.executable,
		'-m',
		'python.kinect_capture.capture',
		'record-run',
		'--root',
		str(root_dir),
		'--take-id',
		take_id,
		'--width',
		str(record_width),
		'--height',
		str(record_height),
		'--fps',
		str(fps),
		'--max-frames',
		str(max_frames),
		'--provider',
		'live' if use_live else 'mock',
	]
	if label:
		command.extend(['--label', label])

	process = subprocess.Popen(
		command,
		stdin=subprocess.DEVNULL,
		stdout=subprocess.DEVNULL,
		stderr=subprocess.DEVNULL,
		start_new_session=True,
	)

	now = utc_now_iso()
	recording_state = {
		'active': True,
		'status': 'recording',
		'takeId': take_id,
		'pid': process.pid,
		'label': label.strip() if label else default_take_label(take_id),
		'startedAt': now,
		'frameCount': 0,
		'elapsedMs': 0.0,
		'fps': fps,
		'width': record_width,
		'height': record_height,
		'maxFrames': max_frames,
		'stopRequested': False,
		'mockFallback': not use_live,
	}
	next_state = {
		**state,
		'providerMode': provider_mode,
		'updatedAt': now,
		'recording': recording_state,
		'lastCompletedTakeId': state.get('lastCompletedTakeId'),
		'lastError': None,
	}
	atomic_write_json(state_file_path(root_dir), next_state)
	return next_state


def stop_recording(root_dir: Path, *, timeout_ms: int = 5_000) -> dict[str, object]:
	state = load_state(root_dir)
	recording = state['recording']
	if not recording['active']:
		return reconcile_recording_state(root_dir, state)

	stop_path = stop_flag_path(root_dir, str(recording['takeId']))
	stop_path.parent.mkdir(parents=True, exist_ok=True)
	stop_path.write_text('stop\n', encoding='utf-8')
	recording['stopRequested'] = True
	recording['status'] = 'stopping'
	state['updatedAt'] = utc_now_iso()
	atomic_write_json(state_file_path(root_dir), state)

	deadline = time.monotonic() + max(timeout_ms, 0) / 1000.0
	while time.monotonic() < deadline:
		time.sleep(0.05)
		current_state = reconcile_recording_state(root_dir, load_state(root_dir))
		if not current_state['recording']['active']:
			return current_state

	return reconcile_recording_state(root_dir, load_state(root_dir))


def run_record_loop(
	root_dir: Path,
	*,
	take_id: str,
	label: str | None,
	width: int,
	height: int,
	fps: float,
	max_frames: int,
	provider: str = 'auto',
) -> dict[str, object]:
	if provider not in {'auto', 'live', 'mock'}:
		raise ValueError(f'Unsupported recording provider {provider!r}.')
	if provider == 'live' or (provider == 'auto' and live_device_available()):
		return run_live_record_loop(
			root_dir,
			take_id=take_id,
			label=label,
			fps=fps,
			max_frames=max_frames,
		)

	ensure_root_layout(root_dir)
	raw_take_dir = root_dir / 'raw-takes' / take_id
	frames_dir = raw_take_dir / 'frames'
	frames_dir.mkdir(parents=True, exist_ok=True)

	log_path = log_file_path(root_dir, take_id)
	started_at = utc_now_iso()
	started_monotonic = time.monotonic()
	frame_timestamps_ms: list[float] = []
	frame_count = 0
	last_preview: dict[str, object] | None = None
	stop_path = stop_flag_path(root_dir, take_id)
	resolved_label = label.strip() if label else default_take_label(take_id)

	try:
		while frame_count < max_frames:
			frame_start = time.monotonic()
			frame_timestamp_ms = round((frame_start - started_monotonic) * 1000.0, 3)
			frame = build_mock_capture_frame(
				frame_index=frame_count % PREVIEW_ANIMATION_FRAME_COUNT,
				frame_count=PREVIEW_ANIMATION_FRAME_COUNT,
				width=width,
				height=height,
			)
			write_raw_frame_files(
				frames_dir=frames_dir,
				frame_index=frame_count,
				width=width,
				height=height,
				color_rgba=frame.color_rgba,
				depth_meters=frame.depth_meters,
			)
			frame_timestamps_ms.append(frame_timestamp_ms)
			frame_count += 1

			last_preview = build_preview_payload(
				color_rgba=frame.color_rgba,
				depth_meters=frame.depth_meters,
				width=width,
				height=height,
				frame_index=frame_count - 1,
				frame_timestamp_ms=frame_timestamp_ms,
				recording_active=True,
				raw_take_id=take_id,
				provider_mode='mock-fallback',
			)
			atomic_write_json(preview_file_path(root_dir), last_preview)
			write_recording_state_update(
				root_dir,
				take_id=take_id,
				label=resolved_label,
				started_at=started_at,
				frame_count=frame_count,
				frame_timestamp_ms=frame_timestamp_ms,
				fps=fps,
				width=width,
				height=height,
				max_frames=max_frames,
				provider_mode='mock-fallback',
				mock_fallback=True,
			)

			if stop_path.exists():
				break

			next_frame_time = started_monotonic + frame_count / fps
			sleep_seconds = next_frame_time - time.monotonic()
			if sleep_seconds > 0:
				time.sleep(sleep_seconds)

		ended_at = utc_now_iso()
		capture_payload = build_raw_take_capture_payload(
			take_id=take_id,
			label=resolved_label,
			width=width,
			height=height,
			fps=fps,
			frame_count=frame_count,
			frame_timestamps_ms=frame_timestamps_ms,
			started_at=started_at,
			ended_at=ended_at,
		)
		write_json(raw_take_dir / 'capture.json', capture_payload)

		edited_take = build_edited_take_payload(
			take_id=take_id,
			label=resolved_label,
			frame_timestamps_ms=frame_timestamps_ms,
			created_at=ended_at,
		)
		write_json(edited_take_path(root_dir, take_id), edited_take)

		final_state = reconcile_recording_state(root_dir, load_state(root_dir))
		final_state['updatedAt'] = ended_at
		final_state['recording'] = default_recording_state()
		final_state['lastCompletedTakeId'] = take_id
		final_state['lastError'] = None
		atomic_write_json(state_file_path(root_dir), final_state)
		return final_state
	except Exception as error:
		log_path.parent.mkdir(parents=True, exist_ok=True)
		log_path.write_text(traceback.format_exc(), encoding='utf-8')
		failed_state = reconcile_recording_state(root_dir, load_state(root_dir))
		failed_state['updatedAt'] = utc_now_iso()
		failed_state['recording'] = default_recording_state()
		failed_state['lastCompletedTakeId'] = None
		failed_state['lastError'] = {
			'takeId': take_id,
			'message': str(error),
			'logPath': str(log_path),
		}
		atomic_write_json(state_file_path(root_dir), failed_state)
		raise
	finally:
		if stop_path.exists():
			stop_path.unlink()


def run_live_record_loop(
	root_dir: Path,
	*,
	take_id: str,
	label: str | None,
	fps: float,
	max_frames: int,
) -> dict[str, object]:
	ensure_root_layout(root_dir)
	raw_take_dir = root_dir / 'raw-takes' / take_id
	log_path = log_file_path(root_dir, take_id)
	stop_path = stop_flag_path(root_dir, take_id)
	started_at = utc_now_iso()
	resolved_label = label.strip() if label else default_take_label(take_id)

	try:
		write_recording_state_update(
			root_dir,
			take_id=take_id,
			label=resolved_label,
			started_at=started_at,
			frame_count=0,
			frame_timestamp_ms=0.0,
			fps=fps,
			width=512,
			height=424,
			max_frames=max_frames,
			provider_mode='live-kinect',
			mock_fallback=False,
		)
		capture_live_bundle(
			output_dir=raw_take_dir,
			frame_count=max_frames,
			fps=fps,
			warmup_frames=5,
			timeout_ms=10_000,
			pipeline='cpu',
			helper_path=None,
			stop_file=stop_path.resolve(),
		)
		ended_at = utc_now_iso()
		capture_payload = read_json_file(raw_take_dir / 'capture.json')
		frame_timestamps_ms = [float(value) for value in capture_payload['frameTimestampsMs']]
		capture_payload['capture'].setdefault('metadata', {})
		capture_payload['capture']['metadata']['operator'] = {
			'workflow': 'capture-control',
			'rawTakeId': take_id,
			'labelAtCapture': resolved_label,
			'recordingStartedAt': started_at,
			'recordingEndedAt': ended_at,
			'providerMode': 'live-kinect',
		}
		write_json(raw_take_dir / 'capture.json', capture_payload)

		edited_take = build_edited_take_payload(
			take_id=take_id,
			label=resolved_label,
			frame_timestamps_ms=frame_timestamps_ms,
			created_at=ended_at,
		)
		write_json(edited_take_path(root_dir, take_id), edited_take)

		final_state = reconcile_recording_state(root_dir, load_state(root_dir))
		final_state['providerMode'] = 'live-kinect'
		final_state['updatedAt'] = ended_at
		final_state['recording'] = default_recording_state()
		final_state['lastCompletedTakeId'] = take_id
		final_state['lastError'] = None
		atomic_write_json(state_file_path(root_dir), final_state)
		return final_state
	except Exception as error:
		log_path.parent.mkdir(parents=True, exist_ok=True)
		log_path.write_text(traceback.format_exc(), encoding='utf-8')
		failed_state = reconcile_recording_state(root_dir, load_state(root_dir))
		failed_state['providerMode'] = 'live-kinect-error'
		failed_state['updatedAt'] = utc_now_iso()
		failed_state['recording'] = default_recording_state()
		failed_state['lastCompletedTakeId'] = None
		failed_state['lastError'] = {
			'takeId': take_id,
			'message': str(error),
			'logPath': str(log_path),
		}
		atomic_write_json(state_file_path(root_dir), failed_state)
		raise
	finally:
		if stop_path.exists():
			stop_path.unlink()


def list_take_summaries(root_dir: Path) -> dict[str, object]:
	ensure_root_layout(root_dir)
	takes: list[dict[str, object]] = []
	for edited_path in sorted(root_dir.joinpath('edited-takes').glob('*.json')):
		edited_take = read_json_file(edited_path)
		take_id = str(edited_take['editedTakeId'])
		takes.append(build_take_summary(root_dir, take_id, edited_take))
	takes.sort(key=lambda take: str(take['updatedAt']), reverse=True)
	return {'takes': takes}


def read_take_detail(root_dir: Path, take_id: str) -> dict[str, object]:
	edited_take = load_edited_take(root_dir, take_id)
	raw_capture = load_raw_capture(root_dir, str(edited_take['rawTakeId']))
	return {
		'takeId': take_id,
		'editedTake': edited_take,
		'rawTake': {
			'path': str(raw_take_path(root_dir, str(edited_take['rawTakeId']))),
			'capture': raw_capture,
		},
	}


def read_take_frame(root_dir: Path, take_id: str, frame_index: int) -> dict[str, object]:
	detail = read_take_detail(root_dir, take_id)
	raw_capture = detail['rawTake']['capture']
	frame_count = int(raw_capture['frameCount'])
	if frame_index < 0 or frame_index >= frame_count:
		raise ValueError(f'Frame index {frame_index} is out of range for take "{take_id}".')

	frame_ref = raw_capture['frames'][frame_index]
	raw_take_dir = raw_take_path(root_dir, str(detail['editedTake']['rawTakeId']))
	color_payload = read_json_file(raw_take_dir / str(frame_ref['colorFile']))
	depth_payload = read_json_file(raw_take_dir / str(frame_ref['depthFile']))
	return {
		'takeId': take_id,
		'frameIndex': frame_index,
		'frameTimestampMs': raw_capture['frameTimestampsMs'][frame_index],
		'color': color_payload,
		'depth': depth_payload,
	}


def rename_take(root_dir: Path, take_id: str, *, label: str) -> dict[str, object]:
	if not label.strip():
		raise ValueError('Take label must be a non-empty string.')
	edited_take = load_edited_take(root_dir, take_id)
	edited_take['label'] = label.strip()
	edited_take['updatedAt'] = utc_now_iso()
	write_json(edited_take_path(root_dir, take_id), edited_take)
	return edited_take


def set_take_decision(root_dir: Path, take_id: str, *, decision: str) -> dict[str, object]:
	if decision not in {'pending', 'keep', 'discard'}:
		raise ValueError(f'Unsupported take decision {decision!r}.')
	edited_take = load_edited_take(root_dir, take_id)
	edited_take['decision'] = decision
	edited_take['updatedAt'] = utc_now_iso()
	write_json(edited_take_path(root_dir, take_id), edited_take)
	return edited_take


def trim_take(root_dir: Path, take_id: str, *, trim_in_frame: int, trim_out_frame: int) -> dict[str, object]:
	edited_take = load_edited_take(root_dir, take_id)
	raw_capture = load_raw_capture(root_dir, str(edited_take['rawTakeId']))
	frame_count = int(raw_capture['frameCount'])
	if trim_in_frame < 0 or trim_out_frame < 0:
		raise ValueError('Trim frame indices must be >= 0.')
	if trim_in_frame >= frame_count or trim_out_frame >= frame_count:
		raise ValueError(f'Trim frame indices must be within the raw take frame range 0-{frame_count - 1}.')
	if trim_in_frame > trim_out_frame:
		raise ValueError('Trim in-frame must be <= trim out-frame.')

	edited_take['trim'] = {
		'inFrame': trim_in_frame,
		'outFrame': trim_out_frame,
		'inTimestampMs': raw_capture['frameTimestampsMs'][trim_in_frame],
		'outTimestampMs': raw_capture['frameTimestampsMs'][trim_out_frame],
	}
	edited_take['updatedAt'] = utc_now_iso()
	write_json(edited_take_path(root_dir, take_id), edited_take)
	return edited_take


def ensure_root_layout(root_dir: Path) -> None:
	for path in (
		root_dir,
		root_dir / 'raw-takes',
		root_dir / 'edited-takes',
		root_dir / 'commands',
		root_dir / 'preview',
		root_dir / 'logs',
	):
		path.mkdir(parents=True, exist_ok=True)


def ensure_live_preview_worker(root_dir: Path, *, width: int, height: int) -> None:
	if live_preview_worker_active(root_dir):
		return

	lock_path = live_preview_lock_path(root_dir)
	if not acquire_live_preview_start_lock(lock_path):
		return

	try:
		if live_preview_worker_active(root_dir):
			return

		start_live_preview_worker(root_dir, width=width, height=height)
	finally:
		if lock_path.exists():
			lock_path.unlink()


def start_live_preview_worker(root_dir: Path, *, width: int, height: int) -> None:
	stop_path = live_preview_stop_path(root_dir)
	if stop_path.exists():
		stop_path.unlink()

	pid_path = live_preview_pid_path(root_dir)
	log_path = root_dir / 'logs' / 'live-preview.log'
	log_path.parent.mkdir(parents=True, exist_ok=True)
	command = [
		sys.executable,
		'-m',
		'python.kinect_capture.capture',
		'preview-run',
		'--root',
		str(root_dir),
		'--fps',
		str(DEFAULT_LIVE_PREVIEW_FPS),
		'--max-frames',
		str(DEFAULT_LIVE_PREVIEW_MAX_FRAMES),
		'--preview-width',
		str(width),
		'--preview-height',
		str(height),
	]
	with log_path.open('ab') as log_file:
		process = subprocess.Popen(
			command,
			stdin=subprocess.DEVNULL,
			stdout=log_file,
			stderr=log_file,
			start_new_session=True,
		)
	pid_path.parent.mkdir(parents=True, exist_ok=True)
	pid_path.write_text(f'{process.pid}\n', encoding='utf-8')


def acquire_live_preview_start_lock(lock_path: Path) -> bool:
	lock_path.parent.mkdir(parents=True, exist_ok=True)
	try:
		fd = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
	except FileExistsError:
		try:
			lock_age_seconds = time.time() - lock_path.stat().st_mtime
		except FileNotFoundError:
			return acquire_live_preview_start_lock(lock_path)
		if lock_age_seconds > 5:
			lock_path.unlink(missing_ok=True)
			return acquire_live_preview_start_lock(lock_path)
		return False
	else:
		with os.fdopen(fd, 'w', encoding='utf-8') as lock_file:
			lock_file.write(f'{os.getpid()}\n')
		return True


def live_preview_worker_active(root_dir: Path) -> bool:
	pid_path = live_preview_pid_path(root_dir)
	if not pid_path.exists():
		return False
	try:
		pid = int(pid_path.read_text(encoding='utf-8').strip())
	except ValueError:
		return False
	return pid > 0 and is_process_alive(pid)


def stop_live_preview_worker(root_dir: Path, *, timeout_ms: int = 2_000) -> None:
	pid_path = live_preview_pid_path(root_dir)
	if not pid_path.exists():
		return
	try:
		pid = int(pid_path.read_text(encoding='utf-8').strip())
	except ValueError:
		pid = 0

	stop_path = live_preview_stop_path(root_dir)
	stop_path.parent.mkdir(parents=True, exist_ok=True)
	stop_path.write_text('stop\n', encoding='utf-8')

	deadline = time.monotonic() + max(timeout_ms, 0) / 1000.0
	while pid > 0 and time.monotonic() < deadline:
		if not is_process_alive(pid):
			break
		time.sleep(0.05)

	if pid > 0 and is_process_alive(pid):
		try:
			os.killpg(pid, signal.SIGTERM)
		except ProcessLookupError:
			pass
		deadline = time.monotonic() + 1.0
		while time.monotonic() < deadline:
			if not is_process_alive(pid):
				break
			time.sleep(0.05)

	if pid_path.exists():
		pid_path.unlink()
	lock_path = live_preview_lock_path(root_dir)
	if lock_path.exists():
		lock_path.unlink()


def run_live_preview_loop(
	root_dir: Path,
	*,
	fps: float,
	max_frames: int,
	preview_width: int,
	preview_height: int,
) -> dict[str, Any]:
	ensure_root_layout(root_dir)
	return run_live_preview(
		preview_file=preview_file_path(root_dir).resolve(),
		heartbeat_file=live_preview_heartbeat_path(root_dir).resolve(),
		preview_width=preview_width,
		preview_height=preview_height,
		fps=fps,
		max_frames=max_frames,
		warmup_frames=5,
		timeout_ms=10_000,
		idle_timeout_ms=DEFAULT_LIVE_PREVIEW_IDLE_TIMEOUT_MS,
		pipeline='cpu',
		helper_path=None,
		stop_file=live_preview_stop_path(root_dir).resolve(),
	)


def touch_live_preview_heartbeat(root_dir: Path) -> None:
	path = live_preview_heartbeat_path(root_dir)
	path.parent.mkdir(parents=True, exist_ok=True)
	path.write_text(f'{utc_now_iso()}\n', encoding='utf-8')


def build_live_preview_starting_payload(root_dir: Path) -> dict[str, object]:
	frame = build_mock_capture_frame(
		frame_index=0,
		frame_count=PREVIEW_ANIMATION_FRAME_COUNT,
		width=DEFAULT_PREVIEW_WIDTH,
		height=DEFAULT_PREVIEW_HEIGHT,
	)
	preview = build_preview_payload(
		color_rgba=frame.color_rgba,
		depth_meters=frame.depth_meters,
		width=DEFAULT_PREVIEW_WIDTH,
		height=DEFAULT_PREVIEW_HEIGHT,
		frame_index=0,
		frame_timestamp_ms=0.0,
		recording_active=False,
		raw_take_id=None,
		provider_mode='live-kinect-starting',
	)
	atomic_write_json(preview_file_path(root_dir), preview)
	return preview


def reconcile_recording_state(root_dir: Path, state: dict[str, object]) -> dict[str, object]:
	recording = state['recording']
	pid = recording.get('pid')
	if not recording.get('active') or not isinstance(pid, int):
		return state
	take_id = str(recording.get('takeId') or '')
	if take_id and edited_take_path(root_dir, take_id).exists():
		next_state = {
			**state,
			'updatedAt': utc_now_iso(),
			'recording': default_recording_state(),
			'lastCompletedTakeId': take_id,
			'lastError': None,
		}
		atomic_write_json(state_file_path(root_dir), next_state)
		return next_state
	if is_process_alive(pid):
		return state
	if recording.get('stopRequested') or (take_id and stop_flag_path(root_dir, take_id).exists()):
		return state

	next_state = {
		**state,
		'updatedAt': utc_now_iso(),
		'recording': default_recording_state(),
	}
	if not next_state.get('lastCompletedTakeId'):
		next_state['lastError'] = {
			'message': f'Recording worker for take "{recording.get("takeId")}" is no longer running.',
		}
	atomic_write_json(state_file_path(root_dir), next_state)
	return next_state


def load_state(root_dir: Path) -> dict[str, object]:
	ensure_root_layout(root_dir)
	state_path = state_file_path(root_dir)
	if not state_path.exists():
		state = default_state_payload()
		atomic_write_json(state_path, state)
		return state
	return read_json_file(state_path)


def default_state_payload() -> dict[str, object]:
	backend_available, provider_mode = detect_provider_state()
	return {
		'version': CONTROL_STATE_VERSION,
		'backendAvailable': backend_available,
		'providerMode': provider_mode,
		'updatedAt': utc_now_iso(),
		'lastCompletedTakeId': None,
		'lastError': None,
		'recording': default_recording_state(),
	}


def refresh_provider_state(root_dir: Path, state: dict[str, object]) -> dict[str, object]:
	backend_available, provider_mode = detect_provider_state()
	if state.get('backendAvailable') == backend_available and state.get('providerMode') == provider_mode:
		return state
	next_state = {
		**state,
		'backendAvailable': backend_available,
		'providerMode': provider_mode,
		'updatedAt': utc_now_iso(),
	}
	atomic_write_json(state_file_path(root_dir), next_state)
	return next_state


def detect_provider_state() -> tuple[bool, str]:
	helper_probe = probe_native_helper()
	python_binding_available = find_spec('freenect2') is not None
	helper_available = helper_probe.payload is not None
	device_count = read_optional_int(helper_probe.payload, 'device_count') or 0
	if helper_available and device_count > 0:
		return True, 'live-kinect'
	if helper_available or python_binding_available:
		return True, 'live-backend-no-device'
	return False, 'mock-fallback'


def default_recording_state() -> dict[str, object]:
	return {
		'active': False,
		'status': 'idle',
		'takeId': None,
		'pid': None,
		'label': None,
		'startedAt': None,
		'frameCount': 0,
		'elapsedMs': 0.0,
		'fps': None,
		'width': None,
		'height': None,
		'maxFrames': None,
		'stopRequested': False,
		'mockFallback': False,
	}


def build_take_summary(root_dir: Path, take_id: str, edited_take: dict[str, object]) -> dict[str, object]:
	raw_capture = load_raw_capture(root_dir, str(edited_take['rawTakeId']))
	return {
		'takeId': take_id,
		'rawTakeId': edited_take['rawTakeId'],
		'label': edited_take['label'],
		'decision': edited_take['decision'],
		'createdAt': edited_take['createdAt'],
		'updatedAt': edited_take['updatedAt'],
		'trim': edited_take['trim'],
		'frameCount': raw_capture['frameCount'],
		'fps': raw_capture['fps'],
		'startedAt': raw_capture['capture']['metadata']['operator']['recordingStartedAt'],
		'endedAt': raw_capture['capture']['metadata']['operator']['recordingEndedAt'],
		'registration': raw_capture['registration'],
	}


def load_edited_take(root_dir: Path, take_id: str) -> dict[str, object]:
	path = edited_take_path(root_dir, take_id)
	if not path.exists():
		raise FileNotFoundError(f'Edited take "{take_id}" was not found.')
	return read_json_file(path)


def load_raw_capture(root_dir: Path, raw_take_id: str) -> dict[str, object]:
	path = raw_take_path(root_dir, raw_take_id) / 'capture.json'
	if not path.exists():
		raise FileNotFoundError(f'Raw take "{raw_take_id}" was not found.')
	return read_json_file(path)


def write_recording_state_update(
	root_dir: Path,
	*,
	take_id: str,
	label: str,
	started_at: str,
	frame_count: int,
	frame_timestamp_ms: float,
	fps: float,
	width: int,
	height: int,
	max_frames: int,
	provider_mode: str,
	mock_fallback: bool,
) -> None:
	state = load_state(root_dir)
	state['updatedAt'] = utc_now_iso()
	state['providerMode'] = provider_mode
	state['recording'] = {
		'active': True,
		'status': 'recording',
		'takeId': take_id,
		'pid': os.getpid(),
		'label': label,
		'startedAt': started_at,
		'frameCount': frame_count,
		'elapsedMs': frame_timestamp_ms,
		'fps': fps,
		'width': width,
		'height': height,
		'maxFrames': max_frames,
		'stopRequested': stop_flag_path(root_dir, take_id).exists(),
		'mockFallback': mock_fallback,
	}
	atomic_write_json(state_file_path(root_dir), state)


def write_raw_frame_files(
	*,
	frames_dir: Path,
	frame_index: int,
	width: int,
	height: int,
	color_rgba: bytes,
	depth_meters: list[float],
) -> None:
	write_json(
		frames_dir / f'color-{frame_index:04d}.json',
		{
			'width': width,
			'height': height,
			'encoding': RAW_COLOR_ENCODING,
			'data': encode_bytes_base64(color_rgba),
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
			'data': encode_float32_base64(depth_meters),
		},
	)


def build_raw_take_capture_payload(
	*,
	take_id: str,
	label: str,
	width: int,
	height: int,
	fps: float,
	frame_count: int,
	frame_timestamps_ms: list[float],
	started_at: str,
	ended_at: str,
) -> dict[str, object]:
	return {
		'version': 1,
		'fps': fps,
		'frameCount': frame_count,
		'frameTimestampsMs': frame_timestamps_ms,
		'frames': [
			{
				'colorFile': f'frames/color-{frame_index:04d}.json',
				'depthFile': f'frames/depth-{frame_index:04d}.json',
			}
			for frame_index in range(frame_count)
		],
		'clips': [
			{
				'id': 'raw_take_full',
				'startFrame': 0,
				'endFrame': frame_count - 1,
				'mode': 'once',
			}
		],
		'color': {
			'width': width,
			'height': height,
			'encoding': RAW_COLOR_ENCODING,
			'description': 'Registered color aligned to the depth raster grid during capture-control recording.',
		},
		'depth': {
			'width': width,
			'height': height,
			'encoding': RAW_DEPTH_ENCODING,
			'units': 'meters',
			'invalidValueMeters': RAW_DEPTH_INVALID_METERS,
			'description': 'Registered depth in meters aligned to the same raster grid during capture-control recording.',
		},
		'registration': {
			'provider': 'libfreenect2',
			'alignedTo': 'depth-grid',
			'status': 'mock-recorded-raw-take',
			'colorSource': 'kinect-registered-color',
		},
		'capture': {
			'sensor': 'kinect-v2',
			'serial': 'MOCK-KINECT-V2',
			'calibration': {
				'source': 'mock-capture-control-preview',
				'registrationProvider': 'libfreenect2',
				'colorResolution': {'width': 1920, 'height': 1080},
				'depthResolution': {'width': 512, 'height': 424},
			},
			'metadata': {
				'operator': {
					'workflow': 'capture-control',
					'rawTakeId': take_id,
					'labelAtCapture': label,
					'recordingStartedAt': started_at,
					'recordingEndedAt': ended_at,
					'providerMode': 'mock-fallback',
				},
			},
		},
	}


def build_edited_take_payload(
	*,
	take_id: str,
	label: str,
	frame_timestamps_ms: list[float],
	created_at: str,
) -> dict[str, object]:
	frame_count = len(frame_timestamps_ms)
	return {
		'version': EDITED_TAKE_VERSION,
		'editedTakeId': take_id,
		'rawTakeId': take_id,
		'label': label,
		'decision': 'pending',
		'createdAt': created_at,
		'updatedAt': created_at,
		'trim': {
			'inFrame': 0,
			'outFrame': frame_count - 1,
			'inTimestampMs': 0.0,
			'outTimestampMs': frame_timestamps_ms[-1] if frame_timestamps_ms else 0.0,
		},
		'sync': {
			'markers': [],
			'solvedOffsetMs': None,
		},
		'externalCamera': {
			'clipId': None,
			'notes': None,
		},
		'notes': '',
	}


def build_preview_payload(
	*,
	color_rgba: bytes,
	depth_meters: list[float],
	width: int,
	height: int,
	frame_index: int,
	frame_timestamp_ms: float,
	recording_active: bool,
	raw_take_id: str | None,
	provider_mode: str,
) -> dict[str, object]:
	return {
		'version': PREVIEW_VERSION,
		'capturedAt': utc_now_iso(),
		'providerMode': provider_mode,
		'recordingActive': recording_active,
		'rawTakeId': raw_take_id,
		'frameIndex': frame_index,
		'frameTimestampMs': frame_timestamp_ms,
		'color': {
			'width': width,
			'height': height,
			'encoding': RAW_COLOR_ENCODING,
			'data': encode_bytes_base64(color_rgba),
		},
		'depth': {
			'width': width,
			'height': height,
			'encoding': RAW_DEPTH_ENCODING,
			'units': 'meters',
			'invalidValueMeters': RAW_DEPTH_INVALID_METERS,
			'data': encode_float32_base64(depth_meters),
		},
	}


def compute_preview_frame_index() -> int:
	return int(time.time() * DEFAULT_RECORD_FPS) % PREVIEW_ANIMATION_FRAME_COUNT


def allocate_take_id(root_dir: Path) -> str:
	base = datetime.now(UTC).strftime('%Y%m%dT%H%M%SZ')
	candidate = base
	index = 1
	while edited_take_path(root_dir, candidate).exists() or raw_take_path(root_dir, candidate).exists():
		candidate = f'{base}-{index:02d}'
		index += 1
	return candidate


def default_take_label(take_id: str) -> str:
	return f'take-{take_id.lower()}'


def state_file_path(root_dir: Path) -> Path:
	return root_dir / 'control-state.json'


def preview_file_path(root_dir: Path) -> Path:
	return root_dir / 'preview' / 'latest.json'


def live_preview_pid_path(root_dir: Path) -> Path:
	return root_dir / 'preview' / 'live-preview.pid'


def live_preview_stop_path(root_dir: Path) -> Path:
	return root_dir / 'preview' / 'live-preview.stop'


def live_preview_lock_path(root_dir: Path) -> Path:
	return root_dir / 'preview' / 'live-preview.lock'


def live_preview_heartbeat_path(root_dir: Path) -> Path:
	return root_dir / 'preview' / 'live-preview.heartbeat'


def raw_take_path(root_dir: Path, raw_take_id: str) -> Path:
	return root_dir / 'raw-takes' / raw_take_id


def edited_take_path(root_dir: Path, take_id: str) -> Path:
	return root_dir / 'edited-takes' / f'{take_id}.json'


def stop_flag_path(root_dir: Path, take_id: str) -> Path:
	return root_dir / 'commands' / f'{take_id}.stop'


def log_file_path(root_dir: Path, take_id: str) -> Path:
	return root_dir / 'logs' / f'record-{take_id}.log'


def encode_bytes_base64(value: bytes) -> str:
	import base64

	return base64.b64encode(value).decode('ascii')


def read_json_file(path: Path) -> dict[str, Any]:
	return json.loads(path.read_text(encoding='utf-8'))


def atomic_write_json(path: Path, payload: object) -> None:
	path.parent.mkdir(parents=True, exist_ok=True)
	tmp_path = path.with_suffix(f'{path.suffix}.tmp')
	tmp_path.write_text(json.dumps(payload, indent=2) + '\n', encoding='utf-8')
	tmp_path.replace(path)


def is_process_alive(pid: int) -> bool:
	stat_path = Path('/proc') / str(pid) / 'stat'
	if stat_path.exists():
		try:
			stat = stat_path.read_text(encoding='utf-8')
		except OSError:
			stat = ''
		if ') Z' in stat:
			return False
	try:
		os.kill(pid, 0)
	except PermissionError:
		return True
	except OSError:
		return False
	return True


def utc_now_iso() -> str:
	return datetime.now(UTC).isoformat()
