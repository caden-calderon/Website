import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

describe('video depth npz converter', () => {
	it('converts a video plus baked depth npz into the RGBD manifest layout', async () => {
		const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'chromatic-video-depth-npz-'));
		const videoPath = path.join(tempRoot, 'input.mp4');
		const depthPath = path.join(tempRoot, 'input_depths.npz');
		const outputDir = path.join(tempRoot, 'rgbd-export');

		try {
			await execFileAsync(
				'ffmpeg',
				[
					'-y',
					'-v',
					'error',
					'-f',
					'lavfi',
					'-i',
					'testsrc2=size=16x12:rate=4:duration=2',
					'-pix_fmt',
					'yuv420p',
					videoPath,
				],
				{ cwd: process.cwd() },
			);

			await execFileAsync(
				'python3',
				[
					'-c',
					[
						'import sys',
						'import numpy as np',
						'path = sys.argv[1]',
						'frames = np.zeros((8, 12, 16), dtype=np.float32)',
						'for frame_index in range(frames.shape[0]):',
						'    y = np.linspace(0.0, 0.3, frames.shape[1], dtype=np.float32)[:, None]',
						'    x = np.linspace(0.0, 0.8, frames.shape[2], dtype=np.float32)[None, :]',
						'    frames[frame_index] = 1.0 + frame_index * 0.25 + x + y',
						'np.savez(path, depths=frames)',
					].join('\n'),
					depthPath,
				],
				{ cwd: process.cwd() },
			);

			await execFileAsync(
				'python3',
				[
					'scripts/convert-video-depth-npz-to-rgbd-sequence.py',
					'--video',
					videoPath,
					'--depths',
					depthPath,
					'--output',
					outputDir,
					'--target-fps',
					'2',
					'--max-frame-count',
					'10',
					'--max-edge',
					'8',
					'--clip-id',
					'test_clip',
				],
				{ cwd: process.cwd() },
			);

			const manifest = JSON.parse(await fs.readFile(path.join(outputDir, 'manifest.json'), 'utf-8')) as {
				frameCount: number;
				fps: number;
				frameTimestampsMs: number[];
				frames: Array<{ colorFile: string; depthFile: string }>;
				raster: { width: number; height: number; colorEncoding: string };
				depth: { width: number; height: number; encoding: string; semantics: string };
				processing: {
					videoSampling: { selectedSourceFrameIndices: number[] };
					frameDepthRangesMeters: Array<{ nearMeters: number; farMeters: number }>;
				};
				capture: { metadata: { depthFrameCount: number } };
			};

			expect(manifest.frameCount).toBe(4);
			expect(manifest.fps).toBeCloseTo(2, 6);
			expect(manifest.frameTimestampsMs).toEqual([0, 500, 1000, 1500]);
			expect(manifest.frames).toHaveLength(4);
			expect(manifest.raster.width).toBe(8);
			expect(manifest.raster.height).toBe(6);
			expect(manifest.raster.colorEncoding).toBe('rgba8-json-base64');
			expect(manifest.depth.width).toBe(8);
			expect(manifest.depth.height).toBe(6);
			expect(manifest.depth.encoding).toBe('float32-json-base64');
			expect(manifest.depth.semantics).toBe('0-far-1-near');
			expect(manifest.processing.videoSampling.selectedSourceFrameIndices).toEqual([0, 2, 4, 6]);
			expect(manifest.processing.frameDepthRangesMeters).toHaveLength(4);
			expect(manifest.processing.frameDepthRangesMeters[0]?.nearMeters).toBeLessThan(
				manifest.processing.frameDepthRangesMeters[0]?.farMeters ?? 0,
			);
			expect(manifest.capture.metadata.depthFrameCount).toBe(8);

			const colorPayload = JSON.parse(
				await fs.readFile(path.join(outputDir, manifest.frames[0]!.colorFile), 'utf-8'),
			) as { width: number; height: number; encoding: string; data: string };
			const depthPayload = JSON.parse(
				await fs.readFile(path.join(outputDir, manifest.frames[0]!.depthFile), 'utf-8'),
			) as { width: number; height: number; encoding: string; semantics: string; data: string };

			expect(colorPayload.width).toBe(8);
			expect(colorPayload.height).toBe(6);
			expect(colorPayload.encoding).toBe('rgba8-json-base64');
			expect(Buffer.from(colorPayload.data, 'base64')).toHaveLength(8 * 6 * 4);

			expect(depthPayload.width).toBe(8);
			expect(depthPayload.height).toBe(6);
			expect(depthPayload.encoding).toBe('float32-json-base64');
			expect(depthPayload.semantics).toBe('0-far-1-near');
			const decodedDepth = new Float32Array(
				Buffer.from(depthPayload.data, 'base64').buffer,
				Buffer.from(depthPayload.data, 'base64').byteOffset,
				Buffer.from(depthPayload.data, 'base64').byteLength / 4,
			);
			expect(decodedDepth).toHaveLength(8 * 6);
			expect(Array.from(decodedDepth).every((value) => value >= 0 && value <= 1)).toBe(true);
		} finally {
			await fs.rm(tempRoot, { recursive: true, force: true });
		}
	});
});
