/**
 * Browser-side background removal using @imgly/background-removal.
 *
 * Models are downloaded on first use (~40MB). Subsequent runs use
 * the browser cache. The module is lazy-loaded so the main bundle
 * stays small.
 */

type RemoveBackgroundFn = (
	source: ImageData | ArrayBuffer | Uint8Array | Blob | URL | string,
	config?: Record<string, unknown>,
) => Promise<Blob>;

let removeBackground: RemoveBackgroundFn | null = null;

async function loadModule(): Promise<RemoveBackgroundFn> {
	if (removeBackground) return removeBackground;
	const mod = await import('@imgly/background-removal');
	removeBackground = mod.removeBackground;
	return removeBackground;
}

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

export interface BackgroundRemovalResult {
	/** Image with background removed (transparent alpha) */
	image: HTMLImageElement;
	/** The raw blob for reuse */
	blob: Blob;
}

/**
 * Remove the background from an image, returning a new image with
 * transparent alpha where the background was.
 */
export async function removeImageBackground(
	source: HTMLImageElement,
	onProgress?: (progress: number) => void,
): Promise<BackgroundRemovalResult> {
	const fn = await loadModule();

	// Convert to blob to avoid issues with revoked blob URLs
	const inputBlob = await imageToBlob(source);

	const resultBlob = await fn(inputBlob, {
		progress: onProgress
			? (key: string, current: number, total: number) => {
					onProgress(total > 0 ? current / total : 0);
				}
			: undefined,
	});

	const url = URL.createObjectURL(resultBlob);
	const img = new Image();

	return new Promise<BackgroundRemovalResult>((resolve, reject) => {
		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve({ image: img, blob: resultBlob });
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Failed to load background-removed image'));
		};
		img.src = url;
	});
}
