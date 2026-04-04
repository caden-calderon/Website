import type { RasterSampleSource } from '$lib/engine/ingest/types.js';
import type { DepthMap } from '$lib/engine/preprocessing/DepthEstimation.js';
import type { SampleSet } from '$lib/engine/core/types.js';
import type { ImageSamplingPreparationProgress, ImageSamplingSettings } from './imageSampling.js';

interface PrepareImageSamplesWorkerRequest {
	type: 'prepare';
	raster: RasterSampleSource;
	depthMap?: DepthMap;
	sampling: ImageSamplingSettings;
}

interface PrepareImageSamplesWorkerProgressMessage {
	type: 'progress';
	progress: ImageSamplingPreparationProgress;
}

interface PrepareImageSamplesWorkerResultMessage {
	type: 'result';
	samples: SampleSet;
}

interface PrepareImageSamplesWorkerErrorMessage {
	type: 'error';
	message: string;
}

type PrepareImageSamplesWorkerMessage =
	| PrepareImageSamplesWorkerProgressMessage
	| PrepareImageSamplesWorkerResultMessage
	| PrepareImageSamplesWorkerErrorMessage;

export interface ImageSamplingTask {
	promise: Promise<SampleSet>;
	cancel: () => void;
}

export function prepareImageSamplesInWorker(options: {
	raster: RasterSampleSource;
	depthMap?: DepthMap | null;
	sampling: ImageSamplingSettings;
	onProgress?: (progress: ImageSamplingPreparationProgress) => void;
}): ImageSamplingTask {
	const worker = new Worker(new URL('./imageSampling.worker.ts', import.meta.url), { type: 'module' });

	let settled = false;
	let rejectPromise: ((reason?: unknown) => void) | null = null;
	const promise = new Promise<SampleSet>((resolve, reject) => {
		rejectPromise = reject;
		worker.onmessage = (event: MessageEvent<PrepareImageSamplesWorkerMessage>) => {
			const message = event.data;
			if (message.type === 'progress') {
				options.onProgress?.(message.progress);
				return;
			}

			settled = true;
			worker.terminate();
			if (message.type === 'result') {
				resolve(message.samples);
				return;
			}

			reject(new Error(message.message));
		};

		worker.onerror = (event) => {
			if (settled) return;
			settled = true;
			worker.terminate();
			reject(event.error instanceof Error ? event.error : new Error('Image sampling worker failed.'));
		};

		worker.postMessage({
			type: 'prepare',
			raster: cloneRasterSource(options.raster),
			depthMap: options.depthMap ? cloneDepthMap(options.depthMap) : undefined,
			sampling: cloneImageSamplingSettings(options.sampling),
		} satisfies PrepareImageSamplesWorkerRequest);
	});

	return {
		promise,
		cancel: () => {
			if (settled) return;
			settled = true;
			worker.terminate();
			rejectPromise?.(new Error('Image sample preparation cancelled.'));
		},
	};
}

function cloneRasterSource(source: RasterSampleSource): RasterSampleSource {
	return {
		width: source.width,
		height: source.height,
		pixels: new Uint8ClampedArray(source.pixels),
	};
}

function cloneDepthMap(depthMap: DepthMap): DepthMap {
	return {
		data: new Float32Array(depthMap.data),
		width: depthMap.width,
		height: depthMap.height,
		modelId: depthMap.modelId,
	};
}

function cloneImageSamplingSettings(sampling: ImageSamplingSettings): ImageSamplingSettings {
	return {
		sampleCount: sampling.sampleCount,
		algorithm: sampling.algorithm,
		depthScale: sampling.depthScale,
		densityGamma: sampling.densityGamma,
		radiusFromLuminance: sampling.radiusFromLuminance,
		sizeVariation: sampling.sizeVariation,
		outlierRadius: sampling.outlierRadius,
		normalDisplacement: sampling.normalDisplacement,
		frameParams: {
			enabled: sampling.frameParams.enabled,
			style: sampling.frameParams.style,
			color: sampling.frameParams.color,
			width: sampling.frameParams.width,
			padding: sampling.frameParams.padding,
			densityMultiplier: sampling.frameParams.densityMultiplier,
		},
	};
}
