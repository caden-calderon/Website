/**
 * Browser-side monocular depth estimation using Transformers.js
 * with the Depth Anything V2 Small model.
 *
 * Models are downloaded on first use (~27MB quantized). Subsequent
 * runs use the browser cache. The module is lazy-loaded.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pipelineInstance: any = null;

const MODEL_ID = 'onnx-community/depth-anything-v2-small';

async function getDepthPipeline() {
	if (pipelineInstance) return pipelineInstance;

	const { pipeline } = await import('@huggingface/transformers');

	pipelineInstance = await pipeline('depth-estimation', MODEL_ID, {
		dtype: 'q8', // quantised (~27MB vs ~99MB fp32)
		device: typeof navigator !== 'undefined' && 'gpu' in navigator ? 'webgpu' : 'wasm',
	});

	return pipelineInstance;
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
}

/**
 * Estimate a depth map from a source image.
 *
 * Uses Depth Anything V2 Small — a monocular depth estimation model that
 * understands scene geometry (objects in front vs behind) rather than just
 * using brightness like our luminance fallback.
 *
 * Returns normalised 0–1 depth values where 0 = farthest, 1 = closest.
 */
export async function estimateDepth(source: HTMLImageElement): Promise<DepthMap> {
	const estimator = await getDepthPipeline();

	// Convert to data URL to avoid revoked blob URL issues
	const dataUrl = imageToDataUrl(source);

	const result = await estimator(dataUrl);
	const depthImage = result.predicted_depth;
	const { dims, data: rawData } = depthImage;

	// dims is [height, width] from pipeline
	const height = dims[0];
	const width = dims[1];
	const pixels = rawData instanceof Float32Array ? rawData : new Float32Array(rawData);

	// Normalise to 0–1 range
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

	return { data: normalised, width, height };
}

/**
 * Compute approximate surface normals from a depth map via gradients.
 *
 * Returns per-pixel [nx, ny, nz] where nx/ny encode the surface slope
 * and nz is approximately 1.0 for flat surfaces. This enables lateral
 * displacement for volumetric form (arms look cylindrical, faces rounded).
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
