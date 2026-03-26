import { describe, it, expect } from 'vitest';
import { rejectionSampling } from '../../src/lib/engine/algorithms/rejection-sampling.js';
import { importanceSampling } from '../../src/lib/engine/algorithms/importance-sampling.js';
import {
	MAX_WEIGHTED_VORONOI_SAMPLES,
	weightedVoronoiSampling,
} from '../../src/lib/engine/algorithms/weighted-voronoi.js';
import type { AlgorithmInput } from '../../src/lib/engine/algorithms/types.js';

/** Create a simple 4×4 RGBA test image with a brightness gradient. */
function makeGradientImage(width = 4, height = 4): AlgorithmInput {
	const pixels = new Uint8ClampedArray(width * height * 4);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const brightness = Math.floor(((x + y) / (width + height - 2)) * 255);
			const idx = (y * width + x) * 4;
			pixels[idx] = brightness;
			pixels[idx + 1] = brightness;
			pixels[idx + 2] = brightness;
			pixels[idx + 3] = 255;
		}
	}
	return { pixels, width, height };
}

/** Create a fully black image — nothing should be sampled. */
function makeBlackImage(width = 4, height = 4): AlgorithmInput {
	const pixels = new Uint8ClampedArray(width * height * 4);
	for (let i = 3; i < pixels.length; i += 4) pixels[i] = 255; // opaque black
	return { pixels, width, height };
}

describe('rejectionSampling', () => {
	it('returns the correct structure', () => {
		const input = makeGradientImage();
		const result = rejectionSampling.generate(input, { count: 50, seed: 1 });

		expect(result.count).toBeGreaterThan(0);
		expect(result.count).toBeLessThanOrEqual(50);
		expect(result.positions.length).toBe(result.count * 2);
		expect(result.colors.length).toBe(result.count * 3);
		expect(result.radii.length).toBe(result.count);
		expect(result.luminances.length).toBe(result.count);
	});

	it('produces deterministic results with the same seed', () => {
		const input = makeGradientImage();
		const a = rejectionSampling.generate(input, { count: 20, seed: 42 });
		const b = rejectionSampling.generate(input, { count: 20, seed: 42 });

		expect(a.count).toBe(b.count);
		for (let i = 0; i < a.positions.length; i++) {
			expect(a.positions[i]).toBe(b.positions[i]);
		}
	});

	it('produces few or no samples from a black image', () => {
		const input = makeBlackImage();
		const result = rejectionSampling.generate(input, { count: 100, seed: 1 });
		expect(result.count).toBe(0);
	});

	it('keeps positions in normalised 0–1 range', () => {
		const input = makeGradientImage(16, 16);
		const result = rejectionSampling.generate(input, { count: 200, seed: 7 });

		for (let i = 0; i < result.count; i++) {
			expect(result.positions[i * 2]).toBeGreaterThanOrEqual(0);
			expect(result.positions[i * 2]).toBeLessThanOrEqual(1);
			expect(result.positions[i * 2 + 1]).toBeGreaterThanOrEqual(0);
			expect(result.positions[i * 2 + 1]).toBeLessThanOrEqual(1);
		}
	});
});

describe('importanceSampling', () => {
	it('returns exactly the requested count', () => {
		const input = makeGradientImage();
		const result = importanceSampling.generate(input, { count: 30, seed: 1 });
		expect(result.count).toBe(30);
	});

	it('produces deterministic results with the same seed', () => {
		const input = makeGradientImage();
		const a = importanceSampling.generate(input, { count: 20, seed: 42 });
		const b = importanceSampling.generate(input, { count: 20, seed: 42 });

		for (let i = 0; i < a.positions.length; i++) {
			expect(a.positions[i]).toBe(b.positions[i]);
		}
	});

	it('returns zero samples from a fully black image', () => {
		const input = makeBlackImage();
		const result = importanceSampling.generate(input, { count: 50, seed: 1 });
		expect(result.count).toBe(0);
	});

	it('concentrates samples in brighter regions', () => {
		// 8×8 image: left half black, right half white
		const w = 8,
			h = 8;
		const pixels = new Uint8ClampedArray(w * h * 4);
		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				const idx = (y * w + x) * 4;
				const bright = x >= w / 2 ? 255 : 0;
				pixels[idx] = bright;
				pixels[idx + 1] = bright;
				pixels[idx + 2] = bright;
				pixels[idx + 3] = 255;
			}
		}

		const result = importanceSampling.generate({ pixels, width: w, height: h }, { count: 500, seed: 99 });

		// Most samples should land in the right half (x > 0.5)
		let rightCount = 0;
		for (let i = 0; i < result.count; i++) {
			if (result.positions[i * 2] > 0.5) rightCount++;
		}
		expect(rightCount / result.count).toBeGreaterThan(0.9);
	});
});

describe('weightedVoronoiSampling', () => {
	it('returns exactly the requested site count while under the cap', () => {
		const input = makeGradientImage(16, 16);
		const result = weightedVoronoiSampling.generate(input, { count: 1200, seed: 17 });

		expect(result.count).toBe(1200);
	});

	it('returns deterministic results with the same seed', () => {
		const input = makeGradientImage(12, 12);
		const a = weightedVoronoiSampling.generate(input, { count: 24, seed: 42 });
		const b = weightedVoronoiSampling.generate(input, { count: 24, seed: 42 });

		expect(Array.from(a.positions)).toEqual(Array.from(b.positions));
	});

	it('exposes a high manual-testing cap', () => {
		expect(MAX_WEIGHTED_VORONOI_SAMPLES).toBe(300000);
	});

	it('still concentrates sites in brighter regions', () => {
		const w = 8;
		const h = 8;
		const pixels = new Uint8ClampedArray(w * h * 4);
		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				const idx = (y * w + x) * 4;
				const bright = x >= w / 2 ? 255 : 0;
				pixels[idx] = bright;
				pixels[idx + 1] = bright;
				pixels[idx + 2] = bright;
				pixels[idx + 3] = 255;
			}
		}

		const result = weightedVoronoiSampling.generate({ pixels, width: w, height: h }, { count: 48, seed: 11 });
		let rightCount = 0;
		for (let i = 0; i < result.count; i++) {
			if (result.positions[i * 2] > 0.5) rightCount++;
		}

		expect(rightCount / result.count).toBeGreaterThan(0.7);
	});
});
