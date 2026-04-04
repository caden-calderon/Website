/**
 * Browser-side monocular depth estimation using Transformers.js.
 *
 * Supports multiple models — downloaded on first use, cached in browser
 * via Cache API. The module is lazy-loaded so the main bundle stays small.
 */

import { blobToDataUrl, encodeCanvasImageToBlob } from '$lib/browser/imageEncoding.js';
import { encodeHtmlImageInWorker } from '$lib/browser/imageEncodingClient.js';
import { estimateDepthInWorker } from './depthEstimationClient.js';

type QuantDtype = 'q8' | 'fp16' | 'fp32' | 'q4' | 'q4f16' | 'int8' | 'uint8' | 'auto';

export interface DepthModelInfo {
	id: string;
	label: string;
	description: string;
	size: string;
	dtype: QuantDtype;
}

/** Available depth estimation models, ordered by size/speed. */
export const DEPTH_MODELS: DepthModelInfo[] = [
	{
		id: 'onnx-community/depth-anything-v2-small',
		label: 'DA V2 Small',
		description: 'Fast, good quality. Best for iteration.',
		size: '~27MB',
		dtype: 'q8',
	},
	{
		id: 'onnx-community/depth-anything-v2-small',
		label: 'DA V2 Small (fp16)',
		description: 'Higher precision small model.',
		size: '~50MB',
		dtype: 'fp16',
	},
	{
		id: 'onnx-community/depth-anything-v2-base',
		label: 'DA V2 Base',
		description: 'More detail, better edges. Slower.',
		size: '~102MB',
		dtype: 'q8',
	},
	{
		id: 'onnx-community/depth-anything-v2-base',
		label: 'DA V2 Base (fp16)',
		description: 'Highest quality available. Large download.',
		size: '~195MB',
		dtype: 'fp16',
	},
	{
		id: 'Xenova/dpt-hybrid-midas',
		label: 'MiDaS DPT-Hybrid',
		description: 'Classic depth model. Different characteristics.',
		size: '~500MB',
		dtype: 'fp32',
	},
	{
		id: 'Xenova/depth-anything-small-hf',
		label: 'DA V1 Small',
		description: 'Original Depth Anything. Compare against V2.',
		size: '~99MB',
		dtype: 'fp32',
	},
];

// Cache pipelines by model+dtype key
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pipelineCache = new Map<string, any>();

function cacheKey(modelId: string, dtype: string): string {
	return `${modelId}::${dtype}`;
}

import { getPreferredDevice, withTimeout, type OnnxDevice } from './webgpu-probe.js';

async function getDepthPipeline(modelId: string, dtype: string, device: OnnxDevice) {
	const key = `${cacheKey(modelId, dtype)}::${device}`;
	if (pipelineCache.has(key)) return pipelineCache.get(key);

	const { pipeline, env } = await import('@huggingface/transformers');

	// Fix SSR contamination: SvelteKit evaluates this server-side where
	// Cache API doesn't exist, setting useBrowserCache to false permanently.
	env.useBrowserCache = true;
	env.useFSCache = false;

	// Set WASM threads based on crossOriginIsolated (SharedArrayBuffer availability)
	if (device === 'wasm') {
		env.backends.onnx.wasm!.numThreads = self.crossOriginIsolated ? navigator.hardwareConcurrency : 1;
	}

	const instance = await pipeline('depth-estimation', modelId, {
		dtype: dtype as 'q8' | 'fp16' | 'fp32',
		device,
	});

	pipelineCache.set(key, instance);
	return instance;
}

type DepthSource = HTMLImageElement | ImageBitmap;

function isHtmlImageElement(source: DepthSource): source is HTMLImageElement {
	return typeof HTMLImageElement !== 'undefined' && source instanceof HTMLImageElement;
}

/** Convert an image element or bitmap to an opaque data URL (depth models can't handle alpha). */
async function sourceToDataUrl(source: DepthSource): Promise<string> {
	if (isHtmlImageElement(source)) {
		try {
			const encoded = await encodeHtmlImageInWorker(source, {
				mimeType: 'image/jpeg',
				quality: 0.95,
				backgroundColor: [0, 0, 0],
			});
			return blobToDataUrl(encoded.blob);
		} catch {
			// Fall through to local canvas encoding.
		}
	}

	const encoded = await encodeCanvasImageToBlob(source, {
		mimeType: 'image/jpeg',
		quality: 0.95,
		backgroundColor: [0, 0, 0],
	});
	return blobToDataUrl(encoded.blob);
}

export interface DepthMap {
	/** Per-pixel depth values normalised to 0–1. Row-major, [y * width + x]. */
	data: Float32Array;
	width: number;
	height: number;
	/** Which model produced this depth map */
	modelId: string;
}

export interface EstimateDepthOptions {
	/** Model index from DEPTH_MODELS array (default 0 = DA V2 Small q8) */
	modelIndex?: number;
	/** Progress callback */
	onProgress?: (status: string) => void;
}

async function estimateDepthOnCurrentThread(
	source: DepthSource,
	options: EstimateDepthOptions = {},
): Promise<DepthMap> {
	const modelIdx = options.modelIndex ?? 0;
	const model = DEPTH_MODELS[modelIdx];
	if (!model) throw new Error(`Invalid model index: ${modelIdx}`);

	options.onProgress?.(`Loading ${model.label} (${model.size})...`);

	const preferred = await getPreferredDevice();

	async function run(device: OnnxDevice) {
		const estimator = await getDepthPipeline(model.id, model.dtype, device);
		const dataUrl = await sourceToDataUrl(source);
		options.onProgress?.(`Running ${model.label} (${device})...`);
		const timeoutMs = device === 'webgpu' ? 30_000 : 120_000;
		return withTimeout(estimator(dataUrl), timeoutMs, `Depth estimation (${device})`);
	}

	// Device fallback chain: preferred → wasm
	const fallbackChain: OnnxDevice[] = [preferred];
	if (preferred !== 'wasm') fallbackChain.push('wasm');

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let result: any;
	for (let i = 0; i < fallbackChain.length; i++) {
		const device = fallbackChain[i];
		try {
			result = await run(device);
			break;
		} catch (error) {
			pipelineCache.delete(`${cacheKey(model.id, model.dtype)}::${device}`);
			const isLast = i === fallbackChain.length - 1;
			if (isLast) throw error;
			console.warn(`Depth estimation failed on ${device} for ${model.label}, trying next backend.`, error);
			options.onProgress?.(`Retrying ${model.label}...`);
		}
	}
	const depthImage = result.predicted_depth;
	const { dims, data: rawData } = depthImage;

	const height = dims[0];
	const width = dims[1];
	const pixels = rawData instanceof Float32Array ? rawData : new Float32Array(rawData);

	// Normalise to 0–1
	let min = Infinity;
	let max = -Infinity;
	for (let i = 0; i < pixels.length; i++) {
		if (pixels[i] < min) min = pixels[i];
		if (pixels[i] > max) max = pixels[i];
	}

	const range = max - min || 1;
	const normalised = new Float32Array(pixels.length);
	for (let i = 0; i < pixels.length; i++) {
		normalised[i] = (pixels[i] - min) / range;
	}

	return { data: normalised, width, height, modelId: model.id };
}

export function canUseDepthEstimationWorker(): boolean {
	return typeof Worker !== 'undefined'
		&& typeof createImageBitmap === 'function'
		&& typeof OffscreenCanvas !== 'undefined';
}

export async function estimateDepthFromBitmap(
	source: ImageBitmap,
	options: EstimateDepthOptions = {},
): Promise<DepthMap> {
	return estimateDepthOnCurrentThread(source, options);
}

/**
 * Estimate a depth map from a source image.
 * Returns normalised 0–1 depth values where 0 = farthest, 1 = closest.
 */
export async function estimateDepth(
	source: HTMLImageElement,
	options: EstimateDepthOptions = {},
): Promise<DepthMap> {
	if (canUseDepthEstimationWorker()) {
		try {
			return await estimateDepthInWorker(source, options);
		} catch (error) {
			console.warn('Depth-estimation worker failed; retrying on the main thread.', error);
		}
	}

	return estimateDepthOnCurrentThread(source, options);
}

/**
 * Compute approximate surface normals from a depth map via gradients.
 */
export function depthToNormals(depth: DepthMap, strength: number = 1.0): Float32Array {
	const { data, width, height } = depth;
	const normals = new Float32Array(width * height * 3);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const idx = y * width + x;

			const dLeft = x > 0 ? data[idx - 1] : data[idx];
			const dRight = x < width - 1 ? data[idx + 1] : data[idx];
			const dUp = y > 0 ? data[idx - width] : data[idx];
			const dDown = y < height - 1 ? data[idx + width] : data[idx];

			const dx = (dRight - dLeft) * strength;
			const dy = (dDown - dUp) * strength;

			const len = Math.sqrt(dx * dx + dy * dy + 1.0);
			const i3 = idx * 3;
			normals[i3] = -dx / len;
			normals[i3 + 1] = -dy / len;
			normals[i3 + 2] = 1.0 / len;
		}
	}

	return normals;
}
