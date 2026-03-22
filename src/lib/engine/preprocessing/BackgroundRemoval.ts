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
		id: 'onnx-community/BEN2-ONNX',
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
): Promise<BackgroundRemovalResult> {
	const key = `bg::${modelId}`;

	if (!pipelineCache.has(key)) {
		const { pipeline, env } = await import('@huggingface/transformers');

		// Fix SSR contamination
		env.useBrowserCache = true;
		env.useFSCache = false;

		const instance = await pipeline('background-removal', modelId, {
			dtype: 'fp16',
			device: typeof navigator !== 'undefined' && 'gpu' in navigator ? 'webgpu' : 'wasm',
		});
		pipelineCache.set(key, instance);
	}

	const segmenter = pipelineCache.get(key);
	const dataUrl = imageToDataUrl(source);

	const output = await segmenter(dataUrl);
	const blob = await rawImageToBlob(output);

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
