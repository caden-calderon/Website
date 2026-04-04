import type { DemoDerivedRgbdSequenceAsset } from './assets.js';
import type {
	DerivedRgbdSequenceBuildData,
	DerivedRgbdSequenceBuildProgress,
} from './rgbdDerivedSequence.js';
import type { RasterSampleSource } from '$lib/engine/ingest/types.js';
import type { DepthMap } from '$lib/engine/preprocessing/DepthEstimation.js';

interface PrepareDerivedRgbdSequenceWorkerRequest {
	type: 'build';
	asset: DemoDerivedRgbdSequenceAsset;
	raster: RasterSampleSource;
	depthMap?: DepthMap;
}

interface PrepareDerivedRgbdSequenceWorkerProgressMessage {
	type: 'progress';
	progress: DerivedRgbdSequenceBuildProgress;
}

interface PrepareDerivedRgbdSequenceWorkerResultMessage {
	type: 'result';
	buildData: DerivedRgbdSequenceBuildData;
}

interface PrepareDerivedRgbdSequenceWorkerErrorMessage {
	type: 'error';
	message: string;
}

type PrepareDerivedRgbdSequenceWorkerMessage =
	| PrepareDerivedRgbdSequenceWorkerProgressMessage
	| PrepareDerivedRgbdSequenceWorkerResultMessage
	| PrepareDerivedRgbdSequenceWorkerErrorMessage;

export interface DerivedRgbdSequenceBuildTask {
	promise: Promise<DerivedRgbdSequenceBuildData>;
	cancel: () => void;
}

export function buildDerivedRgbdSequenceDataInWorker(options: {
	asset: DemoDerivedRgbdSequenceAsset;
	raster: RasterSampleSource;
	depthMap?: DepthMap | null;
	onProgress?: (progress: DerivedRgbdSequenceBuildProgress) => void;
}): DerivedRgbdSequenceBuildTask {
	const worker = new Worker(new URL('./rgbdDerivedSequence.worker.ts', import.meta.url), { type: 'module' });

	let settled = false;
	let rejectPromise: ((reason?: unknown) => void) | null = null;
	const promise = new Promise<DerivedRgbdSequenceBuildData>((resolve, reject) => {
		rejectPromise = reject;
		worker.onmessage = (event: MessageEvent<PrepareDerivedRgbdSequenceWorkerMessage>) => {
			const message = event.data;
			if (message.type === 'progress') {
				options.onProgress?.(message.progress);
				return;
			}

			settled = true;
			worker.terminate();
			if (message.type === 'result') {
				resolve(message.buildData);
				return;
			}

			reject(new Error(message.message));
		};

		worker.onerror = (event) => {
			if (settled) return;
			settled = true;
			worker.terminate();
			reject(event.error instanceof Error ? event.error : new Error('Derived RGBD worker failed.'));
		};

		worker.postMessage({
			type: 'build',
			asset: cloneDerivedAsset(options.asset),
			raster: cloneRasterSource(options.raster),
			depthMap: options.depthMap ? cloneDepthMap(options.depthMap) : undefined,
		} satisfies PrepareDerivedRgbdSequenceWorkerRequest);
	});

	return {
		promise,
		cancel: () => {
			if (settled) return;
			settled = true;
			worker.terminate();
			rejectPromise?.(new Error('Derived RGBD build cancelled.'));
		},
	};
}

function cloneDerivedAsset(asset: DemoDerivedRgbdSequenceAsset): DemoDerivedRgbdSequenceAsset {
	return {
		kind: 'rgbd-sequence',
		source: 'derived-image',
		id: asset.id,
		label: asset.label,
		description: asset.description,
		imageAssetId: asset.imageAssetId,
		frameCount: asset.frameCount,
		fps: asset.fps,
		useBackgroundRemoval: asset.useBackgroundRemoval,
		useEstimatedDepth: asset.useEstimatedDepth,
		depthModelIndex: asset.depthModelIndex,
		motion: {
			parallaxPixels: asset.motion.parallaxPixels,
			verticalPixels: asset.motion.verticalPixels,
			depthDrift: asset.motion.depthDrift,
			alphaCutoff: asset.motion.alphaCutoff,
		},
		initialClipId: asset.initialClipId,
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
