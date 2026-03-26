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

/** Concatenate multiple SampleSets into a single contiguous SampleSet. */
export function mergeSampleSets(...sets: SampleSet[]): SampleSet {
	if (sets.length === 0) return createSampleSet({ count: 0 });
	if (sets.length === 1) return sets[0];

	const totalCount = sets.reduce((sum, s) => sum + s.count, 0);

	const hasIds = sets.some((s) => s.ids !== undefined);
	const hasNormals = sets.some((s) => s.normals !== undefined);
	const hasOrientations = sets.some((s) => s.orientations !== undefined);
	const hasVelocities = sets.some((s) => s.velocities !== undefined);
	const hasAnchors = sets.some((s) => s.anchors !== undefined);
	const hasBarycentrics = sets.some((s) => s.barycentrics !== undefined);
	const hasUv = sets.some((s) => s.uv !== undefined);

	const merged: SampleSet = {
		positions: new Float32Array(totalCount * 3),
		colors: new Float32Array(totalCount * 3),
		radii: new Float32Array(totalCount),
		opacities: new Float32Array(totalCount),
		ids: hasIds ? new Uint32Array(totalCount) : undefined,
		normals: hasNormals ? new Float32Array(totalCount * 3) : undefined,
		orientations: hasOrientations ? new Float32Array(totalCount * 3) : undefined,
		velocities: hasVelocities ? new Float32Array(totalCount * 3) : undefined,
		anchors: hasAnchors ? new Uint32Array(totalCount) : undefined,
		barycentrics: hasBarycentrics ? new Float32Array(totalCount * 3) : undefined,
		uv: hasUv ? new Float32Array(totalCount * 2) : undefined,
		count: totalCount,
	};

	const usedIds = hasIds ? new Set<number>() : null;
	let nextGeneratedId = hasIds
		? sets.reduce((maxId, set) => {
			if (!set.ids) return maxId;
			for (let i = 0; i < set.count; i++) {
				maxId = Math.max(maxId, set.ids[i]);
			}
			return maxId;
		}, -1) + 1
		: 0;

	let offset = 0;
	for (const set of sets) {
		merged.positions.set(set.positions.subarray(0, set.count * 3), offset * 3);
		merged.colors.set(set.colors.subarray(0, set.count * 3), offset * 3);
		merged.radii.set(set.radii.subarray(0, set.count), offset);
		merged.opacities.set(set.opacities.subarray(0, set.count), offset);

		if (merged.ids && usedIds) {
			for (let i = 0; i < set.count; i++) {
				const sourceId = set.ids?.[i];
				let mergedId = sourceId;

				if (mergedId === undefined || usedIds.has(mergedId)) {
					while (usedIds.has(nextGeneratedId)) nextGeneratedId++;
					mergedId = nextGeneratedId++;
				}

				merged.ids[offset + i] = mergedId;
				usedIds.add(mergedId);
			}
		}
		if (merged.normals && set.normals) {
			merged.normals.set(set.normals.subarray(0, set.count * 3), offset * 3);
		}
		if (merged.orientations && set.orientations) {
			merged.orientations.set(set.orientations.subarray(0, set.count * 3), offset * 3);
		}
		if (merged.velocities && set.velocities) {
			merged.velocities.set(set.velocities.subarray(0, set.count * 3), offset * 3);
		}
		if (merged.anchors && set.anchors) {
			merged.anchors.set(set.anchors.subarray(0, set.count), offset);
		}
		if (merged.barycentrics && set.barycentrics) {
			merged.barycentrics.set(set.barycentrics.subarray(0, set.count * 3), offset * 3);
		}
		if (merged.uv && set.uv) {
			merged.uv.set(set.uv.subarray(0, set.count * 2), offset * 2);
		}

		offset += set.count;
	}

	return merged;
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
