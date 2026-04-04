/**
 * Canonical sample data structure for the point-sampled runtime.
 *
 * All data is backed by typed arrays — no object-per-sample allocations.
 * Not every adapter fills every field; optional arrays are undefined when unused.
 */
export interface SampleSet {
	/** Stable identity for temporal coherence. Optional for static sources. */
	readonly ids?: Uint32Array;

	/** Interleaved [x,y,z, x,y,z, ...] stride 3 */
	readonly positions: Float32Array;

	/** Interleaved [r,g,b, r,g,b, ...] stride 3, values 0–1 */
	readonly colors: Float32Array;

	/** Per-sample footprint radius */
	readonly radii: Float32Array;

	/** Per-sample opacity, 0–1 */
	readonly opacities: Float32Array;

	/** Optional surface normals [nx,ny,nz, ...] stride 3 */
	readonly normals?: Float32Array;

	/** Optional tangent frame / anisotropy data */
	readonly orientations?: Float32Array;

	/** Optional per-sample velocity for temporal effects */
	readonly velocities?: Float32Array;

	/** Optional source-specific anchor indices (e.g., triangle index for mesh binding) */
	readonly anchors?: Uint32Array;

	/** Optional barycentric coordinates for mesh surface attachment [u,v,w, ...] stride 3 */
	readonly barycentrics?: Float32Array;

	/** Optional image/video source coordinates [u,v, ...] stride 2 */
	readonly uv?: Float32Array;

	/**
	 * Number of active samples.
	 *
	 * Consumers must treat only the prefix `[0, count)` as active. Typed arrays
	 * may be over-allocated beyond `count` so playback/runtime code can reuse
	 * fixed-capacity buffers across variable-size frames.
	 */
	readonly count: number;
}
