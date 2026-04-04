import { describe, expect, it } from 'vitest';
import {
	buildRgbdSequenceLookStatus,
	loadPreparedRgbdSequence,
} from '../../src/lib/demo/rgbdSequencePlayback.js';
import type { DemoRgbdSequencePlaybackSource, RgbdSequenceFrameData } from '../../src/lib/demo/rgbdSequenceSources.js';
import type { RgbdSequenceManifest } from '../../src/lib/demo/rgbdSequenceTypes.js';
import { DEFAULT_RENDER_PARAMS } from '../../src/lib/engine/render/types.js';

function makeManifest(frameCount: number): RgbdSequenceManifest {
	return {
		version: 1,
		fps: 12,
		frameCount,
		frameTimestampsMs: Array.from({ length: frameCount }, (_, index) => index * (1000 / 12)),
		frames: Array.from({ length: frameCount }, (_, index) => ({
			colorFile: `color-${index.toString().padStart(4, '0')}.json`,
			depthFile: `depth-${index.toString().padStart(4, '0')}.json`,
		})),
		clips: [{ id: 'portrait_turn', startFrame: 0, endFrame: frameCount - 1, mode: 'loop' }],
		raster: {
			width: 4,
			height: 4,
			colorEncoding: 'rgba8-json-base64',
		},
		depth: {
			width: 4,
			height: 4,
			encoding: 'float32-json-base64',
			semantics: '0-far-1-near',
		},
		coordinateSystem: {
			upAxis: 'y',
			forwardAxis: '-z',
			handedness: 'right',
		},
		units: 'meters',
		processing: {
			dataset: 'test',
		},
	};
}

function makeFrame(frameIndex: number): RgbdSequenceFrameData {
	const pixels = new Uint8ClampedArray(4 * 4 * 4);
	const depthData = new Float32Array(4 * 4);

	for (let i = 0; i < 16; i++) {
		const i4 = i * 4;
		pixels[i4] = 180 + frameIndex * 10;
		pixels[i4 + 1] = 120 + i * 2;
		pixels[i4 + 2] = 90 + frameIndex * 5;
		pixels[i4 + 3] = 255;
		depthData[i] = 0.2 + i * 0.03 + frameIndex * 0.02;
	}

	return {
		raster: {
			width: 4,
			height: 4,
			pixels,
		},
		depthMap: {
			data: depthData,
			width: 4,
			height: 4,
			modelId: 'rgbd-test',
		},
		sourceBytes: {
			color: pixels.byteLength,
			depth: depthData.byteLength,
		},
	};
}

describe('rgbdSequencePlayback', () => {
	it('builds a prepared RGBD sequence with eager instrumentation', async () => {
		const rawFrames = [makeFrame(0), makeFrame(1)];
		const source: DemoRgbdSequencePlaybackSource = {
			asset: {
				kind: 'rgbd-sequence',
				source: 'manifest',
				id: 'procedural-rgbd-portrait',
				label: 'Procedural RGBD Portrait',
				manifestUrl: '/api/rgbd-sequences/procedural-rgbd-portrait/manifest.json',
				description: 'Test asset',
				initialClipId: 'portrait_turn',
			},
			manifest: makeManifest(rawFrames.length),
			loadFrame: async (frameIndex) => rawFrames[frameIndex],
		};

		const prepared = await loadPreparedRgbdSequence({
			source,
			rawFrames,
			initialClipId: 'portrait_turn',
			sampling: {
				sampleCount: 12,
				algorithm: 'importance',
				depthScale: 0.2,
				densityGamma: 1.1,
				radiusFromLuminance: true,
				sizeVariation: 0.3,
				outlierRadius: 0,
				normalDisplacement: 0.5,
				frameParams: {
					enabled: false,
					style: 'rectangle',
					color: '#ffffff',
					width: 0.04,
					padding: 0.02,
					densityMultiplier: 1,
				},
			},
		});

		expect(prepared.sequence.getCurrentClip().id).toBe('portrait_turn');
		expect(prepared.report.kind).toBe('rgbd');
		expect(prepared.report.loadingStrategy).toBe('eager-full-sequence');
		expect(prepared.report.frameCount).toBe(2);
		expect(prepared.report.fetchMs).toBe(0);
		expect(prepared.report.totalColorBytes).toBe(rawFrames.reduce((sum, frame) => sum + frame.sourceBytes.color, 0));
		expect(prepared.report.totalDepthBytes).toBe(rawFrames.reduce((sum, frame) => sum + frame.sourceBytes.depth, 0));
		expect(prepared.report.totalPreparedBytes).toBeGreaterThan(0);
		expect(prepared.report.estimatedPlaybackBytes).toBeGreaterThan(0);
		expect(prepared.report.preparedPointCountRange).toEqual([12, 12]);
		expect(prepared.report.totalPreparedPoints).toBe(24);
		expect(prepared.report.rasterSize).toEqual([4, 4]);
		expect(prepared.bounds?.height).toBeGreaterThan(0);
		expect(prepared.sequence.getPlaybackSamples().count).toBe(12);
	});

	it('describes the RGBD look status using render params', () => {
		expect(
			buildRgbdSequenceLookStatus(
				{
					kind: 'rgbd',
					loadingStrategy: 'eager-full-sequence',
					frameCount: 1,
					totalColorBytes: 64,
					totalDepthBytes: 64,
					totalPreparedBytes: 128,
					estimatedPlaybackBytes: 128,
					fetchMs: 0,
					prepareMs: 1,
					buildMs: 1,
					totalLoadMs: 2,
					preparedPointCountRange: [8, 8],
					totalPreparedPoints: 8,
					sampleCountPerFrame: 8,
					rasterSize: [4, 4],
					algorithm: 'weighted-voronoi',
				},
				{ ...DEFAULT_RENDER_PARAMS, pointSize: 1.7 },
			),
		).toContain('weighted-voronoi');
	});
});
