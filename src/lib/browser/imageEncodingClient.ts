import type {
	EncodeImageBitmapOptions,
	EncodedImageBitmapResult,
} from './imageEncoding.js';

interface EncodeImageWorkerRequest {
	type: 'encode';
	bitmap: ImageBitmap;
	options: EncodeImageBitmapOptions;
}

interface EncodeImageWorkerResultMessage {
	type: 'result';
	result: EncodedImageBitmapResult;
}

interface EncodeImageWorkerErrorMessage {
	type: 'error';
	message: string;
}

type EncodeImageWorkerMessage = EncodeImageWorkerResultMessage | EncodeImageWorkerErrorMessage;

export async function encodeHtmlImageInWorker(
	source: HTMLImageElement,
	options: EncodeImageBitmapOptions,
): Promise<EncodedImageBitmapResult> {
	if (typeof Worker === 'undefined' || typeof createImageBitmap !== 'function') {
		throw new Error('Worker image encoding is unavailable.');
	}

	const bitmap = await createImageBitmap(source);
	const worker = new Worker(new URL('./imageEncoding.worker.ts', import.meta.url), { type: 'module' });

	return new Promise<EncodedImageBitmapResult>((resolve, reject) => {
		worker.onmessage = (event: MessageEvent<EncodeImageWorkerMessage>) => {
			worker.terminate();
			if (event.data.type === 'result') {
				resolve(event.data.result);
				return;
			}
			reject(new Error(event.data.message));
		};

		worker.onerror = (event) => {
			worker.terminate();
			reject(event.error instanceof Error ? event.error : new Error('Image encoding worker failed.'));
		};

		worker.postMessage(
			{
				type: 'encode',
				bitmap,
				options: {
					mimeType: options.mimeType,
					quality: options.quality,
					maxEdge: options.maxEdge,
					backgroundColor: options.backgroundColor ?? undefined,
				},
			} satisfies EncodeImageWorkerRequest,
			[bitmap],
		);
	});
}
