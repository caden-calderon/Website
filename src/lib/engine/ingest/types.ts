import type { SampleSet } from '../core/types.js';
import type { DepthMap } from '../preprocessing/DepthEstimation.js';
import type { AlgorithmProgressEvent } from '../algorithms/types.js';

/** Common interface for all source-to-sample converters. */
export interface IngestAdapter<TSource, TOptions> {
	readonly name: string;
	sample(source: TSource, options: TOptions): SampleSet;
	update?(source: TSource, existing: SampleSet): SampleSet;
}

export interface MeshAdapterOptions {
	/** Number of points to sample from the mesh surface */
	count: number;
	/** Optional attribute name used to weight sampling density */
	weightAttribute?: string | null;
}

export interface PlyAdapterOptions {
	/** Fallback radius for vertices when the file does not provide one. */
	defaultRadius?: number;
	/** Fallback opacity for vertices when the file does not provide alpha. */
	defaultOpacity?: number;
}

/**
 * Dense RGBA raster input for image- or RGBD-driven point sampling.
 *
 * This stays DOM-free so browser images, videos, canvases, decoded frame
 * buffers, and future registered Kinect RGB frames can all reuse the same
 * sampling path once their pixels are available.
 */
export interface RasterSampleSource {
	width: number;
	height: number;
	pixels: Uint8ClampedArray;
}

export interface ImageAdapterOptions {
	/** Target number of samples to generate */
	count: number;
	/** Sampling algorithm to use */
	algorithm: 'rejection' | 'importance' | 'weighted-voronoi';
	/** Base radius for generated samples (default 1.0) */
	baseRadius?: number;
	/** Random seed for reproducibility */
	seed?: number;
	/** Z-depth displacement scale (default 0). Set > 0 for depth effect. */
	depthScale?: number;
	/** Gamma power curve for density contrast (default 1.0). Higher = more contrast. */
	densityGamma?: number;
	/** Scale point radius by local luminance (default false) */
	radiusFromLuminance?: boolean;
	/** Neighbourhood radius (in pixels) for outlier suppression. 0 = off. */
	outlierRadius?: number;
	/**
	 * ML-estimated depth map for true 3D displacement.
	 * When provided, overrides luminance-based depth.
	 */
	depthMap?: DepthMap;
	/**
	 * Lateral displacement strength from depth normals (default 0).
	 * Creates volumetric bulging — an arm looks cylindrical, not just pushed forward.
	 */
	normalDisplacement?: number;
	/**
	 * Range of luminance-based radius variation (0–1, default 0.4).
	 * 0 = uniform radius, 0.4 = current default (0.6x–1.4x), 1.0 = maximum (0x–2.0x).
	 * Only applies when radiusFromLuminance is true.
	 */
	sizeVariation?: number;
	/**
	 * Reject sampled pixels whose alpha falls below this threshold (0–1).
	 * Useful for RGBD/image sources that already carry a matte.
	 */
	alphaCutoff?: number;
	/** Optional progress callback for long-running sampling algorithms. */
	onProgress?: (event: AlgorithmProgressEvent) => void;
}
