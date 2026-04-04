/// <reference lib="webworker" />

import type {
	BackgroundRemovalBlobResult,
	RemoveBackgroundOptions,
} from './BackgroundRemoval.js';
import { removeImageBackgroundFromBitmap } from './BackgroundRemoval.js';

interface BackgroundRemovalWorkerRequest {
	type: 'remove';
	bitmap: ImageBitmap;
	options: {
		modelIndex?: number;
	};
}

interface BackgroundRemovalWorkerProgressMessage {
	type: 'progress';
	progress: number;
}

interface BackgroundRemovalWorkerResultMessage {
	type: 'result';
	result: BackgroundRemovalBlobResult;
}

interface BackgroundRemovalWorkerErrorMessage {
	type: 'error';
	message: string;
}

self.onmessage = async (event: MessageEvent<BackgroundRemovalWorkerRequest>) => {
	if (event.data.type !== 'remove') {
		return;
	}

	try {
		const result = await removeImageBackgroundFromBitmap(event.data.bitmap, {
			modelIndex: event.data.options.modelIndex,
			onProgress: (progress) => {
				self.postMessage({
					type: 'progress',
					progress,
				} satisfies BackgroundRemovalWorkerProgressMessage);
			},
		} satisfies RemoveBackgroundOptions);

		self.postMessage({
			type: 'result',
			result,
		} satisfies BackgroundRemovalWorkerResultMessage);
	} catch (error) {
		self.postMessage({
			type: 'error',
			message: error instanceof Error ? error.message : 'Background removal failed.',
		} satisfies BackgroundRemovalWorkerErrorMessage);
	}
};

export {};
