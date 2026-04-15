import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type {
	CaptureControlStatus,
	CaptureDecision,
	CapturePreviewFrame,
	CaptureTakeDetail,
	CaptureTakeFrame,
	CaptureTakeListResponse,
	CaptureEditedTake,
} from '$lib/capture/types.js';

const execFileAsync = promisify(execFile);

export const CAPTURE_CONTROL_ROOT_DIR = path.resolve(process.cwd(), 'tmp', 'kinect-capture');
const CAPTURE_COMMAND_MAX_BUFFER_BYTES = 16 * 1024 * 1024;

interface RecordStartOptions {
	label?: string;
	width?: number;
	height?: number;
	fps?: number;
	maxFrames?: number;
}

export async function getCaptureControlStatus(): Promise<CaptureControlStatus> {
	return runCaptureJsonCommand<CaptureControlStatus>(['status']);
}

export async function getCapturePreview(
	options: { width?: number; height?: number } = {},
): Promise<CapturePreviewFrame> {
	const args = ['preview'];
	if (typeof options.width === 'number') {
		args.push('--width', `${options.width}`);
	}
	if (typeof options.height === 'number') {
		args.push('--height', `${options.height}`);
	}
	return runCaptureJsonCommand<CapturePreviewFrame>(args);
}

export async function startCaptureRecording(options: RecordStartOptions = {}): Promise<CaptureControlStatus> {
	const args = ['record-start'];
	if (options.label) {
		args.push('--label', options.label);
	}
	if (typeof options.width === 'number') {
		args.push('--width', `${options.width}`);
	}
	if (typeof options.height === 'number') {
		args.push('--height', `${options.height}`);
	}
	if (typeof options.fps === 'number') {
		args.push('--fps', `${options.fps}`);
	}
	if (typeof options.maxFrames === 'number') {
		args.push('--max-frames', `${options.maxFrames}`);
	}
	return runCaptureJsonCommand<CaptureControlStatus>(args);
}

export async function stopCaptureRecording(timeoutMs = 5_000): Promise<CaptureControlStatus> {
	return runCaptureJsonCommand<CaptureControlStatus>(['record-stop', '--timeout-ms', `${timeoutMs}`]);
}

export async function listCaptureTakes(): Promise<CaptureTakeListResponse> {
	return runCaptureJsonCommand<CaptureTakeListResponse>(['list-takes']);
}

export async function readCaptureTake(takeId: string): Promise<CaptureTakeDetail> {
	return runCaptureJsonCommand<CaptureTakeDetail>(['show-take', '--take-id', takeId]);
}

export async function readCaptureTakeFrame(takeId: string, frameIndex: number): Promise<CaptureTakeFrame> {
	return runCaptureJsonCommand<CaptureTakeFrame>(['show-frame', '--take-id', takeId, '--frame-index', `${frameIndex}`]);
}

export async function renameCaptureTake(takeId: string, label: string): Promise<CaptureEditedTake> {
	return runCaptureJsonCommand<CaptureEditedTake>(['rename-take', '--take-id', takeId, '--label', label]);
}

export async function setCaptureTakeDecision(
	takeId: string,
	decision: CaptureDecision,
): Promise<CaptureEditedTake> {
	return runCaptureJsonCommand<CaptureEditedTake>(['set-decision', '--take-id', takeId, '--decision', decision]);
}

export async function trimCaptureTake(
	takeId: string,
	trimInFrame: number,
	trimOutFrame: number,
): Promise<CaptureEditedTake> {
	return runCaptureJsonCommand<CaptureEditedTake>([
		'trim-take',
		'--take-id',
		takeId,
		'--in-frame',
		`${trimInFrame}`,
		'--out-frame',
		`${trimOutFrame}`,
	]);
}

async function runCaptureJsonCommand<T>(commandArgs: string[]): Promise<T> {
	const args = ['-m', 'python.kinect_capture.capture', ...commandArgs, '--root', CAPTURE_CONTROL_ROOT_DIR];
	try {
		const { stdout } = await execFileAsync('python3', args, {
			cwd: process.cwd(),
			maxBuffer: CAPTURE_COMMAND_MAX_BUFFER_BYTES,
		});
		return JSON.parse(stdout) as T;
	} catch (error) {
		if (typeof error === 'object' && error !== null && 'stderr' in error) {
			const stderr = `${error.stderr ?? ''}`.trim();
			throw new Error(stderr || 'Capture-control command failed.');
		}
		throw error;
	}
}
