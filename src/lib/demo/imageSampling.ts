import { mergeSampleSets } from '$lib/engine/core/SampleSet.js';
import type { SampleSet } from '$lib/engine/core/types.js';
import { RasterAdapter } from '$lib/engine/ingest/RasterAdapter.js';
import type { RasterSampleSource } from '$lib/engine/ingest/types.js';
import type { DepthMap } from '$lib/engine/preprocessing/DepthEstimation.js';
import { FrameGenerator, type FrameParams } from '$lib/engine/processing/FrameGenerator.js';
import { MAX_WEIGHTED_VORONOI_SAMPLES } from '$lib/engine/algorithms/weighted-voronoi.js';

export interface ImageSamplingSettings {
	sampleCount: number;
	algorithm: 'rejection' | 'importance' | 'weighted-voronoi';
	depthScale: number;
	densityGamma: number;
	radiusFromLuminance: boolean;
	sizeVariation: number;
	outlierRadius: number;
	normalDisplacement: number;
	frameParams: FrameParams;
}

export interface ImageSamplingPreparationProgress {
	stage: string;
	progress: number;
	message: string;
	elapsedMs: number;
	estimatedTotalMs: number;
	estimatedRemainingMs: number;
}

export function prepareImageSamples(options: {
	raster: RasterSampleSource;
	depthMap?: DepthMap | null;
	sampling: ImageSamplingSettings;
	frameGenerator?: FrameGenerator;
	onProgress?: (progress: ImageSamplingPreparationProgress) => void;
}): SampleSet {
	const {
		raster,
		depthMap,
		sampling,
		frameGenerator = new FrameGenerator(),
		onProgress,
	} = options;

	const rasterAdapter = new RasterAdapter();
	const prepareStart = nowMs();
	const estimatedInitialMs = estimateImagePreparationMs({ raster, sampling });

	const reportProgress = (progress: number, stage: string) => {
		const elapsedMs = nowMs() - prepareStart;
		const clampedProgress = clamp01(progress);
		const estimatedTotalMs = clampedProgress >= 0.05
			? Math.max(estimatedInitialMs, elapsedMs / clampedProgress)
			: estimatedInitialMs;
		onProgress?.({
			stage,
			progress: clampedProgress,
			message: buildImagePreparationMessage(sampling.algorithm, stage),
			elapsedMs,
			estimatedTotalMs,
			estimatedRemainingMs: Math.max(0, estimatedTotalMs - elapsedMs),
		});
	};

	reportProgress(0, 'starting');
	const imageSamples = rasterAdapter.sample(raster, {
		count: sampling.sampleCount,
		algorithm: sampling.algorithm,
		baseRadius: 1.0,
		seed: 42,
		depthScale: sampling.depthScale,
		densityGamma: sampling.densityGamma,
		radiusFromLuminance: sampling.radiusFromLuminance,
		sizeVariation: sampling.sizeVariation,
		outlierRadius: sampling.outlierRadius,
		depthMap: depthMap ?? undefined,
		normalDisplacement: sampling.normalDisplacement,
		onProgress: (event) => {
			reportProgress(event.progress, event.stage);
		},
	});

	reportProgress(0.92, 'frame');
	if (!sampling.frameParams.enabled) {
		reportProgress(1, 'done');
		return imageSamples;
	}

	const aspect = raster.width / raster.height;
	const frameSamples = frameGenerator.generate(aspect, imageSamples.count, sampling.frameParams, 42);
	reportProgress(0.98, 'merge-frame');
	const preparedSamples = mergeSampleSets(imageSamples, frameSamples);
	reportProgress(1, 'done');
	return preparedSamples;
}

export function estimateImagePreparationMs(options: {
	raster: RasterSampleSource;
	sampling: ImageSamplingSettings;
}): number {
	const pixelCount = options.raster.width * options.raster.height;
	const effectiveSamples = options.sampling.algorithm === 'weighted-voronoi'
		? Math.min(options.sampling.sampleCount, MAX_WEIGHTED_VORONOI_SAMPLES)
		: options.sampling.sampleCount;
	const frameMultiplier = options.sampling.frameParams.enabled
		? Math.max(1, options.sampling.frameParams.densityMultiplier)
		: 1;

	if (options.sampling.algorithm === 'weighted-voronoi') {
		return Math.max(250, (effectiveSamples * 0.0065) + (pixelCount * 0.00035) + (frameMultiplier * 30));
	}

	if (options.sampling.algorithm === 'importance') {
		return Math.max(60, (effectiveSamples * 0.00045) + (pixelCount * 0.00008) + (frameMultiplier * 12));
	}

	return Math.max(40, (effectiveSamples * 0.0003) + (pixelCount * 0.00006) + (frameMultiplier * 8));
}

function buildImagePreparationMessage(
	algorithm: ImageSamplingSettings['algorithm'],
	stage: string,
): string {
	switch (stage) {
		case 'seed-candidates':
			return `Preparing image samples with ${algorithm}: seeding candidates...`;
		case 'relax-sites':
			return `Preparing image samples with ${algorithm}: relaxing sites...`;
		case 'build-result':
			return `Preparing image samples with ${algorithm}: building result...`;
		case 'frame':
			return 'Preparing image frame samples...';
		case 'merge-frame':
			return 'Combining image and frame samples...';
		case 'done':
			return 'Image sample preparation complete.';
		default:
			return `Preparing image samples with ${algorithm}...`;
	}
}

function clamp01(value: number): number {
	return Math.min(1, Math.max(0, value));
}

function nowMs(): number {
	return typeof performance !== 'undefined' && typeof performance.now === 'function'
		? performance.now()
		: Date.now();
}
