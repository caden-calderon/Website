import { blobToHtmlImage } from '$lib/browser/imageEncoding.js';
import type {
	BackgroundRemovalBlobResult,
	BackgroundRemovalResult,
	RemoveBackgroundOptions,
} from './BackgroundRemoval.js';

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

type BackgroundRemovalWorkerMessage =
	| BackgroundRemovalWorkerProgressMessage
	| BackgroundRemovalWorkerResultMessage
	| BackgroundRemovalWorkerErrorMessage;

export async function removeImageBackgroundInWorker(
	source: HTMLImageElement,
	options: RemoveBackgroundOptions = {},
): Promise<BackgroundRemovalResult> {
	if (typeof Worker === 'undefined' || typeof createImageBitmap !== 'function') {
		throw new Error('Background-removal worker support is unavailable.');
	}

	const bitmap = await createImageBitmap(source);
	const worker = new Worker(new URL('./backgroundRemoval.worker.ts', import.meta.url), { type: 'module' });

	return new Promise<BackgroundRemovalResult>((resolve, reject) => {
		worker.onmessage = async (event: MessageEvent<BackgroundRemovalWorkerMessage>) => {
			const message = event.data;
			if (message.type === 'progress') {
				options.onProgress?.(message.progress);
				return;
			}

			worker.terminate();
			if (message.type === 'result') {
				try {
					resolve({
						...message.result,
						image: await blobToHtmlImage(message.result.blob),
					});
				} catch (error) {
					reject(error instanceof Error ? error : new Error('Failed to decode background-removal result.'));
				}
				return;
			}

			reject(new Error(message.message));
		};

		worker.onerror = (event) => {
			worker.terminate();
			reject(event.error instanceof Error ? event.error : new Error('Background-removal worker failed.'));
		};

		worker.postMessage(
			{
				type: 'remove',
				bitmap,
				options: {
					modelIndex: options.modelIndex,
				},
			} satisfies BackgroundRemovalWorkerRequest,
			[bitmap],
		);
	});
}
