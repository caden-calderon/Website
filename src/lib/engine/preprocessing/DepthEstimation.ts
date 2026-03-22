/**
 * Browser-side monocular depth estimation using Transformers.js.
 *
 * Supports multiple models — downloaded on first use, cached in browser
 * via Cache API. The module is lazy-loaded so the main bundle stays small.
 */

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

async function getDepthPipeline(modelId: string, dtype: string) {
	const key = cacheKey(modelId, dtype);
	if (pipelineCache.has(key)) return pipelineCache.get(key);

	const { pipeline, env } = await import('@huggingface/transformers');

	// Fix SSR contamination: SvelteKit evaluates this server-side where
	// Cache API doesn't exist, setting useBrowserCache to false permanently.
	env.useBrowserCache = true;
	env.useFSCache = false;

	const instance = await pipeline('depth-estimation', modelId, {
		dtype: dtype as 'q8' | 'fp16' | 'fp32',
		device: typeof navigator !== 'undefined' && 'gpu' in navigator ? 'webgpu' : 'wasm',
	});

	pipelineCache.set(key, instance);
	return instance;
}

/** Convert an image element to a data URL (survives revoked blob URLs). */
function imageToDataUrl(img: HTMLImageElement): string {
	const canvas = document.createElement('canvas');
	canvas.width = img.naturalWidth || img.width;
	canvas.height = img.naturalHeight || img.height;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Failed to get canvas context');
	ctx.drawImage(img, 0, 0);
	return canvas.toDataURL('image/png');
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

/**
 * Estimate a depth map from a source image.
 * Returns normalised 0–1 depth values where 0 = farthest, 1 = closest.
 */
export async function estimateDepth(
	source: HTMLImageElement,
	options: EstimateDepthOptions = {},
): Promise<DepthMap> {
	const modelIdx = options.modelIndex ?? 0;
	const model = DEPTH_MODELS[modelIdx];
	if (!model) throw new Error(`Invalid model index: ${modelIdx}`);

	options.onProgress?.(`Loading ${model.label} (${model.size})...`);

	const estimator = await getDepthPipeline(model.id, model.dtype);
	const dataUrl = imageToDataUrl(source);

	options.onProgress?.(`Running ${model.label}...`);

	const result = await estimator(dataUrl);
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
