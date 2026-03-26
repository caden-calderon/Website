import { importanceSampling } from './importance-sampling.js';
import type { AlgorithmInput, AlgorithmOptions, StippleAlgorithm, StippleResult } from './types.js';

export const MAX_WEIGHTED_VORONOI_SAMPLES = 300000;
const CANDIDATE_MULTIPLIER = 4;
const MAX_WEIGHTED_VORONOI_CANDIDATES = 1200000;
const RELAXATION_ITERATIONS = 5;

/**
 * Approximate weighted Voronoi / CVT stippling.
 *
 * This is intentionally a quality benchmark path, not the high-count default.
 * It Monte-Carlo samples the density field, then relaxes sites toward the
 * centroids of their assigned samples. The result is much more structured than
 * plain importance sampling without requiring an exact Voronoi implementation.
 */
class WeightedVoronoiSampling implements StippleAlgorithm {
	readonly name = 'weighted-voronoi';

	generate(input: AlgorithmInput, options: AlgorithmOptions): StippleResult {
		const siteCount = Math.max(1, Math.min(options.count, MAX_WEIGHTED_VORONOI_SAMPLES));
		const candidateCount = Math.min(
			Math.max(siteCount * CANDIDATE_MULTIPLIER, siteCount),
			MAX_WEIGHTED_VORONOI_CANDIDATES,
		);

		const candidates = importanceSampling.generate(input, {
			...options,
			count: candidateCount,
		});

		if (candidates.count <= siteCount) {
			return candidates;
		}

		const sitePositions = initialiseSites(candidates, siteCount);
		for (let iteration = 0; iteration < RELAXATION_ITERATIONS; iteration++) {
			relaxSites(sitePositions, candidates);
		}

		return buildResult(sitePositions, input, options.baseRadius ?? 1.0);
	}
}

function initialiseSites(candidates: StippleResult, siteCount: number): Float32Array {
	const positions = new Float32Array(siteCount * 2);
	const stride = Math.max(1, Math.floor(candidates.count / siteCount));

	let siteIndex = 0;
	for (let i = 0; i < candidates.count && siteIndex < siteCount; i += stride) {
		const i2 = siteIndex * 2;
		const c2 = i * 2;
		positions[i2] = candidates.positions[c2];
		positions[i2 + 1] = candidates.positions[c2 + 1];
		siteIndex++;
	}

	while (siteIndex < siteCount) {
		const srcIndex = (siteIndex % candidates.count) * 2;
		const i2 = siteIndex * 2;
		positions[i2] = candidates.positions[srcIndex];
		positions[i2 + 1] = candidates.positions[srcIndex + 1];
		siteIndex++;
	}

	return positions;
}

function relaxSites(sitePositions: Float32Array, candidates: StippleResult): void {
	const siteCount = sitePositions.length / 2;
	const sumsX = new Float32Array(siteCount);
	const sumsY = new Float32Array(siteCount);
	const counts = new Uint32Array(siteCount);
	const spatialIndex = buildSpatialIndex(sitePositions);

	for (let candidateIndex = 0; candidateIndex < candidates.count; candidateIndex++) {
		const c2 = candidateIndex * 2;
		const x = candidates.positions[c2];
		const y = candidates.positions[c2 + 1];
		const siteIndex = findNearestSite(x, y, sitePositions, spatialIndex);

		sumsX[siteIndex] += x;
		sumsY[siteIndex] += y;
		counts[siteIndex]++;
	}

	for (let siteIndex = 0; siteIndex < siteCount; siteIndex++) {
		const count = counts[siteIndex];
		if (count === 0) continue;
		const i2 = siteIndex * 2;
		sitePositions[i2] = sumsX[siteIndex] / count;
		sitePositions[i2 + 1] = sumsY[siteIndex] / count;
	}
}

interface SpatialIndex {
	buckets: Map<string, number[]>;
	cellSize: number;
}

function buildSpatialIndex(sitePositions: Float32Array): SpatialIndex {
	const siteCount = Math.max(1, sitePositions.length / 2);
	const cellSize = Math.max(1 / Math.sqrt(siteCount), 1 / 128);
	const buckets = new Map<string, number[]>();

	for (let siteIndex = 0; siteIndex < siteCount; siteIndex++) {
		const i2 = siteIndex * 2;
		const key = bucketKey(sitePositions[i2], sitePositions[i2 + 1], cellSize);
		const bucket = buckets.get(key) ?? [];
		bucket.push(siteIndex);
		buckets.set(key, bucket);
	}

	return { buckets, cellSize };
}

function findNearestSite(
	x: number,
	y: number,
	sitePositions: Float32Array,
	spatialIndex: SpatialIndex,
): number {
	const { buckets, cellSize } = spatialIndex;
	const baseX = Math.floor(x / cellSize);
	const baseY = Math.floor(y / cellSize);

	let bestIndex = -1;
	let bestDistance = Infinity;

	for (let offsetY = -1; offsetY <= 1; offsetY++) {
		for (let offsetX = -1; offsetX <= 1; offsetX++) {
			const bucket = buckets.get(`${baseX + offsetX}:${baseY + offsetY}`);
			if (!bucket) continue;

			for (const siteIndex of bucket) {
				const i2 = siteIndex * 2;
				const dx = x - sitePositions[i2];
				const dy = y - sitePositions[i2 + 1];
				const distance = dx * dx + dy * dy;
				if (distance < bestDistance) {
					bestDistance = distance;
					bestIndex = siteIndex;
				}
			}
		}
	}

	if (bestIndex >= 0) {
		return bestIndex;
	}

	// Fallback for sparse buckets or edge cases.
	for (let siteIndex = 0; siteIndex < sitePositions.length / 2; siteIndex++) {
		const i2 = siteIndex * 2;
		const dx = x - sitePositions[i2];
		const dy = y - sitePositions[i2 + 1];
		const distance = dx * dx + dy * dy;
		if (distance < bestDistance) {
			bestDistance = distance;
			bestIndex = siteIndex;
		}
	}

	return Math.max(0, bestIndex);
}

function bucketKey(x: number, y: number, cellSize: number): string {
	return `${Math.floor(x / cellSize)}:${Math.floor(y / cellSize)}`;
}

function buildResult(
	sitePositions: Float32Array,
	input: AlgorithmInput,
	baseRadius: number,
): StippleResult {
	const count = sitePositions.length / 2;
	const colors = new Float32Array(count * 3);
	const radii = new Float32Array(count);
	const luminances = new Float32Array(count);

	for (let siteIndex = 0; siteIndex < count; siteIndex++) {
		const i2 = siteIndex * 2;
		const i3 = siteIndex * 3;

		const px = Math.min(Math.floor(sitePositions[i2] * input.width), input.width - 1);
		const py = Math.min(Math.floor(sitePositions[i2 + 1] * input.height), input.height - 1);
		const pixelIndex = (py * input.width + px) * 4;

		const r = input.pixels[pixelIndex] / 255;
		const g = input.pixels[pixelIndex + 1] / 255;
		const b = input.pixels[pixelIndex + 2] / 255;

		colors[i3] = r;
		colors[i3 + 1] = g;
		colors[i3 + 2] = b;
		radii[siteIndex] = baseRadius;
		luminances[siteIndex] = 0.299 * r + 0.587 * g + 0.114 * b;
	}

	return {
		positions: sitePositions,
		colors,
		radii,
		luminances,
		count,
	};
}

export const weightedVoronoiSampling = new WeightedVoronoiSampling();
