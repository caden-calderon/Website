/**
 * Browser-side background removal with multiple model options.
 *
 * Supports @imgly/background-removal (ISNet, fast/small) and
 * Transformers.js models (BiRefNet Lite, BEN2 — higher quality).
 * Models are downloaded on first use, cached in browser.
 */

import {
	blobToDataUrl,
	blobToHtmlImage,
	canvasToBlob,
	createCanvas2d,
	encodeCanvasImageToBlob,
} from '$lib/browser/imageEncoding.js';
import { encodeHtmlImageInWorker } from '$lib/browser/imageEncodingClient.js';
import { removeImageBackgroundInWorker } from './backgroundRemovalClient.js';

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

type BackgroundRemovalSource = HTMLImageElement | ImageBitmap;

function isHtmlImageElement(source: BackgroundRemovalSource): source is HTMLImageElement {
	return typeof HTMLImageElement !== 'undefined' && source instanceof HTMLImageElement;
}

/** Convert the input source to a PNG blob. */
async function sourceToBlob(source: BackgroundRemovalSource): Promise<Blob> {
	if (isHtmlImageElement(source)) {
		try {
			const encoded = await encodeHtmlImageInWorker(source, {
				mimeType: 'image/png',
			});
			return encoded.blob;
		} catch {
			// Fall through to local canvas encoding.
		}
	}

	return (await encodeCanvasImageToBlob(source, {
		mimeType: 'image/png',
	})).blob;
}

async function sourceToDataUrl(source: BackgroundRemovalSource): Promise<string> {
	return blobToDataUrl(await sourceToBlob(source));
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
	source: BackgroundRemovalSource,
	mask: RawImageLike,
): Promise<Blob> {
	const width = mask.width;
	const height = mask.height;
	const { canvas, context } = createCanvas2d(width, height);

	context.drawImage(source, 0, 0, width, height);
	const sourceImageData = context.getImageData(0, 0, width, height);
	sourceImageData.data.set(applyAlphaMaskToImageData(sourceImageData.data, mask.data));
	context.putImageData(sourceImageData, 0, 0);

	return canvasToBlob(canvas, 'image/png');
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
		env.remoteHost = `${getRuntimeOrigin()}/api/hf-proxy/`;
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
	source: BackgroundRemovalSource,
	modelId: string = 'isnet',
	onProgress?: (progress: number) => void,
): Promise<BackgroundRemovalBlobResult> {
	const { removeBackground } = await import('@imgly/background-removal');
	const inputBlob = await sourceToBlob(source);

	const resultBlob = await removeBackground(inputBlob, {
		model: modelId as 'isnet' | 'isnet_fp16' | 'isnet_quint8',
		progress: onProgress
			? (key: string, current: number, total: number) => {
					onProgress(total > 0 ? current / total : 0);
				}
			: undefined,
	});

	return { blob: resultBlob, modelId };
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
	// RawImage has width, height, channels, data properties
	const width = rawImage.width;
	const height = rawImage.height;
	const { canvas, context } = createCanvas2d(width, height);

	// If toCanvas exists, use it
	if (typeof rawImage.toCanvas === 'function') {
		const sourceCanvas = rawImage.toCanvas();
		context.drawImage(sourceCanvas, 0, 0);
	} else {
		// Manual pixel copy from RawImage data
		const channels = rawImage.channels ?? 4;
		const data = rawImage.data;
		const imageData = context.createImageData(width, height);
		for (let i = 0; i < width * height; i++) {
			const srcIdx = i * channels;
			const dstIdx = i * 4;
			imageData.data[dstIdx] = data[srcIdx];         // R
			imageData.data[dstIdx + 1] = channels > 1 ? data[srcIdx + 1] : data[srcIdx]; // G
			imageData.data[dstIdx + 2] = channels > 2 ? data[srcIdx + 2] : data[srcIdx]; // B
			imageData.data[dstIdx + 3] = channels > 3 ? data[srcIdx + 3] : 255;          // A
		}
		context.putImageData(imageData, 0, 0);
	}

	return canvasToBlob(canvas, 'image/png');
}

/**
 * Remove background using Transformers.js background-removal pipeline.
 */
async function removeWithTransformers(
	source: BackgroundRemovalSource,
	modelId: string,
	dtype: string = 'auto',
	gated: boolean = false,
): Promise<BackgroundRemovalBlobResult> {
	const dataUrl = await sourceToDataUrl(source);
	const run = async (device: OnnxDevice): Promise<BackgroundRemovalBlobResult> => {
		const segmenter = await getBackgroundRemovalPipeline(modelId, device, dtype, gated);
		const timeoutMs = device === 'webgpu' ? 30_000 : 120_000;
		const output = await withTimeout(segmenter(dataUrl), timeoutMs, `BG removal (${device})`);
		const rawImage = (Array.isArray(output) ? output[0] : output) as RawImageLike;
		const blob =
			rawImage.channels === 1
				? await createTransparentForegroundBlob(source, rawImage)
				: await rawImageToBlob(rawImage);

		return { blob, modelId };
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

export interface BackgroundRemovalBlobResult {
	blob: Blob;
	modelId: string;
	usedFallback?: boolean;
}

async function removeImageBackgroundOnCurrentThread(
	source: BackgroundRemovalSource,
	options: RemoveBackgroundOptions = {},
): Promise<BackgroundRemovalBlobResult> {
	const modelIdx = options.modelIndex ?? 0;
	const model = BG_REMOVAL_MODELS[modelIdx];
	if (!model) throw new Error(`Invalid BG removal model index: ${modelIdx}`);

	if (model.backend === 'imgly') {
		return removeWithImgly(source, model.id, options.onProgress);
	}

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

export function canUseBackgroundRemovalWorker(): boolean {
	return typeof Worker !== 'undefined'
		&& typeof createImageBitmap === 'function'
		&& typeof OffscreenCanvas !== 'undefined';
}

export async function removeImageBackgroundFromBitmap(
	source: ImageBitmap,
	options: RemoveBackgroundOptions = {},
): Promise<BackgroundRemovalBlobResult> {
	return removeImageBackgroundOnCurrentThread(source, options);
}

/**
 * Remove the background from an image using the selected model.
 */
export async function removeImageBackground(
	source: HTMLImageElement,
	options: RemoveBackgroundOptions = {},
): Promise<BackgroundRemovalResult> {
	if (canUseBackgroundRemovalWorker()) {
		try {
			return await removeImageBackgroundInWorker(source, options);
		} catch (error) {
			console.warn('Background removal worker failed; retrying on the main thread.', error);
		}
	}

	const result = await removeImageBackgroundOnCurrentThread(source, options);
	return {
		...result,
		image: await blobToHtmlImage(result.blob),
	};
}

function isFirefox(): boolean {
	return typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);
}

function getRuntimeOrigin(): string {
	const origin = globalThis.location?.origin;
	if (!origin) {
		throw new Error('Runtime origin is unavailable for gated background-removal models.');
	}
	return origin;
}
