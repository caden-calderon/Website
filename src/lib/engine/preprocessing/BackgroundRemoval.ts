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
}

/** Available background removal models, ordered by quality. */
export const BG_REMOVAL_MODELS: BgRemovalModelInfo[] = [
	{
		id: 'isnet',
		label: 'ISNet (fast)',
		description: 'Fastest, decent quality. Good for quick previews.',
		size: '~40MB',
		backend: 'imgly',
	},
	{
		id: 'onnx-community/BiRefNet_lite-ONNX',
		label: 'BiRefNet Lite',
		description: 'Much better quality, fine details. MIT license.',
		size: '~115MB',
		backend: 'transformers',
	},
	{
		id: 'PramaLLC/BEN2-ONNX',
		label: 'BEN2',
		description: 'Best edge quality. Hair, transparency. MIT license.',
		size: '~219MB',
		backend: 'transformers',
	},
	{
		id: 'onnx-community/BiRefNet-ONNX',
		label: 'BiRefNet Full',
		description: 'Highest quality BiRefNet. Very large download.',
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
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pipelineCache = new Map<string, any>();

/**
 * Remove background using the @imgly/background-removal library (ISNet).
 */
async function removeWithImgly(
	source: HTMLImageElement,
	onProgress?: (progress: number) => void,
): Promise<BackgroundRemovalResult> {
	const { removeBackground } = await import('@imgly/background-removal');
	const inputBlob = await imageToBlob(source);

	const resultBlob = await removeBackground(inputBlob, {
		progress: onProgress
			? (key: string, current: number, total: number) => {
					onProgress(total > 0 ? current / total : 0);
				}
			: undefined,
	});

	const img = await blobToImage(resultBlob);
	return { image: img, blob: resultBlob, modelId: 'isnet' };
}

/**
 * Remove background using Transformers.js background-removal pipeline.
 */
async function removeWithTransformers(
	source: HTMLImageElement,
	modelId: string,
): Promise<BackgroundRemovalResult> {
	const cacheKey = `bg::${modelId}`;

	if (!pipelineCache.has(cacheKey)) {
		const { pipeline, env } = await import('@huggingface/transformers');

		// Fix SSR contamination
		env.useBrowserCache = true;
		env.useFSCache = false;

		const instance = await pipeline('background-removal', modelId, {
			dtype: 'fp16',
			device: typeof navigator !== 'undefined' && 'gpu' in navigator ? 'webgpu' : 'wasm',
		});
		pipelineCache.set(cacheKey, instance);
	}

	const segmenter = pipelineCache.get(cacheKey);
	const dataUrl = imageToDataUrl(source);

	const output = await segmenter(dataUrl);
	const blob: Blob = await output.toBlob();

	const img = await blobToImage(blob);
	return { image: img, blob, modelId };
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
		return removeWithImgly(source, options.onProgress);
	} else {
		return removeWithTransformers(source, model.id);
	}
}
