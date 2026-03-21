import type { SampleSet } from '../core/types.js';

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

export interface ImageAdapterOptions {
	/** Target number of samples to generate */
	count: number;
	/** Sampling algorithm to use */
	algorithm: 'rejection' | 'importance';
	/** Base radius for generated samples (default 1.0) */
	baseRadius?: number;
	/** Random seed for reproducibility */
	seed?: number;
	/** Z-depth displacement scale from luminance (default 0). Set > 0 for relief effect. */
	depthScale?: number;
	/** Gamma power curve for density contrast (default 1.0). Higher = more contrast. */
	densityGamma?: number;
	/** Scale point radius by local luminance (default false) */
	radiusFromLuminance?: boolean;
	/**
	 * Neighbourhood radius (in pixels) for outlier suppression.
	 * Bright points surrounded by dark neighbours are killed.
	 * 0 = off (default 0).
	 */
	outlierRadius?: number;
}
