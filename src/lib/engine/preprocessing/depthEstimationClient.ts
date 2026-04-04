import type { DepthMap, EstimateDepthOptions } from './DepthEstimation.js';

interface DepthEstimationWorkerRequest {
	type: 'estimate';
	bitmap: ImageBitmap;
	options: {
		modelIndex?: number;
	};
}

interface DepthEstimationWorkerProgressMessage {
	type: 'progress';
	status: string;
}

interface DepthEstimationWorkerResultMessage {
	type: 'result';
	depthMap: DepthMap;
}

interface DepthEstimationWorkerErrorMessage {
	type: 'error';
	message: string;
}

type DepthEstimationWorkerMessage =
	| DepthEstimationWorkerProgressMessage
	| DepthEstimationWorkerResultMessage
	| DepthEstimationWorkerErrorMessage;

export async function estimateDepthInWorker(
	source: HTMLImageElement,
	options: EstimateDepthOptions = {},
): Promise<DepthMap> {
	if (typeof Worker === 'undefined' || typeof createImageBitmap !== 'function') {
		throw new Error('Depth-estimation worker support is unavailable.');
	}

	const bitmap = await createImageBitmap(source);
	const worker = new Worker(new URL('./depthEstimation.worker.ts', import.meta.url), { type: 'module' });

	return new Promise<DepthMap>((resolve, reject) => {
		worker.onmessage = (event: MessageEvent<DepthEstimationWorkerMessage>) => {
			const message = event.data;
			if (message.type === 'progress') {
				options.onProgress?.(message.status);
				return;
			}

			worker.terminate();
			if (message.type === 'result') {
				resolve(message.depthMap);
				return;
			}

			reject(new Error(message.message));
		};

		worker.onerror = (event) => {
			worker.terminate();
			reject(event.error instanceof Error ? event.error : new Error('Depth-estimation worker failed.'));
		};

		worker.postMessage(
			{
				type: 'estimate',
				bitmap,
				options: {
					modelIndex: options.modelIndex,
				},
			} satisfies DepthEstimationWorkerRequest,
			[bitmap],
		);
	});
}
