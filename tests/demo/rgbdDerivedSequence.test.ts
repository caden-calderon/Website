import { describe, expect, it } from 'vitest';
import { buildDerivedRgbdSequence } from '../../src/lib/demo/rgbdDerivedSequence.js';
import type { DemoDerivedRgbdSequenceAsset } from '../../src/lib/demo/assets.js';
import type { RasterSampleSource } from '../../src/lib/engine/ingest/types.js';
import type { DepthMap } from '../../src/lib/engine/preprocessing/DepthEstimation.js';

function makeRaster(
	width: number,
	height: number,
	pixels: Uint8ClampedArray,
): RasterSampleSource {
	return { width, height, pixels };
}

const baseAsset: DemoDerivedRgbdSequenceAsset = {
	kind: 'rgbd-sequence',
	source: 'derived-image',
	id: 'derived-test',
	label: 'Derived Test',
	description: 'Derived test asset',
	imageAssetId: 'girl-with-a-pearl-earring',
	frameCount: 4,
	fps: 12,
	useBackgroundRemoval: false,
	useEstimatedDepth: true,
	depthModelIndex: 0,
	motion: {
		parallaxPixels: 1,
		verticalPixels: 0,
		depthDrift: 0.1,
		alphaCutoff: 0.05,
	},
	initialClipId: 'portrait_turn',
};

describe('rgbdDerivedSequence', () => {
	it('builds a bounded derived RGBD clip from a raster and depth map', async () => {
		const raster = makeRaster(4, 1, new Uint8ClampedArray([
			255, 0, 0, 255,
			0, 255, 0, 255,
			0, 0, 255, 255,
			255, 255, 255, 255,
		]));
		const depthMap: DepthMap = {
			data: new Float32Array([0.1, 0.4, 0.7, 1]),
			width: 4,
			height: 1,
			modelId: 'test-depth',
		};

		const derived = buildDerivedRgbdSequence({
			asset: baseAsset,
			raster,
			depthMap,
		});

		expect(derived.source.manifest.frameCount).toBe(4);
		expect(derived.source.manifest.raster.width).toBe(4);
		expect(derived.rawFrames).toHaveLength(4);
		expect(derived.rawFrames[0].sourceBytes.color).toBe(16);
		expect(Array.from(derived.rawFrames[0].raster.pixels)).not.toEqual(Array.from(derived.rawFrames[1].raster.pixels));

		const frame = await derived.source.loadFrame(1);
		expect(frame.depthMap?.width).toBe(4);
		expect(frame.depthMap?.data[0]).not.toBe(depthMap.data[0]);
	});

	it('falls back to luminance-derived depth when no depth map is provided', () => {
		const raster = makeRaster(2, 1, new Uint8ClampedArray([
			32, 32, 32, 255,
			224, 224, 224, 255,
		]));

		const derived = buildDerivedRgbdSequence({
			asset: baseAsset,
			raster,
		});

		expect(derived.rawFrames[0].depthMap?.modelId).toBe('derived-luminance-depth');
		expect(derived.rawFrames[0].depthMap?.data[1]).toBeGreaterThan(derived.rawFrames[0].depthMap?.data[0] ?? 0);
	});
});
