/**
 * Browser-side background removal with multiple model options.
 *
 * Supports @imgly/background-removal (ISNet, fast/small) and
 * Transformers.js models (BiRefNet Lite, BEN2 — higher quality).
 * Models are downloaded on first use, cached in browser.
 */

export interface BgRemovalModelInfo {
	id: string;
	label: string;
	description: string;
	size: string;
	backend: 'imgly' | 'transformers';
	/** ONNX quantization dtype for transformers models (default 'auto') */
	dtype?: string;
	/** Whether this is a gated model requiring auth proxy */
	gated?: boolean;
}

/** Available background removal models, ordered by quality. */
export const BG_REMOVAL_MODELS: BgRemovalModelInfo[] = [
	{
		id: 'isnet_quint8',
		label: 'ISNet (fast)',
		description: 'Fastest, smallest download. Good for quick previews.',
		size: '~10MB',
		backend: 'imgly',
	},
	{
		id: 'isnet',
		label: 'ISNet',
		description: 'Standard quality. Good balance of speed and quality.',
		size: '~40MB',
		backend: 'imgly',
	},
	{
		id: 'isnet_fp16',
		label: 'ISNet (fp16)',
		description: 'Higher precision ISNet. Best quality without WebGPU.',
		size: '~20MB',
		backend: 'imgly',
	},
	{
		id: 'onnx-community/BiRefNet_lite-ONNX',
		label: 'BiRefNet Lite',
		description: 'Much better quality, fine details. Requires WebGPU.',
		size: '~115MB',
		backend: 'transformers',
	},
	{
		id: 'onnx-community/BEN2-ONNX',
		label: 'BEN2',
		description: 'Best edge quality. Hair, transparency. Requires WebGPU.',
		size: '~219MB',
		backend: 'transformers',
	},
	{
		id: 'onnx-community/BiRefNet-ONNX',
		label: 'BiRefNet Full',
		description: 'Highest quality BiRefNet. Requires WebGPU.',
		size: '~490MB',
		backend: 'transformers',
	},
];

/** Convert an image element to a Blob (survives revoked blob URLs). */
function imageToBlob(img: HTMLImageElement): Promise<Blob> {
	const canvas = document.createElement('canvas');
	canvas.width = img.naturalWidth || img.width;
	canvas.height = img.naturalHeight || img.height;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Failed to get canvas context');
	ctx.drawImage(img, 0, 0);
	return new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
			'image/png',
		);
	});
}

function imageToDataUrl(img: HTMLImageElement): string {
	const canvas = document.createElement('canvas');
	canvas.width = img.naturalWidth || img.width;
	canvas.height = img.naturalHeight || img.height;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Failed to get canvas context');
	ctx.drawImage(img, 0, 0);
	return canvas.toDataURL('image/png');
}

function blobToImage(blob: Blob): Promise<HTMLImageElement> {
	const url = URL.createObjectURL(blob);
	const img = new Image();
	return new Promise<HTMLImageElement>((resolve, reject) => {
		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve(img);
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Failed to load image from blob'));
		};
		img.src = url;
	});
}

export interface BackgroundRemovalResult {
	image: HTMLImageElement;
	blob: Blob;
	modelId: string;
	/** True if the requested model failed and a fallback was used */
	usedFallback?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pipelineCache = new Map<string, any>();

interface RawImageLike {
	width: number;
	height: number;
	channels?: number;
	data: Uint8Array | Uint8ClampedArray;
	toBlob?: () => Promise<Blob>;
	toCanvas?: () => HTMLCanvasElement | OffscreenCanvas;
}

export function applyAlphaMaskToImageData(
	imageData: Uint8ClampedArray,
	maskData: Uint8Array | Uint8ClampedArray,
): Uint8ClampedArray {
	const composited = new Uint8ClampedArray(imageData);
	const pixelCount = Math.min(maskData.length, Math.floor(composited.length / 4));

	for (let i = 0; i < pixelCount; i++) {
		composited[i * 4 + 3] = maskData[i];
	}

	return composited;
}

async function createTransparentForegroundBlob(
	source: HTMLImageElement,
	mask: RawImageLike,
): Promise<Blob> {
	const width = mask.width;
	const height = mask.height;
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Failed to get canvas context');

	ctx.drawImage(source, 0, 0, width, height);
	const sourceImageData = ctx.getImageData(0, 0, width, height);
	sourceImageData.data.set(applyAlphaMaskToImageData(sourceImageData.data, mask.data));
	ctx.putImageData(sourceImageData, 0, 0);

	return new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
			'image/png',
		);
	});
}

import { getPreferredDevice, withTimeout, type OnnxDevice } from './webgpu-probe.js';

async function getBackgroundRemovalPipeline(
	modelId: string,
	device: OnnxDevice,
	dtype: string = 'auto',
	gated: boolean = false,
) {
	const key = `bg::${modelId}::${device}`;
	if (pipelineCache.has(key)) {
		return pipelineCache.get(key);
	}

	const { pipeline, env } = await import('@huggingface/transformers');

	// Fix SSR contamination
	env.useBrowserCache = true;
	env.useFSCache = false;

	if (device === 'wasm') {
		env.backends.onnx.wasm!.numThreads = self.crossOriginIsolated ? navigator.hardwareConcurrency : 1;
	}

	// Route gated models through our server-side auth proxy
	const savedRemoteHost = env.remoteHost;
	if (gated) {
		env.remoteHost = `${window.location.origin}/api/hf-proxy/`;
	}

	let instance;
	try {
		instance = await pipeline('background-removal', modelId, {
			dtype: dtype as 'auto' | 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16',
			device,
		});
	} finally {
		// Restore original host so non-gated models still load directly
		if (gated) {
			env.remoteHost = savedRemoteHost;
		}
	}
	pipelineCache.set(key, instance);
	return instance;
}

/**
 * Remove background using the @imgly/background-removal library (ISNet variants).
 */
async function removeWithImgly(
	source: HTMLImageElement,
	modelId: string = 'isnet',
	onProgress?: (progress: number) => void,
): Promise<BackgroundRemovalResult> {
	const { removeBackground } = await import('@imgly/background-removal');
	const inputBlob = await imageToBlob(source);

	const resultBlob = await removeBackground(inputBlob, {
		model: modelId as 'isnet' | 'isnet_fp16' | 'isnet_quint8',
		progress: onProgress
			? (key: string, current: number, total: number) => {
					onProgress(total > 0 ? current / total : 0);
				}
			: undefined,
	});

	const img = await blobToImage(resultBlob);
	return { image: img, blob: resultBlob, modelId };
}

/**
 * Convert a RawImage from transformers.js to a Blob via canvas.
 * Handles the case where toBlob() may not exist on RawImage.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function rawImageToBlob(rawImage: any): Promise<Blob> {
	// Try toBlob first (newer transformers.js versions)
	if (typeof rawImage.toBlob === 'function') {
		try {
			const blob = await rawImage.toBlob();
			if (blob) return blob;
		} catch {
			// Fall through to canvas approach
		}
	}

	// Fall back to canvas conversion
	const canvas = document.createElement('canvas');
	// RawImage has width, height, channels, data properties
	const width = rawImage.width;
	const height = rawImage.height;
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Failed to get canvas context');

	// If toCanvas exists, use it
	if (typeof rawImage.toCanvas === 'function') {
		const sourceCanvas = rawImage.toCanvas();
		ctx.drawImage(sourceCanvas, 0, 0);
	} else {
		// Manual pixel copy from RawImage data
		const channels = rawImage.channels ?? 4;
		const data = rawImage.data;
		const imageData = ctx.createImageData(width, height);
		for (let i = 0; i < width * height; i++) {
			const srcIdx = i * channels;
			const dstIdx = i * 4;
			imageData.data[dstIdx] = data[srcIdx];         // R
			imageData.data[dstIdx + 1] = channels > 1 ? data[srcIdx + 1] : data[srcIdx]; // G
			imageData.data[dstIdx + 2] = channels > 2 ? data[srcIdx + 2] : data[srcIdx]; // B
			imageData.data[dstIdx + 3] = channels > 3 ? data[srcIdx + 3] : 255;          // A
		}
		ctx.putImageData(imageData, 0, 0);
	}

	return new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
			'image/png',
		);
	});
}

/**
 * Remove background using Transformers.js background-removal pipeline.
 */
async function removeWithTransformers(
	source: HTMLImageElement,
	modelId: string,
	dtype: string = 'auto',
	gated: boolean = false,
): Promise<BackgroundRemovalResult> {
	const dataUrl = imageToDataUrl(source);
	const run = async (device: OnnxDevice): Promise<BackgroundRemovalResult> => {
		const segmenter = await getBackgroundRemovalPipeline(modelId, device, dtype, gated);
		const timeoutMs = device === 'webgpu' ? 30_000 : 120_000;
		const output = await withTimeout(segmenter(dataUrl), timeoutMs, `BG removal (${device})`);
		const rawImage = (Array.isArray(output) ? output[0] : output) as RawImageLike;
		const blob =
			rawImage.channels === 1
				? await createTransparentForegroundBlob(source, rawImage)
				: await rawImageToBlob(rawImage);

		const img = await blobToImage(blob);
		return { image: img, blob, modelId };
	};

	// Device fallback chain: preferred → wasm
	const preferred = await getPreferredDevice();
	const fallbackChain: OnnxDevice[] = [preferred];
	if (preferred !== 'wasm') fallbackChain.push('wasm');

	for (let i = 0; i < fallbackChain.length; i++) {
		const device = fallbackChain[i];
		try {
			return await run(device);
		} catch (error) {
			pipelineCache.delete(`bg::${modelId}::${device}`);
			const isLast = i === fallbackChain.length - 1;
			if (isLast) throw error;
			console.warn(`BG removal failed on ${device} for ${modelId}, trying next backend.`, error);
		}
	}

	throw new Error('All backends exhausted');
}

export interface RemoveBackgroundOptions {
	/** Model index from BG_REMOVAL_MODELS (default 0 = ISNet) */
	modelIndex?: number;
	/** Progress callback (only works for ISNet/imgly backend) */
	onProgress?: (progress: number) => void;
}

/**
 * Remove the background from an image using the selected model.
 */
export async function removeImageBackground(
	source: HTMLImageElement,
	options: RemoveBackgroundOptions = {},
): Promise<BackgroundRemovalResult> {
	const modelIdx = options.modelIndex ?? 0;
	const model = BG_REMOVAL_MODELS[modelIdx];
	if (!model) throw new Error(`Invalid BG removal model index: ${modelIdx}`);

	if (model.backend === 'imgly') {
		return removeWithImgly(source, model.id, options.onProgress);
	} else {
		if (isFirefox()) {
			console.warn(
				`Transformers background removal is unstable in Firefox for ${model.label}; falling back to ISNet.`,
			);
			const result = await removeWithImgly(source, 'isnet', options.onProgress);
			return { ...result, usedFallback: true };
		}

		try {
			return await removeWithTransformers(source, model.id, model.dtype, model.gated);
		} catch (error) {
			console.warn(
				`Transformers background removal failed for ${model.label}; falling back to ISNet.`,
				error,
			);
			const result = await removeWithImgly(source, 'isnet', options.onProgress);
			return { ...result, usedFallback: true };
		}
	}
}

function isFirefox(): boolean {
	return typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);
}
