import { describe, expect, it } from 'vitest';
import { RasterAdapter } from '../../src/lib/engine/ingest/RasterAdapter.js';
import type { RasterSampleSource } from '../../src/lib/engine/ingest/types.js';
import type { DepthMap } from '../../src/lib/engine/preprocessing/DepthEstimation.js';

function makeRasterSource(
	width: number,
	height: number,
	pixels: Uint8ClampedArray,
): RasterSampleSource {
	return { width, height, pixels };
}

describe('RasterAdapter', () => {
	it('does not sample fully transparent pixels', () => {
		const adapter = new RasterAdapter();
		const source = makeRasterSource(2, 1, new Uint8ClampedArray([
			255, 255, 255, 255,
			255, 255, 255, 0,
		]));

		const samples = adapter.sample(source, {
			count: 64,
			algorithm: 'importance',
			baseRadius: 1,
			seed: 7,
		});

		expect(samples.count).toBeGreaterThan(0);
		expect(samples.count).toBeLessThanOrEqual(64);
		for (let i = 0; i < samples.count; i++) {
			expect(samples.uv![i * 2]).toBeLessThan(0.5);
		}
	});

	it('drops low-alpha samples when alphaCutoff is enabled', () => {
		const adapter = new RasterAdapter();
		const source = makeRasterSource(2, 1, new Uint8ClampedArray([
			255, 255, 255, 255,
			255, 255, 255, 24,
		]));

		const samples = adapter.sample(source, {
			count: 64,
			algorithm: 'importance',
			baseRadius: 1,
			seed: 9,
			alphaCutoff: 0.2,
		});

		expect(samples.count).toBeGreaterThan(0);
		expect(samples.count).toBeLessThanOrEqual(64);
		for (let i = 0; i < samples.count; i++) {
			expect(samples.uv![i * 2]).toBeLessThan(0.5);
		}
	});

	it('uses supplied depth maps for true depth instead of luminance fallback', () => {
		const adapter = new RasterAdapter();
		const source = makeRasterSource(1, 1, new Uint8ClampedArray([255, 255, 255, 255]));
		const depthMap: DepthMap = {
			data: new Float32Array([1]),
			width: 1,
			height: 1,
			modelId: 'registered-depth',
		};

		const withDepthMap = adapter.sample(source, {
			count: 4,
			algorithm: 'importance',
			baseRadius: 1,
			seed: 3,
			depthScale: 0.4,
			depthMap,
		});
		const withLuminanceDepth = adapter.sample(source, {
			count: 4,
			algorithm: 'importance',
			baseRadius: 1,
			seed: 3,
			depthScale: 0.4,
		});

		for (let i = 0; i < withDepthMap.count; i++) {
			expect(withDepthMap.positions[i * 3 + 2]).toBeCloseTo(0.2, 5);
			expect(withDepthMap.positions[i * 3 + 2]).not.toBeCloseTo(withLuminanceDepth.positions[i * 3 + 2], 5);
		}
	});

	it('supports strong radius variation from raster luminance', () => {
		const adapter = new RasterAdapter();
		const source = makeRasterSource(4, 1, new Uint8ClampedArray([
			64, 64, 64, 255,
			128, 128, 128, 255,
			192, 192, 192, 255,
			255, 255, 255, 255,
		]));

		const defaultVariation = adapter.sample(source, {
			count: 64,
			algorithm: 'importance',
			baseRadius: 1.0,
			seed: 42,
			radiusFromLuminance: true,
		});
		const maxVariation = adapter.sample(source, {
			count: 64,
			algorithm: 'importance',
			baseRadius: 1.0,
			seed: 42,
			radiusFromLuminance: true,
			sizeVariation: 1.0,
		});

		const defaultSpread = Math.max(...Array.from(defaultVariation.radii)) - Math.min(...Array.from(defaultVariation.radii));
		const maxSpread = Math.max(...Array.from(maxVariation.radii)) - Math.min(...Array.from(maxVariation.radii));
		expect(maxSpread).toBeGreaterThan(defaultSpread);
	});

	it('rejects malformed raster buffers clearly', () => {
		const adapter = new RasterAdapter();
		const source = makeRasterSource(2, 2, new Uint8ClampedArray(15));

		expect(() =>
			adapter.sample(source, {
				count: 1,
				algorithm: 'importance',
			}),
		).toThrow(/does not match expected rgba length/i);
	});
});
