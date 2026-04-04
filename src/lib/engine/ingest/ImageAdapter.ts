import type { SampleSet } from '../core/types.js';
import { RasterAdapter } from './RasterAdapter.js';
import type { IngestAdapter, ImageAdapterOptions, RasterSampleSource } from './types.js';

type ImageSource = HTMLImageElement | HTMLCanvasElement | ImageBitmap;

/**
 * Converts a 2D image into a point-sampled SampleSet.
 *
 * Browser-facing DOM wrapper around `RasterAdapter`. This keeps the reusable
 * dense RGB/RGBD sampling logic DOM-free so video/Kinect frame paths can reuse
 * it later without reimplementing the image pipeline.
 */
export class ImageAdapter implements IngestAdapter<ImageSource, ImageAdapterOptions> {
	readonly name = 'image';
	private readonly rasterAdapter = new RasterAdapter();

	sample(source: ImageSource, options: ImageAdapterOptions): SampleSet {
		const imageData = this.extractPixels(source);
		const rasterSource: RasterSampleSource = {
			width: imageData.width,
			height: imageData.height,
			pixels: imageData.data,
		};
		return this.rasterAdapter.sample(rasterSource, options);
	}

	private extractPixels(source: ImageSource): ImageData {
		const w = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
		const h = source instanceof HTMLImageElement ? source.naturalHeight : source.height;

		const canvas = document.createElement('canvas');
		canvas.width = w;
		canvas.height = h;

		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('Failed to get 2D canvas context for image pixel extraction');

		ctx.drawImage(source, 0, 0);
		return ctx.getImageData(0, 0, w, h);
	}
}
