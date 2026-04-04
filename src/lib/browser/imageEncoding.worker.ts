/// <reference lib="webworker" />

import {
	encodeImageBitmapToBlob,
	type EncodeImageBitmapOptions,
	type EncodedImageBitmapResult,
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

self.onmessage = async (event: MessageEvent<EncodeImageWorkerRequest>) => {
	if (event.data.type !== 'encode') {
		return;
	}

	try {
		const result = await encodeImageBitmapToBlob(event.data.bitmap, event.data.options);
		self.postMessage({
			type: 'result',
			result,
		} satisfies EncodeImageWorkerResultMessage);
	} catch (error) {
		self.postMessage({
			type: 'error',
			message: error instanceof Error ? error.message : 'Image encoding failed.',
		} satisfies EncodeImageWorkerErrorMessage);
	}
};

export {};
