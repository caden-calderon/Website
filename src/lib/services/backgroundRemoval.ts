import {
	BG_REMOVAL_MODELS,
	removeImageBackground as removeImageBackgroundInBrowser,
	type BackgroundRemovalResult,
	type BgRemovalModelInfo,
} from '$lib/engine/preprocessing/BackgroundRemoval.js';
import {
	MAX_SERVER_BG_UPLOAD_BYTES,
	MAX_SERVER_BG_UPLOAD_EDGE,
	SERVER_BG_UPLOAD_MIME_TYPE,
	SERVER_BG_UPLOAD_QUALITY,
} from '$lib/services/backgroundRemoval.shared.js';

export type BgRemovalProvider = 'browser' | 'server';

export interface ServerBgRemovalModelInfo {
	id: string;
	label: string;
	description: string;
	size: string;
}

export const SERVER_BG_REMOVAL_MODELS: ServerBgRemovalModelInfo[] = [
	{
		id: 'bria-rmbg-2.0',
		label: 'BRIA RMBG 2.0',
		description: 'Highest-quality matte path on Linux via the Python service. Non-commercial license.',
		size: '~1.1GB',
	},
	{
		id: 'birefnet',
		label: 'BiRefNet',
		description: 'Sharp edges and strong fine-detail extraction via the Python service.',
		size: '~800MB',
	},
];

export interface RemoveBackgroundWithProviderOptions {
	provider: BgRemovalProvider;
	browserModelIndex?: number;
	serverModelId?: string;
	onProgress?: (progress: number) => void;
}

export function getBackgroundRemovalCacheKey(
	provider: BgRemovalProvider,
	browserModelIndex: number,
	serverModelId: string,
): string {
	return provider === 'server' ? `server:${serverModelId}` : `browser:${browserModelIndex}`;
}

export function getServerBgRemovalModel(modelId: string): ServerBgRemovalModelInfo | undefined {
	return SERVER_BG_REMOVAL_MODELS.find((model) => model.id === modelId);
}

export function getBrowserBgRemovalModel(modelIndex: number): BgRemovalModelInfo | undefined {
	return BG_REMOVAL_MODELS[modelIndex];
}

export async function removeImageBackgroundWithProvider(
	source: HTMLImageElement,
	options: RemoveBackgroundWithProviderOptions,
): Promise<BackgroundRemovalResult> {
	if (options.provider === 'server') {
		return removeImageBackgroundViaServer(source, options.serverModelId ?? SERVER_BG_REMOVAL_MODELS[0].id);
	}

	return removeImageBackgroundInBrowser(source, {
		modelIndex: options.browserModelIndex ?? 0,
		onProgress: options.onProgress,
	});
}

async function removeImageBackgroundViaServer(
	source: HTMLImageElement,
	modelId: string,
): Promise<BackgroundRemovalResult> {
	const formData = new FormData();
	formData.set('file', await serializeImageForServer(source), 'source.jpg');
	formData.set('modelId', modelId);

	const response = await fetch('/api/bg-remove', {
		method: 'POST',
		body: formData,
	});

	if (!response.ok) {
		throw new Error(await readErrorMessage(response));
	}

	const blob = await response.blob();
	const image = await blobToImage(blob);
	const resolvedModelId = response.headers.get('x-chromatic-model-id') ?? modelId;

	return {
		image,
		blob,
		modelId: resolvedModelId,
	};
}

async function serializeImageForServer(source: HTMLImageElement): Promise<Blob> {
	const { width, height } = getServerUploadDimensions(source);
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;

	const context = canvas.getContext('2d');
	if (!context) {
		throw new Error('Failed to create a 2D canvas context for server-side BG removal');
	}

	// The Python service converts inputs to RGB and resizes to 1024 anyway,
	// so a bounded JPEG upload keeps requests fast and under the app upload cap.
	context.drawImage(source, 0, 0, width, height);

	const blob = await canvasToBlob(canvas, SERVER_BG_UPLOAD_MIME_TYPE, SERVER_BG_UPLOAD_QUALITY);
	if (blob.size > MAX_SERVER_BG_UPLOAD_BYTES) {
		throw new Error(`Image exceeds ${MAX_SERVER_BG_UPLOAD_BYTES / (1024 * 1024)}MB upload limit after compression`);
	}

	return blob;
}

async function blobToImage(blob: Blob): Promise<HTMLImageElement> {
	const objectUrl = URL.createObjectURL(blob);
	const image = new Image();

	return new Promise<HTMLImageElement>((resolve, reject) => {
		image.onload = () => {
			URL.revokeObjectURL(objectUrl);
			resolve(image);
		};
		image.onerror = () => {
			URL.revokeObjectURL(objectUrl);
			reject(new Error('Failed to decode background removal result'));
		};
		image.src = objectUrl;
	});
}

function getServerUploadDimensions(source: HTMLImageElement): { width: number; height: number } {
	const sourceWidth = source.naturalWidth || source.width;
	const sourceHeight = source.naturalHeight || source.height;
	const longestEdge = Math.max(sourceWidth, sourceHeight, 1);
	const scale = Math.min(1, MAX_SERVER_BG_UPLOAD_EDGE / longestEdge);

	return {
		width: Math.max(1, Math.round(sourceWidth * scale)),
		height: Math.max(1, Math.round(sourceHeight * scale)),
	};
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
	return new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
			type,
			quality,
		);
	});
}

export async function readErrorMessage(response: Response): Promise<string> {
	const text = await response.text();
	if (!text) {
		return `Background removal request failed (${response.status})`;
	}

	const contentType = response.headers.get('content-type') ?? '';
	if (contentType.includes('application/json')) {
		try {
			const payload = JSON.parse(text) as { error?: string; detail?: string };
			if (payload.error) return payload.error;
			if (payload.detail) return payload.detail;
		} catch {
			// Fall through to raw text when upstream sent invalid JSON.
		}
	}

	return text;
}
