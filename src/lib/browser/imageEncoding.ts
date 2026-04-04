export interface EncodeImageBitmapOptions {
	mimeType: string;
	quality?: number;
	maxEdge?: number;
	backgroundColor?: readonly [number, number, number] | null;
}

export interface EncodedImageBitmapResult {
	blob: Blob;
	width: number;
	height: number;
}

export type EncodableImageSource = CanvasImageSource;

export interface Canvas2dHandle {
	canvas: HTMLCanvasElement | OffscreenCanvas;
	context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
}

export function resolveEncodedBitmapSize(
	width: number,
	height: number,
	maxEdge?: number,
): { width: number; height: number } {
	if (!Number.isFinite(maxEdge) || !maxEdge || maxEdge <= 0) {
		return { width, height };
	}

	const longestEdge = Math.max(width, height, 1);
	const scale = Math.min(1, maxEdge / longestEdge);
	return {
		width: Math.max(1, Math.round(width * scale)),
		height: Math.max(1, Math.round(height * scale)),
	};
}

export function resolveCanvasImageSourceSize(source: EncodableImageSource): { width: number; height: number } {
	if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) {
		return { width: source.width, height: source.height };
	}
	if (typeof HTMLImageElement !== 'undefined' && source instanceof HTMLImageElement) {
		return {
			width: source.naturalWidth || source.width,
			height: source.naturalHeight || source.height,
		};
	}
	if (typeof HTMLCanvasElement !== 'undefined' && source instanceof HTMLCanvasElement) {
		return { width: source.width, height: source.height };
	}
	if (typeof OffscreenCanvas !== 'undefined' && source instanceof OffscreenCanvas) {
		return { width: source.width, height: source.height };
	}
	if (typeof HTMLVideoElement !== 'undefined' && source instanceof HTMLVideoElement) {
		return { width: source.videoWidth || source.width, height: source.videoHeight || source.height };
	}
	if (typeof SVGImageElement !== 'undefined' && source instanceof SVGImageElement) {
		return { width: source.width.baseVal.value, height: source.height.baseVal.value };
	}

	throw new Error('Unsupported canvas image source.');
}

export function createCanvas2d(width: number, height: number): Canvas2dHandle {
	if (typeof OffscreenCanvas !== 'undefined') {
		const canvas = new OffscreenCanvas(width, height);
		const context = canvas.getContext('2d');
		if (!context) {
			throw new Error('Failed to create 2D context for OffscreenCanvas.');
		}
		return { canvas, context };
	}

	if (typeof document !== 'undefined') {
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext('2d');
		if (!context) {
			throw new Error('Failed to create 2D context for canvas.');
		}
		return { canvas, context };
	}

	throw new Error('No 2D canvas implementation is available.');
}

export async function canvasToBlob(
	canvas: HTMLCanvasElement | OffscreenCanvas,
	mimeType: string,
	quality?: number,
): Promise<Blob> {
	if (typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas) {
		return canvas.convertToBlob({
			type: mimeType,
			quality,
		});
	}

	const htmlCanvas = canvas as HTMLCanvasElement;
	return new Promise<Blob>((resolve, reject) => {
		htmlCanvas.toBlob(
			(blob: Blob | null) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
			mimeType,
			quality,
		);
	});
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
	const bytes = new Uint8Array(await blob.arrayBuffer());
	const chunkSize = 0x8000;
	let binary = '';
	for (let index = 0; index < bytes.length; index += chunkSize) {
		const chunk = bytes.subarray(index, Math.min(index + chunkSize, bytes.length));
		binary += String.fromCharCode(...chunk);
	}

	if (typeof btoa !== 'function') {
		throw new Error('Base64 encoding is unavailable.');
	}

	const base64 = btoa(binary);
	return `data:${blob.type || 'application/octet-stream'};base64,${base64}`;
}

export function blobToHtmlImage(blob: Blob): Promise<HTMLImageElement> {
	if (typeof Image === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
		throw new Error('HTML image decoding is unavailable.');
	}

	const image = new Image();
	const objectUrl = URL.createObjectURL(blob);

	return new Promise<HTMLImageElement>((resolve, reject) => {
		image.onload = () => {
			URL.revokeObjectURL(objectUrl);
			resolve(image);
		};
		image.onerror = () => {
			URL.revokeObjectURL(objectUrl);
			reject(new Error('Failed to decode image blob.'));
		};
		image.src = objectUrl;
	});
}

export async function encodeCanvasImageToBlob(
	source: EncodableImageSource,
	options: EncodeImageBitmapOptions,
): Promise<EncodedImageBitmapResult> {
	const sourceSize = resolveCanvasImageSourceSize(source);
	const targetSize = resolveEncodedBitmapSize(sourceSize.width, sourceSize.height, options.maxEdge);
	const { canvas, context } = createCanvas2d(targetSize.width, targetSize.height);

	if (options.backgroundColor) {
		const [r, g, b] = options.backgroundColor;
		context.fillStyle = `rgb(${r}, ${g}, ${b})`;
		context.fillRect(0, 0, targetSize.width, targetSize.height);
	}

	context.drawImage(source, 0, 0, targetSize.width, targetSize.height);
	const blob = await canvasToBlob(canvas, options.mimeType, options.quality);

	return {
		blob,
		width: targetSize.width,
		height: targetSize.height,
	};
}

export async function encodeImageBitmapToBlob(
	bitmap: ImageBitmap,
	options: EncodeImageBitmapOptions,
): Promise<EncodedImageBitmapResult> {
	return encodeCanvasImageToBlob(bitmap, options);
}
