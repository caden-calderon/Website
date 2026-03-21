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
 * Weighted rejection sampling.
 *
 * For each candidate position a random threshold is compared against the
 * pixel luminance (with optional gamma) — brighter regions accept more
 * samples, producing density-from-brightness naturally.
 */
class RejectionSampling implements StippleAlgorithm {
	readonly name = 'rejection';

	generate(input: AlgorithmInput, options: AlgorithmOptions): StippleResult {
		const { pixels, width, height } = input;
		const { count, baseRadius = 1.0, densityGamma = 1.0 } = options;

		const positions = new Float32Array(count * 2);
		const colors = new Float32Array(count * 3);
		const radii = new Float32Array(count);
		const luminances = new Float32Array(count);

		const random = makeRng(options.seed ?? (Math.random() * 0xffffffff));

		let accepted = 0;
		let attempts = 0;
		const maxAttempts = count * 20;

		while (accepted < count && attempts < maxAttempts) {
			attempts++;

			const x = random();
			const y = random();

			const px = Math.min(Math.floor(x * width), width - 1);
			const py = Math.min(Math.floor(y * height), height - 1);
			const idx = (py * width + px) * 4;

			const r = pixels[idx] / 255;
			const g = pixels[idx + 1] / 255;
			const b = pixels[idx + 2] / 255;
			const a = pixels[idx + 3] / 255;

			if (a < 0.01) continue;

			const lum = luminance(r, g, b);
			const weight = Math.pow(lum, densityGamma);

			if (random() < weight) {
				positions[accepted * 2] = x;
				positions[accepted * 2 + 1] = y;
				colors[accepted * 3] = r;
				colors[accepted * 3 + 1] = g;
				colors[accepted * 3 + 2] = b;
				luminances[accepted] = lum;
				radii[accepted] = baseRadius;
				accepted++;
			}
		}

		return {
			positions: positions.subarray(0, accepted * 2),
			colors: colors.subarray(0, accepted * 3),
			radii: radii.subarray(0, accepted),
			luminances: luminances.subarray(0, accepted),
			count: accepted,
		};
	}
}

export const rejectionSampling = new RejectionSampling();
