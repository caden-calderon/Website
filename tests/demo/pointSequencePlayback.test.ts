import { describe, expect, it } from 'vitest';
import type { DemoPointSequencePlaybackSource } from '../../src/lib/demo/pointSequenceSources.js';
import {
	applySequenceColorGrade,
	computePreparedPointSequenceBounds,
	downsampleSampleSet,
	loadPreparedPointSequence,
	resolveSequenceTransform,
} from '../../src/lib/demo/pointSequencePlayback.js';
import type { PointSequenceManifest } from '../../src/lib/engine/animation/types.js';
import { createSampleSet } from '../../src/lib/engine/core/SampleSet.js';

function encode(text: string): Uint8Array {
	return new TextEncoder().encode(text);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
	return new Uint8Array(bytes).buffer;
}

function makeAsciiPly(points: Array<{ x: number; y: number; z: number; r?: number; g?: number; b?: number }>): ArrayBuffer {
	const headerLines = [
		'ply',
		'format ascii 1.0',
		`element vertex ${points.length}`,
		'property float x',
		'property float y',
		'property float z',
		'property uchar red',
		'property uchar green',
		'property uchar blue',
		'end_header',
	];
	const bodyLines = points.map((point) => `${point.x} ${point.y} ${point.z} ${point.r ?? 255} ${point.g ?? 255} ${point.b ?? 255}`);
	return toArrayBuffer(encode([...headerLines, ...bodyLines, ''].join('\n')));
}

function makeManifest(frameCount: number): PointSequenceManifest {
	return {
		version: 1,
		fps: 10,
		frameCount,
		frameTimestampsMs: Array.from({ length: frameCount }, (_, index) => index * 100),
		frameFiles: Array.from({ length: frameCount }, (_, index) => `frame-${index.toString().padStart(4, '0')}.ply`),
		clips: [{ id: 'full_clip', startFrame: 0, endFrame: frameCount - 1, mode: 'loop' }],
		coordinateSystem: {
			upAxis: 'y',
			forwardAxis: 'z',
			handedness: 'right',
		},
		units: 'meters',
		processing: {
			dataset: 'test',
		},
	};
}

describe('pointSequencePlayback', () => {
	it('downsamples the active prefix while preserving optional attributes', () => {
		const source = createSampleSet({ count: 5, includeIds: true, includeNormals: true, includeUv: true });
		for (let index = 0; index < 5; index++) {
			const i3 = index * 3;
			const i2 = index * 2;
			source.positions.set([index, index + 0.5, index + 1], i3);
			source.colors.set([index / 10, 0.5, 1], i3);
			source.radii[index] = index + 1;
			source.opacities[index] = 1 - index * 0.1;
			source.ids![index] = 100 + index;
			source.normals!.set([index + 2, index + 3, index + 4], i3);
			source.uv!.set([index / 10, index / 20], i2);
		}

		const downsampled = downsampleSampleSet(source, 3);

		expect(downsampled.count).toBe(3);
		expect(Array.from(downsampled.positions)).toEqual([0, 0.5, 1, 1, 1.5, 2, 3, 3.5, 4]);
		expect(Array.from(downsampled.ids ?? [])).toEqual([100, 101, 103]);
		expect(Array.from(downsampled.normals ?? [])).toEqual([2, 3, 4, 3, 4, 5, 5, 6, 7]);
		expect(Array.from(downsampled.uv ?? []).map((value) => Number(value.toFixed(6)))).toEqual([0, 0, 0.1, 0.05, 0.3, 0.15]);
	});

	it('loads a prepared point sequence with eager instrumentation and bounds', async () => {
		const manifest = makeManifest(2);
		const buffers = [
			makeAsciiPly([
				{ x: 0, y: 0, z: 1, r: 255, g: 0, b: 0 },
				{ x: 1, y: 2, z: 3, r: 0, g: 255, b: 0 },
				{ x: 2, y: 4, z: 6, r: 0, g: 0, b: 255 },
			]),
			makeAsciiPly([
				{ x: -1, y: 1, z: 2, r: 255, g: 255, b: 0 },
				{ x: 0.5, y: 2.5, z: 3.5, r: 255, g: 0, b: 255 },
			]),
		];
		const source: DemoPointSequencePlaybackSource = {
			asset: {
				kind: 'point-sequence',
				id: 'prepared-test',
				label: 'Prepared Test',
				manifestUrl: '/api/point-sequences/prepared-test/manifest.json',
				description: 'Test asset',
				initialClipId: 'full_clip',
			},
			manifest,
			loadFrame: async (frameIndex) => buffers[frameIndex],
		};

		const prepared = await loadPreparedPointSequence({
			source,
			maxPointsPerFrame: 2,
			colorGradeId: 'painted-figure',
			initialClipId: 'full_clip',
		});

		expect(prepared.sequence.getCurrentClip().id).toBe('full_clip');
		expect(prepared.report.loadingStrategy).toBe('eager-full-sequence');
		expect(prepared.report.frameCount).toBe(2);
		expect(prepared.report.totalFrameBytes).toBeGreaterThan(0);
		expect(prepared.report.totalPreparedBytes).toBeGreaterThan(0);
		expect(prepared.report.estimatedPlaybackBytes).toBeGreaterThan(0);
		expect(prepared.report.originalPointCountRange).toEqual([2, 3]);
		expect(prepared.report.preparedPointCountRange).toEqual([2, 2]);
		expect(prepared.sequence.getPlaybackSamples().count).toBe(2);
		expect(Array.from(prepared.sequence.getPlaybackSamples().colors.slice(0, 3))).not.toEqual([1, 0, 0]);
		expect(prepared.bounds).toMatchObject({
			min: [-1, 0, 1],
			max: [1, 2.5, 3.5],
			height: 2.5,
		});
	});

	it('applies app-layer sequence color grades without mutating source frames', () => {
		const source = createSampleSet({ count: 2 });
		source.positions.set([0, 0, 0, 1, 2, 3]);
		source.colors.set([1, 0, 0, 0, 1, 0]);
		const bounds = computePreparedPointSequenceBounds([source]);
		expect(bounds).not.toBeNull();

		const graded = applySequenceColorGrade([source], bounds, 'studio-ivory');

		expect(graded[0]).not.toBe(source);
		expect(Array.from(source.colors.slice(0, 6))).toEqual([1, 0, 0, 0, 1, 0]);
		expect(Array.from(graded[0].colors.slice(0, 6))).not.toEqual([1, 0, 0, 0, 1, 0]);
	});

	it('computes transform controls against prepared bounds', () => {
		const bounds = computePreparedPointSequenceBounds([
			{
				positions: new Float32Array([0, -1, 0, 2, 3, 4]),
				colors: new Float32Array(6),
				radii: new Float32Array(2),
				opacities: new Float32Array(2),
				count: 2,
			},
		]);
		expect(bounds).not.toBeNull();

		const transform = resolveSequenceTransform(bounds, {
			autoCenter: true,
			fitHeightEnabled: true,
			fitHeight: 2,
			scaleMultiplier: 1.5,
		});

		expect(transform.scale).toBeCloseTo(0.75);
		expect(transform.position).toEqual([-0.75, -0.75, -1.5]);
	});
});
