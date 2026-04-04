/// <reference lib="webworker" />

import type { DepthMap, EstimateDepthOptions } from './DepthEstimation.js';
import { estimateDepthFromBitmap } from './DepthEstimation.js';

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

self.onmessage = async (event: MessageEvent<DepthEstimationWorkerRequest>) => {
	if (event.data.type !== 'estimate') {
		return;
	}

	try {
		const depthMap = await estimateDepthFromBitmap(event.data.bitmap, {
			modelIndex: event.data.options.modelIndex,
			onProgress: (status) => {
				self.postMessage({
					type: 'progress',
					status,
				} satisfies DepthEstimationWorkerProgressMessage);
			},
		} satisfies EstimateDepthOptions);

		self.postMessage(
			{
				type: 'result',
				depthMap,
			} satisfies DepthEstimationWorkerResultMessage,
			[depthMap.data.buffer],
		);
	} catch (error) {
		self.postMessage({
			type: 'error',
			message: error instanceof Error ? error.message : 'Depth estimation failed.',
		} satisfies DepthEstimationWorkerErrorMessage);
	}
};

export {};
