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
				registration: { provider: string; status: string };
				frames: Array<{ colorFile: string; depthFile: string }>;
			};
			const manifest = JSON.parse(await fs.readFile(path.join(exportDir, 'manifest.json'), 'utf-8')) as {
				frameCount: number;
				fps: number;
				frames: Array<{ colorFile: string; depthFile: string }>;
				depth: { semantics: string };
				processing: {
					registration: { provider: string; status: string };
					frameDepthRangesMeters: Array<{ frameIndex: number; nearMeters: number; farMeters: number }>;
				};
			};

			expect(capturePayload.registration.provider).toBe('libfreenect2');
			expect(capturePayload.registration.status).toBe('mock-captured-bundle');
			expect(capturePayload.frames).toHaveLength(6);

			expect(manifest.frameCount).toBe(6);
			expect(manifest.fps).toBe(10);
			expect(manifest.frames).toHaveLength(6);
			expect(manifest.depth.semantics).toBe('0-far-1-near');
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
});
