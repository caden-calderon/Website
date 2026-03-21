/** Raw pixel data extracted from a source image. */
export interface AlgorithmInput {
	/** RGBA pixel data */
	pixels: Uint8ClampedArray;
	width: number;
	height: number;
}

export interface AlgorithmOptions {
	/** Target number of samples */
	count: number;
	/** Base radius for generated points (default 1.0) */
	baseRadius?: number;
	/** Random seed for reproducibility */
	seed?: number;
	/** Gamma power applied to luminance before density weighting (default 1.0) */
	densityGamma?: number;
}

/** Output from a stippling / sampling algorithm. */
export interface StippleResult {
	/** Point positions [x, y, ...] stride 2 (normalized 0–1 space) */
	positions: Float32Array;
	/** Point colors [r, g, b, ...] stride 3 (normalized 0–1) */
	colors: Float32Array;
	/** Per-point radius */
	radii: Float32Array;
	/** Per-point luminance (0–1) for downstream use (depth, radius scaling) */
	luminances: Float32Array;
	/** Actual number of points generated (may differ from requested count) */
	count: number;
}

/** Pluggable image → point sampling strategy. */
export interface StippleAlgorithm {
	readonly name: string;
	generate(input: AlgorithmInput, options: AlgorithmOptions): StippleResult;
}
