import type { SampleSet } from '../core/types.js';
import { createSampleSet } from '../core/SampleSet.js';
import type { AlgorithmInput } from '../algorithms/types.js';
import { importanceSampling } from '../algorithms/importance-sampling.js';
import { rejectionSampling } from '../algorithms/rejection-sampling.js';
import { weightedVoronoiSampling } from '../algorithms/weighted-voronoi.js';
import { depthToNormals } from '../preprocessing/DepthEstimation.js';
import type { IngestAdapter, ImageAdapterOptions, RasterSampleSource } from './types.js';

function luminance(r: number, g: number, b: number): number {
	return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Converts a dense RGBA raster into a point-sampled SampleSet.
 *
 * This is the reusable sampling core behind the browser `ImageAdapter`, and it
 * is intended to be reused later by registered RGBD video/Kinect frame paths.
 */
export class RasterAdapter implements IngestAdapter<RasterSampleSource, ImageAdapterOptions> {
	readonly name = 'raster';

	sample(source: RasterSampleSource, options: ImageAdapterOptions): SampleSet {
		const { width, height, pixels } = source;
		this.validateSource(source);

		const depthScale = options.depthScale ?? 0;
		const densityGamma = options.densityGamma ?? 1.0;
		const radiusFromLuminance = options.radiusFromLuminance ?? false;
		const sizeVariation = options.sizeVariation ?? 0.4;
		const outlierRadius = options.outlierRadius ?? 0;
		const normalDisplacement = options.normalDisplacement ?? 0;
		const depthMap = options.depthMap;
		const alphaCutoff = clamp01(options.alphaCutoff ?? 0);

		const input: AlgorithmInput = { pixels, width, height };
		const algorithmOptions = {
			count: options.count,
			baseRadius: options.baseRadius ?? 1.0,
			seed: options.seed,
			densityGamma,
		};

		const algorithm =
			options.algorithm === 'importance'
				? importanceSampling
				: options.algorithm === 'weighted-voronoi'
					? weightedVoronoiSampling
					: rejectionSampling;
		const result = algorithm.generate(input, algorithmOptions);

		let luminanceMap: Float32Array | null = null;
		if (outlierRadius > 0) {
			luminanceMap = new Float32Array(width * height);
			for (let i = 0; i < width * height; i++) {
				const idx = i * 4;
				luminanceMap[i] = luminance(pixels[idx] / 255, pixels[idx + 1] / 255, pixels[idx + 2] / 255);
			}
		}

		let normals: Float32Array | null = null;
		if (depthMap && normalDisplacement > 0) {
			normals = depthToNormals(depthMap, 2.0);
		}

		const survived = new Uint8Array(result.count);
		let survivedCount = 0;
		for (let i = 0; i < result.count; i++) {
			if (luminanceMap && outlierRadius > 0) {
				const px = Math.floor(result.positions[i * 2] * width);
				const py = Math.floor(result.positions[i * 2 + 1] * height);
				const averageNeighbourLuminance = this.measureAverageNeighbourLuminance(
					luminanceMap,
					width,
					height,
					px,
					py,
					outlierRadius,
				);
				if (averageNeighbourLuminance < 0.08) {
					continue;
				}
			}

			if (alphaCutoff > 0) {
				const px = Math.min(Math.floor(result.positions[i * 2] * width), width - 1);
				const py = Math.min(Math.floor(result.positions[i * 2 + 1] * height), height - 1);
				const alpha = pixels[(py * width + px) * 4 + 3] / 255;
				if (alpha < alphaCutoff) {
					continue;
				}
			}

			survived[i] = 1;
			survivedCount++;
		}

		const aspect = width / height;
		const samples = createSampleSet({ count: survivedCount, includeIds: true, includeUv: true });

		let outIndex = 0;
		for (let i = 0; i < result.count; i++) {
			if (!survived[i]) continue;

			const positionIndex = i * 2;
			const colorIndex = i * 3;
			const normX = result.positions[positionIndex];
			const normY = result.positions[positionIndex + 1];
			const lum = result.luminances[i];

			const outPositionIndex = outIndex * 3;
			const outUvIndex = outIndex * 2;

			let xPos = (normX - 0.5) * aspect;
			let yPos = -(normY - 0.5);
			let zPos = 0;

			if (depthMap && depthScale > 0) {
				const depthPixelX = Math.min(Math.floor(normX * depthMap.width), depthMap.width - 1);
				const depthPixelY = Math.min(Math.floor(normY * depthMap.height), depthMap.height - 1);
				const depthValue = depthMap.data[depthPixelY * depthMap.width + depthPixelX];
				zPos = (depthValue - 0.5) * depthScale;

				if (normals && normalDisplacement > 0) {
					const normalIndex = (depthPixelY * depthMap.width + depthPixelX) * 3;
					xPos += normals[normalIndex] * normalDisplacement * 0.05;
					yPos += normals[normalIndex + 1] * normalDisplacement * 0.05;
				}
			} else if (depthScale > 0) {
				zPos = (lum - 0.3) * depthScale;
			}

			samples.positions[outPositionIndex] = xPos;
			samples.positions[outPositionIndex + 1] = yPos;
			samples.positions[outPositionIndex + 2] = zPos;

			samples.colors[outPositionIndex] = result.colors[colorIndex];
			samples.colors[outPositionIndex + 1] = result.colors[colorIndex + 1];
			samples.colors[outPositionIndex + 2] = result.colors[colorIndex + 2];

			if (radiusFromLuminance) {
				const minScale = 1.0 - sizeVariation;
				const maxScale = 1.0 + sizeVariation;
				samples.radii[outIndex] = result.radii[i] * (minScale + lum * (maxScale - minScale));
			} else {
				samples.radii[outIndex] = result.radii[i];
			}

			samples.opacities[outIndex] = 1.0;
			samples.ids![outIndex] = outIndex;
			samples.uv![outUvIndex] = normX;
			samples.uv![outUvIndex + 1] = normY;
			outIndex++;
		}

		return samples;
	}

	private validateSource(source: RasterSampleSource): void {
		if (!Number.isInteger(source.width) || source.width <= 0) {
			throw new Error(`RasterAdapter source width must be a positive integer; received ${source.width}.`);
		}
		if (!Number.isInteger(source.height) || source.height <= 0) {
			throw new Error(`RasterAdapter source height must be a positive integer; received ${source.height}.`);
		}
		const expectedLength = source.width * source.height * 4;
		if (source.pixels.length !== expectedLength) {
			throw new Error(
				`RasterAdapter source pixel length ${source.pixels.length} does not match expected RGBA length ${expectedLength}.`,
			);
		}
	}

	private measureAverageNeighbourLuminance(
		luminanceMap: Float32Array,
		width: number,
		height: number,
		px: number,
		py: number,
		radius: number,
	): number {
		let sum = 0;
		let count = 0;
		for (let dy = -radius; dy <= radius; dy++) {
			for (let dx = -radius; dx <= radius; dx++) {
				const nx = px + dx;
				const ny = py + dy;
				if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
					sum += luminanceMap[ny * width + nx];
					count++;
				}
			}
		}
		return count > 0 ? sum / count : 0;
	}
}

function clamp01(value: number): number {
	return Math.min(1, Math.max(0, value));
}
