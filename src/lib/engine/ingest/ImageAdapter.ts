import type { SampleSet } from '../core/types.js';
import { createSampleSet } from '../core/SampleSet.js';
import type { IngestAdapter, ImageAdapterOptions } from './types.js';
import type { AlgorithmInput } from '../algorithms/types.js';
import { rejectionSampling } from '../algorithms/rejection-sampling.js';
import { importanceSampling } from '../algorithms/importance-sampling.js';
import { weightedVoronoiSampling } from '../algorithms/weighted-voronoi.js';
import { depthToNormals, type DepthMap } from '../preprocessing/DepthEstimation.js';

type ImageSource = HTMLImageElement | HTMLCanvasElement | ImageBitmap;

function luminance(r: number, g: number, b: number): number {
	return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Converts a 2D image into a point-sampled SampleSet.
 *
 * Supports optional ML-estimated depth maps for true 3D displacement
 * and lateral normal-based displacement for volumetric form.
 */
export class ImageAdapter implements IngestAdapter<ImageSource, ImageAdapterOptions> {
	readonly name = 'image';

	sample(source: ImageSource, options: ImageAdapterOptions): SampleSet {
		const { width, height, data } = this.extractPixels(source);
		const depthScale = options.depthScale ?? 0;
		const densityGamma = options.densityGamma ?? 1.0;
		const radiusFromLuminance = options.radiusFromLuminance ?? false;
		const sizeVariation = options.sizeVariation ?? 0.4;
		const outlierRadius = options.outlierRadius ?? 0;
		const normalDisplacement = options.normalDisplacement ?? 0;
		const depthMap = options.depthMap;

		const input: AlgorithmInput = { pixels: data, width, height };
		const algOpts = {
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
		const result = algorithm.generate(input, algOpts);

		// Pre-compute luminance map for neighbourhood checks
		let lumMap: Float32Array | null = null;
		if (outlierRadius > 0) {
			lumMap = new Float32Array(width * height);
			for (let i = 0; i < width * height; i++) {
				const idx = i * 4;
				lumMap[i] = luminance(data[idx] / 255, data[idx + 1] / 255, data[idx + 2] / 255);
			}
		}

		// Pre-compute surface normals from depth map for lateral displacement
		let normals: Float32Array | null = null;
		if (depthMap && normalDisplacement > 0) {
			normals = depthToNormals(depthMap, 2.0);
		}

		// First pass: outlier suppression
		const survived = new Uint8Array(result.count);
		let survivedCount = 0;

		for (let i = 0; i < result.count; i++) {
			if (lumMap && outlierRadius > 0) {
				const px = Math.floor(result.positions[i * 2] * width);
				const py = Math.floor(result.positions[i * 2 + 1] * height);
				const r = outlierRadius;

				let sumLum = 0;
				let count = 0;
				for (let dy = -r; dy <= r; dy++) {
					for (let dx = -r; dx <= r; dx++) {
						const nx = px + dx;
						const ny = py + dy;
						if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
							sumLum += lumMap[ny * width + nx];
							count++;
						}
					}
				}
				const avgNeighbourLum = count > 0 ? sumLum / count : 0;
				if (avgNeighbourLum < 0.08) {
					survived[i] = 0;
					continue;
				}
			}
			survived[i] = 1;
			survivedCount++;
		}

		// Build output SampleSet
		const aspect = width / height;
		const samples = createSampleSet({ count: survivedCount, includeIds: true, includeUv: true });

		let outIdx = 0;
		for (let i = 0; i < result.count; i++) {
			if (!survived[i]) continue;

			const i2 = i * 2;
			const i3 = i * 3;
			const normX = result.positions[i2];
			const normY = result.positions[i2 + 1];
			const lum = result.luminances[i];

			const o3 = outIdx * 3;
			const o2 = outIdx * 2;

			let xPos = (normX - 0.5) * aspect;
			let yPos = -(normY - 0.5);
			let zPos = 0;

			if (depthMap && depthScale > 0) {
				// Sample depth from the ML-estimated depth map
				const dpx = Math.min(Math.floor(normX * depthMap.width), depthMap.width - 1);
				const dpy = Math.min(Math.floor(normY * depthMap.height), depthMap.height - 1);
				const depthValue = depthMap.data[dpy * depthMap.width + dpx];

				// Depth map: 1.0 = closest, 0.0 = farthest
				zPos = (depthValue - 0.5) * depthScale;

				// Lateral displacement from surface normals
				// Creates volumetric form — arms look cylindrical, faces look rounded
				if (normals && normalDisplacement > 0) {
					const nIdx = (dpy * depthMap.width + dpx) * 3;
					xPos += normals[nIdx] * normalDisplacement * 0.05;
					yPos += normals[nIdx + 1] * normalDisplacement * 0.05;
				}
			} else if (depthScale > 0) {
				// Fallback: luminance-based depth
				zPos = (lum - 0.3) * depthScale;
			}

			samples.positions[o3] = xPos;
			samples.positions[o3 + 1] = yPos;
			samples.positions[o3 + 2] = zPos;

			samples.colors[o3] = result.colors[i3];
			samples.colors[o3 + 1] = result.colors[i3 + 1];
			samples.colors[o3 + 2] = result.colors[i3 + 2];

			if (radiusFromLuminance) {
				const minScale = 1.0 - sizeVariation;
				const maxScale = 1.0 + sizeVariation;
				samples.radii[outIdx] = result.radii[i] * (minScale + lum * (maxScale - minScale));
			} else {
				samples.radii[outIdx] = result.radii[i];
			}

			samples.opacities[outIdx] = 1.0;
			samples.ids![outIdx] = outIdx;
			samples.uv![o2] = normX;
			samples.uv![o2 + 1] = normY;

			outIdx++;
		}

		return samples;
	}

	private extractPixels(source: ImageSource): ImageData {
		const w = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
		const h = source instanceof HTMLImageElement ? source.naturalHeight : source.height;

		const canvas = document.createElement('canvas');
		canvas.width = w;
		canvas.height = h;

		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('Failed to get 2D canvas context for image pixel extraction');

		ctx.drawImage(source, 0, 0);
		return ctx.getImageData(0, 0, w, h);
	}
}
