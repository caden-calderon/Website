import type { SampleSet } from './types.js';

export interface CreateSampleSetOptions {
	count: number;
	includeIds?: boolean;
	includeNormals?: boolean;
	includeUv?: boolean;
}

/** Allocate a zeroed SampleSet with the requested optional fields. */
export function createSampleSet(options: CreateSampleSetOptions): SampleSet {
	const { count, includeIds, includeNormals, includeUv } = options;

	return {
		ids: includeIds ? new Uint32Array(count) : undefined,
		positions: new Float32Array(count * 3),
		colors: new Float32Array(count * 3),
		radii: new Float32Array(count),
		opacities: new Float32Array(count),
		normals: includeNormals ? new Float32Array(count * 3) : undefined,
		uv: includeUv ? new Float32Array(count * 2) : undefined,
		count,
	};
}

/** Deep-copy every populated field of a SampleSet. */
export function cloneSampleSet(source: SampleSet): SampleSet {
	return {
		ids: source.ids ? new Uint32Array(source.ids) : undefined,
		positions: new Float32Array(source.positions),
		colors: new Float32Array(source.colors),
		radii: new Float32Array(source.radii),
		opacities: new Float32Array(source.opacities),
		normals: source.normals ? new Float32Array(source.normals) : undefined,
		orientations: source.orientations ? new Float32Array(source.orientations) : undefined,
		velocities: source.velocities ? new Float32Array(source.velocities) : undefined,
		anchors: source.anchors ? new Uint32Array(source.anchors) : undefined,
		barycentrics: source.barycentrics ? new Float32Array(source.barycentrics) : undefined,
		uv: source.uv ? new Float32Array(source.uv) : undefined,
		count: source.count,
	};
}
