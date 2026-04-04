import { describe, expect, it, vi } from 'vitest';
import { FrameSequenceLoader } from '../../src/lib/engine/animation/FrameSequenceLoader.js';
import type { AnimationClip, PointSequenceManifest } from '../../src/lib/engine/animation/types.js';
import { createSampleSet } from '../../src/lib/engine/core/SampleSet.js';

function encode(text: string): Uint8Array {
	return new TextEncoder().encode(text);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
	return new Uint8Array(bytes).buffer;
}

function makeAsciiPly(points: Array<{ x: number; y: number; z: number; r?: number; g?: number; b?: number }>): ArrayBuffer {
	const hasColor = points.some((point) => point.r !== undefined || point.g !== undefined || point.b !== undefined);

	const headerLines = [
		'ply',
		'format ascii 1.0',
		`element vertex ${points.length}`,
		'property float x',
		'property float y',
		'property float z',
	];

	if (hasColor) {
		headerLines.push(
			'property uchar red',
			'property uchar green',
			'property uchar blue',
		);
	}

	headerLines.push('end_header');

	const bodyLines = points.map((point) =>
		hasColor
			? `${point.x} ${point.y} ${point.z} ${point.r ?? 255} ${point.g ?? 255} ${point.b ?? 255}`
			: `${point.x} ${point.y} ${point.z}`,
	);

	return toArrayBuffer(encode([...headerLines, ...bodyLines, ''].join('\n')));
}

function makeManifest(frameCount: number, clips?: readonly AnimationClip[]): PointSequenceManifest {
	return {
		version: 1,
		fps: 5,
		frameCount,
		frameTimestampsMs: Array.from({ length: frameCount }, (_, index) => index * 200),
		clips,
		coordinateSystem: {
			upAxis: 'y',
			forwardAxis: '-z',
			handedness: 'right',
		},
		units: 'meters',
		processing: {
			registration: 'libfreenect2',
			backgroundFilter: 'depth-threshold',
		},
		capture: {
			sensor: 'kinect-v2',
			serial: 'TEST123',
			calibration: {
				source: 'snapshot',
			},
		},
	};
}

describe('FrameSequenceLoader', () => {
	it('builds a FrameSequence from raw frame buffers and manifest clips', async () => {
		const clips: AnimationClip[] = [
			{ id: 'wave', startFrame: 0, endFrame: 1, mode: 'loop' },
		];
		const loader = new FrameSequenceLoader();
		const sequence = await loader.load({
			manifest: makeManifest(2, clips),
			frameBuffers: [
				makeAsciiPly([
					{ x: 1, y: 2, z: 3, r: 255, g: 0, b: 0 },
					{ x: 4, y: 5, z: 6, r: 0, g: 255, b: 0 },
				]),
				makeAsciiPly([
					{ x: 7, y: 8, z: 9, r: 0, g: 0, b: 255 },
				]),
			],
			initialClipId: 'wave',
		});

		expect(sequence.getCurrentClip().id).toBe('wave');
		expect(sequence.getPlaybackSamples().count).toBe(2);
		expect(Array.from(sequence.getPlaybackSamples().positions.slice(0, 6))).toEqual([1, 2, 3, 4, 5, 6]);
		expect(sequence.tick(200)).toMatchObject({
			frameIndex: 1,
			copiedFrame: true,
			looped: false,
		});
		expect(sequence.getPlaybackSamples().count).toBe(1);
		expect(Array.from(sequence.getPlaybackSamples().positions.slice(0, 3))).toEqual([7, 8, 9]);
	});

	it('builds frames through an injected callback without any URL policy in the engine', async () => {
		const buffers = [
			makeAsciiPly([{ x: 0, y: 0, z: 0 }]),
			makeAsciiPly([{ x: 10, y: 0, z: 0 }]),
			makeAsciiPly([{ x: 20, y: 0, z: 0 }]),
		];
		const loadFrame = vi.fn(async (frameIndex: number) => buffers[frameIndex]);

		const sequence = await new FrameSequenceLoader().load({
			manifest: makeManifest(3),
			loadFrame,
		});

		expect(loadFrame).toHaveBeenCalledTimes(3);
		expect(loadFrame.mock.calls.map(([frameIndex]) => frameIndex)).toEqual([0, 1, 2]);
		expect(sequence.tick(200)).toMatchObject({
			frameIndex: 1,
			copiedFrame: true,
		});
		expect(Array.from(sequence.getPlaybackSamples().positions.slice(0, 3))).toEqual([10, 0, 0]);
	});

	it('builds a sequence from app-prepared SampleSet frames', async () => {
		const firstFrame = createSampleSet({ count: 2, includeIds: true });
		firstFrame.positions.set([0, 0, 1, 1, 0, 1]);
		firstFrame.colors.set([1, 0, 0, 0, 1, 0]);
		firstFrame.radii.set([1, 1.2]);
		firstFrame.opacities.set([1, 0.8]);
		firstFrame.ids!.set([10, 11]);

		const secondFrame = createSampleSet({ count: 1, includeIds: true });
		secondFrame.positions.set([2, 0, 1]);
		secondFrame.colors.set([0, 0, 1]);
		secondFrame.radii.set([0.9]);
		secondFrame.opacities.set([1]);
		secondFrame.ids!.set([21]);

		const sequence = await new FrameSequenceLoader().load({
			manifest: makeManifest(2),
			frames: [firstFrame, secondFrame],
		});

		expect(sequence.getPlaybackSamples().count).toBe(2);
		expect(Array.from(sequence.getPlaybackSamples().positions.slice(0, 6))).toEqual([0, 0, 1, 1, 0, 1]);
		expect(sequence.tick(200)).toMatchObject({ frameIndex: 1, copiedFrame: true });
		expect(sequence.getPlaybackSamples().count).toBe(1);
		expect(Array.from(sequence.getPlaybackSamples().positions.slice(0, 3))).toEqual([2, 0, 1]);
	});

	it('rejects manifest timestamp/count mismatches', async () => {
		const manifest = {
			...makeManifest(2),
			frameTimestampsMs: [0],
		};

		await expect(
			new FrameSequenceLoader().load({
				manifest,
				frameBuffers: [makeAsciiPly([{ x: 0, y: 0, z: 0 }]), makeAsciiPly([{ x: 1, y: 1, z: 1 }])],
			}),
		).rejects.toThrow(/frameTimestampsMs length 1 does not match frameCount 2/i);
	});

	it('rejects invalid manifest clips before building the sequence', async () => {
		const manifest = makeManifest(2, [
			{ id: 'bad', startFrame: 0, endFrame: 2, mode: 'loop' },
		]);

		await expect(
			new FrameSequenceLoader().load({
				manifest,
				frameBuffers: [makeAsciiPly([{ x: 0, y: 0, z: 0 }]), makeAsciiPly([{ x: 1, y: 1, z: 1 }])],
			}),
		).rejects.toThrow(/clip "bad" has invalid bounds 0-2 for 2 frames/i);
	});

	it('requires exactly one frame source strategy', async () => {
		const manifest = makeManifest(1);
		const buffer = makeAsciiPly([{ x: 0, y: 0, z: 0 }]);
		const frame = createSampleSet({ count: 1 });

		await expect(
			new FrameSequenceLoader().load({
				manifest,
				frames: [frame],
				frameBuffers: [buffer],
			}),
		).rejects.toThrow(/exactly one frame source/i);

		await expect(
			new FrameSequenceLoader().load({
				manifest,
			}),
		).rejects.toThrow(/exactly one frame source/i);
	});
});
