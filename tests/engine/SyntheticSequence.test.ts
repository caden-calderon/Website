import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { FrameSequenceLoader } from '../../src/lib/engine/animation/FrameSequenceLoader.js';
import { writeSyntheticPointSequence } from '../../scripts/generate-test-ply.mjs';
import type { PointSequenceManifest } from '../../src/lib/engine/animation/types.js';

const tempDirs: string[] = [];

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
	return new Uint8Array(bytes).buffer;
}

afterEach(async () => {
	await Promise.all(
		tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
	);
});

describe('synthetic point-sequence generator', () => {
	it('writes a manifest and frame files that load through FrameSequenceLoader', async () => {
		const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'chromatic-seq-'));
		tempDirs.push(outputDir);

		const result = await writeSyntheticPointSequence(outputDir, {
			frameCount: 4,
			pointCount: 160,
			fps: 8,
			radius: 1.1,
			pulseAmplitude: 0.2,
		});

		const manifest = JSON.parse(
			await fs.readFile(result.manifestPath, 'utf8'),
		) as PointSequenceManifest;

		expect(manifest.frameCount).toBe(4);
		expect(manifest.frameFiles).toEqual([
			'frame-0000.ply',
			'frame-0001.ply',
			'frame-0002.ply',
			'frame-0003.ply',
		]);
		expect(manifest.clips?.map((clip) => clip.id)).toEqual([
			'breathing_idle',
			'arm_sweep',
			'turntable_pose',
		]);
		const framePointCountRange = manifest.processing.framePointCountRange as number[] | undefined;
		expect(framePointCountRange).toBeDefined();
		expect(framePointCountRange?.[0]).toBeLessThan(framePointCountRange?.[1] ?? 0);

		const sequence = await new FrameSequenceLoader().load({
			manifest,
			loadFrame: async (frameIndex) => {
				const bytes = await fs.readFile(path.join(outputDir, manifest.frameFiles![frameIndex]));
				return toArrayBuffer(bytes);
			},
			initialClipId: 'breathing_idle',
		});

		expect(sequence.getPlaybackSamples().count).toBeGreaterThan(0);
		expect(sequence.getCurrentClip().id).toBe('breathing_idle');

		const before = Array.from(sequence.getPlaybackSamples().positions.slice(0, 12));
		const tickResult = sequence.tick(125);
		expect(tickResult.frameIndex).toBe(1);
		expect(tickResult.copiedFrame).toBe(true);
		expect(Array.from(sequence.getPlaybackSamples().positions.slice(0, 12))).not.toEqual(before);
	});
});
