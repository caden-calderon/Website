import type { PreparedRgbdSequencePreparedData, RgbdSequencePreparationProgress, RgbdSequenceSamplingSettings } from './rgbdSequencePlayback.js';
import type { RgbdSequenceFrameData } from './rgbdSequenceSources.js';

interface PrepareRgbdSequenceWorkerRequest {
	type: 'prepare';
	rawFrames: readonly RgbdSequenceFrameData[];
	sampling: RgbdSequenceSamplingSettings;
	fetchMs: number;
}

interface PrepareRgbdSequenceWorkerProgressMessage {
	type: 'progress';
	progress: RgbdSequencePreparationProgress;
}

interface PrepareRgbdSequenceWorkerResultMessage {
	type: 'result';
	preparedData: PreparedRgbdSequencePreparedData;
}

interface PrepareRgbdSequenceWorkerErrorMessage {
	type: 'error';
	message: string;
}

type PrepareRgbdSequenceWorkerMessage =
	| PrepareRgbdSequenceWorkerProgressMessage
	| PrepareRgbdSequenceWorkerResultMessage
	| PrepareRgbdSequenceWorkerErrorMessage;

export interface RgbdSequencePreparationTask {
	promise: Promise<PreparedRgbdSequencePreparedData>;
	cancel: () => void;
}

export function prepareRgbdSequenceDataInWorker(options: {
	rawFrames: readonly RgbdSequenceFrameData[];
	sampling: RgbdSequenceSamplingSettings;
	fetchMs: number;
	onProgress?: (progress: RgbdSequencePreparationProgress) => void;
}): RgbdSequencePreparationTask {
	const worker = new Worker(new URL('./rgbdSequencePrep.worker.ts', import.meta.url), { type: 'module' });

	let settled = false;
	let rejectPromise: ((reason?: unknown) => void) | null = null;
	const promise = new Promise<PreparedRgbdSequencePreparedData>((resolve, reject) => {
		rejectPromise = reject;
		worker.onmessage = (event: MessageEvent<PrepareRgbdSequenceWorkerMessage>) => {
			const message = event.data;
			if (message.type === 'progress') {
				options.onProgress?.(message.progress);
				return;
			}

			settled = true;
			worker.terminate();
			if (message.type === 'result') {
				resolve(message.preparedData);
				return;
			}

			reject(new Error(message.message));
		};

		worker.onerror = (event) => {
			if (settled) return;
			settled = true;
			worker.terminate();
			reject(event.error instanceof Error ? event.error : new Error('RGBD sequence worker failed.'));
		};

		const clonedFrames = options.rawFrames.map(cloneRgbdSequenceFrameData);
		const clonedSampling = cloneRgbdSequenceSamplingSettings(options.sampling);
		worker.postMessage({
			type: 'prepare',
			rawFrames: clonedFrames,
			sampling: clonedSampling,
			fetchMs: options.fetchMs,
		} satisfies PrepareRgbdSequenceWorkerRequest);
	});

	return {
		promise,
		cancel: () => {
			if (settled) return;
			settled = true;
			worker.terminate();
			rejectPromise?.(new Error('RGBD sequence preparation cancelled.'));
		},
	};
}

function cloneRgbdSequenceFrameData(frame: RgbdSequenceFrameData): RgbdSequenceFrameData {
	return {
		raster: {
			width: frame.raster.width,
			height: frame.raster.height,
			pixels: new Uint8ClampedArray(frame.raster.pixels),
		},
		depthMap: frame.depthMap
			? {
				data: new Float32Array(frame.depthMap.data),
				width: frame.depthMap.width,
				height: frame.depthMap.height,
				modelId: frame.depthMap.modelId,
			}
			: undefined,
		sourceBytes: {
			color: frame.sourceBytes.color,
			depth: frame.sourceBytes.depth,
		},
	};
}

function cloneRgbdSequenceSamplingSettings(
	sampling: RgbdSequenceSamplingSettings,
): RgbdSequenceSamplingSettings {
	return {
		sampleCount: sampling.sampleCount,
		algorithm: sampling.algorithm,
		depthScale: sampling.depthScale,
		densityGamma: sampling.densityGamma,
		radiusFromLuminance: sampling.radiusFromLuminance,
		sizeVariation: sampling.sizeVariation,
		outlierRadius: sampling.outlierRadius,
		normalDisplacement: sampling.normalDisplacement,
		alphaCutoff: sampling.alphaCutoff,
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
