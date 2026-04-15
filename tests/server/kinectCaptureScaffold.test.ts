import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

describe('kinect capture scaffold', () => {
	it('exports a mock registered capture bundle into the browser RGBD manifest format', async () => {
		const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'chromatic-kinect-scaffold-'));
		const bundleDir = path.join(tempRoot, 'bundle');
		const exportDir = path.join(tempRoot, 'rgbd-export');

		try {
			await execFileAsync(
				'python3',
				[
					'-m',
					'python.kinect_capture.capture',
					'mock-bundle',
					'--output',
					bundleDir,
					'--frames',
					'6',
					'--width',
					'64',
					'--height',
					'48',
					'--fps',
					'10',
				],
				{
					cwd: process.cwd(),
				},
			);

			await execFileAsync(
				'python3',
				[
					'-m',
					'python.kinect_capture.process',
					'export-rgbd',
					'--input-dir',
					bundleDir,
					'--output',
					exportDir,
				],
				{
					cwd: process.cwd(),
				},
			);

			const capturePayload = JSON.parse(await fs.readFile(path.join(bundleDir, 'capture.json'), 'utf-8')) as {
				registration: { provider: string; status: string; colorSource: string };
				frames: Array<{ colorFile: string; depthFile: string }>;
			};
			const manifest = JSON.parse(await fs.readFile(path.join(exportDir, 'manifest.json'), 'utf-8')) as {
				frameCount: number;
				fps: number;
				frames: Array<{ colorFile: string; depthFile: string }>;
				depth: { semantics: string };
				processing: {
					colorSource: string;
					registration: { provider: string; status: string };
					frameDepthRangesMeters: Array<{ frameIndex: number; nearMeters: number; farMeters: number }>;
				};
			};

			expect(capturePayload.registration.provider).toBe('libfreenect2');
			expect(capturePayload.registration.status).toBe('mock-captured-bundle');
			expect(capturePayload.registration.colorSource).toBe('kinect-registered-color');
			expect(capturePayload.frames).toHaveLength(6);

			expect(manifest.frameCount).toBe(6);
			expect(manifest.fps).toBe(10);
			expect(manifest.frames).toHaveLength(6);
			expect(manifest.depth.semantics).toBe('0-far-1-near');
			expect(manifest.processing.colorSource).toBe('kinect-registered-color');
			expect(manifest.processing.registration.provider).toBe('libfreenect2');
			expect(manifest.processing.registration.status).toBe('mock-captured-bundle');
			expect(manifest.processing.frameDepthRangesMeters).toHaveLength(6);
			expect(manifest.processing.frameDepthRangesMeters[0]?.nearMeters).toBeGreaterThan(0);
			expect(manifest.processing.frameDepthRangesMeters[0]?.farMeters).toBeGreaterThan(
				manifest.processing.frameDepthRangesMeters[0]?.nearMeters ?? 0,
			);
		} finally {
			await fs.rm(tempRoot, { recursive: true, force: true });
		}
	});

	it('preserves hybrid external-camera alignment metadata through export', async () => {
		const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'chromatic-kinect-hybrid-'));
		const bundleDir = path.join(tempRoot, 'bundle');
		const exportDir = path.join(tempRoot, 'rgbd-export');

		try {
			await execFileAsync(
				'python3',
				[
					'-m',
					'python.kinect_capture.capture',
					'mock-bundle',
					'--output',
					bundleDir,
					'--frames',
					'4',
					'--width',
					'64',
					'--height',
					'48',
					'--fps',
					'12',
					'--color-source',
					'external-camera-rgb',
				],
				{
					cwd: process.cwd(),
				},
			);

			await execFileAsync(
				'python3',
				[
					'-m',
					'python.kinect_capture.process',
					'export-rgbd',
					'--input-dir',
					bundleDir,
					'--output',
					exportDir,
				],
				{
					cwd: process.cwd(),
				},
			);

			const capturePayload = JSON.parse(await fs.readFile(path.join(bundleDir, 'capture.json'), 'utf-8')) as {
				registration: { colorSource: string; status: string };
				capture: {
					calibration: {
						externalColorCamera: {
							cameraId: string;
							extrinsicsToDepthCamera: { translationMeters: number[] };
						};
					};
					metadata: {
						hybrid: {
							captureMode: string;
							sync: { offsetMs: number };
							alignment: { targetGrid: string; coverageRatio: number };
						};
					};
				};
			};
			const manifest = JSON.parse(await fs.readFile(path.join(exportDir, 'manifest.json'), 'utf-8')) as {
				processing: {
					colorSource: string;
					registration: { status: string };
				};
				capture: {
					calibration: {
						externalColorCamera: {
							cameraId: string;
						};
					};
					metadata: {
						hybrid: {
							captureMode: string;
							alignment: { targetGrid: string };
						};
					};
				};
			};

			expect(capturePayload.registration.colorSource).toBe('external-camera-rgb');
			expect(capturePayload.registration.status).toBe('mock-hybrid-aligned-bundle');
			expect(capturePayload.capture.calibration.externalColorCamera.cameraId).toBe('mock-cinema-camera');
			expect(capturePayload.capture.calibration.externalColorCamera.extrinsicsToDepthCamera.translationMeters).toHaveLength(3);
			expect(capturePayload.capture.metadata.hybrid.captureMode).toBe('external-camera-rgb-plus-kinect-depth');
			expect(capturePayload.capture.metadata.hybrid.sync.offsetMs).toBeLessThan(0);
			expect(capturePayload.capture.metadata.hybrid.alignment.targetGrid).toBe('kinect-depth');
			expect(capturePayload.capture.metadata.hybrid.alignment.coverageRatio).toBeGreaterThan(0.5);

			expect(manifest.processing.colorSource).toBe('external-camera-rgb');
			expect(manifest.processing.registration.status).toBe('mock-hybrid-aligned-bundle');
			expect(manifest.capture.calibration.externalColorCamera.cameraId).toBe('mock-cinema-camera');
			expect(manifest.capture.metadata.hybrid.captureMode).toBe('external-camera-rgb-plus-kinect-depth');
			expect(manifest.capture.metadata.hybrid.alignment.targetGrid).toBe('kinect-depth');
		} finally {
			await fs.rm(tempRoot, { recursive: true, force: true });
		}
	});

	it('records an immutable raw take and edits metadata without mutating raw frames', async () => {
		const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'chromatic-capture-control-'));

		try {
			await execFileAsync(
				'python3',
				[
					'-m',
					'python.kinect_capture.capture',
					'record-run',
					'--root',
					tempRoot,
					'--take-id',
					'review-smoke',
					'--label',
					'review-smoke',
					'--width',
					'32',
					'--height',
					'24',
					'--fps',
					'12',
					'--max-frames',
					'4',
					'--provider',
					'mock',
				],
				{
					cwd: process.cwd(),
				},
			);

			const takeList = await execCaptureJson<{ takes: Array<{ takeId: string; trim: { outTimestampMs: number } }> }>(
				tempRoot,
				['list-takes'],
			);
			expect(takeList.takes).toHaveLength(1);
			expect(takeList.takes[0]?.takeId).toBe('review-smoke');
			expect(takeList.takes[0]?.trim.outTimestampMs).toBeGreaterThan(0);

			await execCaptureJson(tempRoot, ['rename-take', '--take-id', 'review-smoke', '--label', 'kept-review']);
			await execCaptureJson(tempRoot, ['set-decision', '--take-id', 'review-smoke', '--decision', 'keep']);
			await execCaptureJson(tempRoot, ['trim-take', '--take-id', 'review-smoke', '--in-frame', '1', '--out-frame', '3']);

			const takeDetail = await execCaptureJson<{
				editedTake: {
					label: string;
					decision: string;
					trim: { inFrame: number; outFrame: number; outTimestampMs: number };
				};
				rawTake: {
					capture: {
						frameCount: number;
						frameTimestampsMs: number[];
					};
				};
			}>(tempRoot, ['show-take', '--take-id', 'review-smoke']);

			expect(takeDetail.editedTake.label).toBe('kept-review');
			expect(takeDetail.editedTake.decision).toBe('keep');
			expect(takeDetail.editedTake.trim.inFrame).toBe(1);
			expect(takeDetail.editedTake.trim.outFrame).toBe(3);
			expect(takeDetail.editedTake.trim.outTimestampMs).toBe(takeDetail.rawTake.capture.frameTimestampsMs[3]);
			expect(takeDetail.rawTake.capture.frameCount).toBe(4);

			const framePayload = await execCaptureJson<{
				frameIndex: number;
				frameTimestampMs: number;
				color: { width: number; height: number; data: string };
				depth: { width: number; height: number; data: string };
			}>(tempRoot, ['show-frame', '--take-id', 'review-smoke', '--frame-index', '2']);

			expect(framePayload.frameIndex).toBe(2);
			expect(framePayload.frameTimestampMs).toBe(takeDetail.rawTake.capture.frameTimestampsMs[2]);
			expect(framePayload.color.width).toBe(32);
			expect(framePayload.depth.height).toBe(24);
			expect(framePayload.color.data.length).toBeGreaterThan(0);
			expect(framePayload.depth.data.length).toBeGreaterThan(0);
		} finally {
			await fs.rm(tempRoot, { recursive: true, force: true });
		}
	});

	it('supports explicit record-start and record-stop control for operator workflow', async () => {
		const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'chromatic-capture-start-stop-'));

		try {
			const startStatus = await execCaptureJson<{
				recording: { active: boolean; takeId: string | null; label: string | null };
			}>(tempRoot, [
				'record-start',
				'--label',
				'start-stop-smoke',
				'--width',
				'32',
				'--height',
				'24',
				'--fps',
				'18',
				'--max-frames',
				'60',
				'--provider',
				'mock',
			]);
			expect(startStatus.recording.active).toBe(true);
			expect(startStatus.recording.label).toBe('start-stop-smoke');

			const activeStatus = await waitForCaptureStatus<{
				recording: { active: boolean; takeId: string | null };
				lastCompletedTakeId: string | null;
			}>(tempRoot, (status) => status.recording.active, 3_000);
			expect(activeStatus.recording.takeId).toBeTruthy();

			const preview = await execCaptureJson<{
				recordingActive: boolean;
				rawTakeId: string | null;
				color: { width: number; height: number };
			}>(tempRoot, ['preview', '--width', '32', '--height', '24']);
			expect(preview.recordingActive).toBe(true);
			expect(preview.rawTakeId).toBe(activeStatus.recording.takeId);
			expect(preview.color.width).toBe(32);

			const stopped = await execCaptureJson<{
				recording: { active: boolean };
				lastCompletedTakeId: string | null;
			}>(tempRoot, ['record-stop', '--timeout-ms', '6000']);
			expect(stopped.recording.active).toBe(false);
			expect(stopped.lastCompletedTakeId).toBeTruthy();

			const finalStatus = await waitForCaptureStatus<{
				recording: { active: boolean };
				lastCompletedTakeId: string | null;
			}>(tempRoot, (status) => !status.recording.active && Boolean(status.lastCompletedTakeId), 3_000);
			expect(finalStatus.lastCompletedTakeId).toBeTruthy();

			const takeList = await execCaptureJson<{ takes: Array<{ takeId: string; frameCount: number }> }>(
				tempRoot,
				['list-takes'],
			);
			expect(takeList.takes).toHaveLength(1);
			expect(takeList.takes[0]?.takeId).toBe(finalStatus.lastCompletedTakeId);
			expect(takeList.takes[0]?.frameCount).toBeGreaterThan(0);
		} finally {
			await fs.rm(tempRoot, { recursive: true, force: true });
		}
	});
});

async function execCaptureJson<T>(root: string, args: string[]): Promise<T> {
	const { stdout } = await execFileAsync(
		'python3',
		['-m', 'python.kinect_capture.capture', ...args, '--root', root],
		{
			cwd: process.cwd(),
		},
	);
	return JSON.parse(stdout) as T;
}

async function waitForCaptureStatus<T extends { recording: { active: boolean }; lastCompletedTakeId?: string | null }>(
	root: string,
	predicate: (status: T) => boolean,
	timeoutMs: number,
): Promise<T> {
	const deadline = Date.now() + timeoutMs;
	for (;;) {
		const status = await execCaptureJson<T>(root, ['status']);
		if (predicate(status)) {
			return status;
		}
		if (Date.now() >= deadline) {
			throw new Error('Timed out waiting for capture status condition.');
		}
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
}
