import type { StippleAlgorithm, AlgorithmInput, AlgorithmOptions, StippleResult } from './types.js';

function luminance(r: number, g: number, b: number): number {
	return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Deterministic xorshift32 PRNG. */
function makeRng(initialSeed: number): () => number {
	let s = initialSeed >>> 0 || 1;
	return () => {
		s ^= s << 13;
		s ^= s >> 17;
		s ^= s << 5;
		return (s >>> 0) / 0xffffffff;
	};
}

/**
 * CDF-based importance sampling.
 *
 * Builds a cumulative distribution from pixel luminance (with optional gamma
 * curve for density contrast), then draws samples proportional to brightness
 * via inverse-CDF lookup.
 */
class ImportanceSampling implements StippleAlgorithm {
	readonly name = 'importance';

	generate(input: AlgorithmInput, options: AlgorithmOptions): StippleResult {
		const { pixels, width, height } = input;
		const { count, baseRadius = 1.0, densityGamma = 1.0 } = options;

		const numPixels = width * height;
		const cdf = new Float64Array(numPixels);

		// Build CDF from luminance^gamma × alpha
		let sum = 0;
		for (let i = 0; i < numPixels; i++) {
			const idx = i * 4;
			const r = pixels[idx] / 255;
			const g = pixels[idx + 1] / 255;
			const b = pixels[idx + 2] / 255;
			const a = pixels[idx + 3] / 255;
			const lum = luminance(r, g, b);
			sum += Math.pow(lum, densityGamma) * a;
			cdf[i] = sum;
		}

		if (sum === 0) {
			return {
				positions: new Float32Array(0),
				colors: new Float32Array(0),
				radii: new Float32Array(0),
				luminances: new Float32Array(0),
				count: 0,
			};
		}

		// Normalise
		for (let i = 0; i < numPixels; i++) cdf[i] /= sum;

		// Sample via inverse CDF
		const positions = new Float32Array(count * 2);
		const colors = new Float32Array(count * 3);
		const radii = new Float32Array(count);
		const luminances = new Float32Array(count);

		const random = makeRng(options.seed ?? (Math.random() * 0xffffffff));

		for (let i = 0; i < count; i++) {
			const u = random();

			// Binary search
			let lo = 0;
			let hi = numPixels - 1;
			while (lo < hi) {
				const mid = (lo + hi) >>> 1;
				if (cdf[mid] < u) lo = mid + 1;
				else hi = mid;
			}

			const py = Math.floor(lo / width);
			const px = lo % width;

			// Sub-pixel jitter for organic distribution
			positions[i * 2] = (px + random()) / width;
			positions[i * 2 + 1] = (py + random()) / height;

			const idx = lo * 4;
			const r = pixels[idx] / 255;
			const g = pixels[idx + 1] / 255;
			const b = pixels[idx + 2] / 255;

			colors[i * 3] = r;
			colors[i * 3 + 1] = g;
			colors[i * 3 + 2] = b;

			const lum = luminance(r, g, b);
			luminances[i] = lum;
			radii[i] = baseRadius;
		}

		return { positions, colors, radii, luminances, count };
	}
}

export const importanceSampling = new ImportanceSampling();
