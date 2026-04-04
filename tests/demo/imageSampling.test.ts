import { describe, expect, it } from 'vitest';
import {
	estimateImagePreparationMs,
	type ImageSamplingPreparationProgress,
	prepareImageSamples,
} from '../../src/lib/demo/imageSampling.js';

function makeRaster(width = 8, height = 8) {
	const pixels = new Uint8ClampedArray(width * height * 4);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const index = (y * width + x) * 4;
			pixels[index] = 80 + x * 10;
			pixels[index + 1] = 40 + y * 12;
			pixels[index + 2] = 120;
			pixels[index + 3] = 255;
		}
	}

	return {
		width,
		height,
		pixels,
	};
}

function makeDepthMap(width = 8, height = 8) {
	const data = new Float32Array(width * height);
	for (let i = 0; i < data.length; i++) {
		data[i] = i / Math.max(1, data.length - 1);
	}

	return {
		width,
		height,
		data,
		modelId: 'test-depth',
	};
}

describe('imageSampling', () => {
	it('prepares image samples with progress reporting and optional frame samples', () => {
		const progress: ImageSamplingPreparationProgress[] = [];
		const samples = prepareImageSamples({
			raster: makeRaster(),
			depthMap: makeDepthMap(),
			sampling: {
				sampleCount: 12,
				algorithm: 'importance',
				depthScale: 0.3,
				densityGamma: 1.1,
				radiusFromLuminance: true,
				sizeVariation: 0.3,
				outlierRadius: 0,
				normalDisplacement: 0.2,
				frameParams: {
					enabled: true,
					style: 'rectangle',
					color: '#ffffff',
					width: 0.05,
					padding: 0.03,
					densityMultiplier: 0.5,
				},
			},
			onProgress: (entry) => {
				progress.push(entry);
			},
		});

		expect(samples.count).toBeGreaterThan(12);
		expect(Math.max(...samples.positions)).toBeGreaterThan(0);
		expect(Math.min(...samples.positions)).toBeLessThan(0);
		expect(progress.at(-1)?.progress).toBe(1);
		expect(progress.at(-1)?.stage).toBe('done');
	});

	it('estimates weighted-voronoi preparation above simpler algorithms for the same raster', () => {
		const raster = makeRaster(32, 32);
		const importanceEstimate = estimateImagePreparationMs({
			raster,
			sampling: {
				sampleCount: 12000,
				algorithm: 'importance',
				depthScale: 0.07,
				densityGamma: 1.1,
				radiusFromLuminance: true,
				sizeVariation: 0.4,
				outlierRadius: 0,
				normalDisplacement: 0,
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
		const voronoiEstimate = estimateImagePreparationMs({
			raster,
			sampling: {
				sampleCount: 12000,
				algorithm: 'weighted-voronoi',
				depthScale: 0.07,
				densityGamma: 1.1,
				radiusFromLuminance: true,
				sizeVariation: 0.4,
				outlierRadius: 0,
				normalDisplacement: 0,
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

		expect(voronoiEstimate).toBeGreaterThan(importanceEstimate);
	});
});
