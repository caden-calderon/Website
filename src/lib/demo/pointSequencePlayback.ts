import type { FrameSequence } from '$lib/engine/animation/FrameSequence.js';
import { FrameSequenceLoader } from '$lib/engine/animation/FrameSequenceLoader.js';
import type { PointSequenceManifest } from '$lib/engine/animation/types.js';
import type { SampleSet } from '$lib/engine/core/types.js';
import { PlyAdapter } from '$lib/engine/ingest/PlyAdapter.js';
import type { DemoPointSequencePlaybackSource } from './pointSequenceSources.js';
import type { SequenceColorGradeId } from './sequenceLooks.js';

type Vec3 = [number, number, number];

export interface PreparedPointSequenceBounds {
	min: Vec3;
	max: Vec3;
	center: Vec3;
	size: Vec3;
	maxDimension: number;
	height: number;
}

export interface PreparedPointSequenceReport {
	kind: 'point-sequence';
	loadingStrategy: 'eager-full-sequence';
	frameCount: number;
	totalFrameBytes: number;
	totalPreparedBytes: number;
	estimatedPlaybackBytes: number;
	fetchMs: number;
	parseMs: number;
	prepareMs: number;
	buildMs: number;
	totalLoadMs: number;
	originalPointCountRange: readonly [number, number];
	preparedPointCountRange: readonly [number, number];
	totalOriginalPoints: number;
	totalPreparedPoints: number;
	maxPointsPerFrame: number | null;
}

export interface PreparedPointSequenceResult {
	manifest: PointSequenceManifest;
	sequence: FrameSequence;
	bounds: PreparedPointSequenceBounds | null;
	report: PreparedPointSequenceReport;
}

export interface SequenceTransformSettings {
	autoCenter: boolean;
	fitHeightEnabled: boolean;
	fitHeight: number;
	scaleMultiplier: number;
}

export interface SequenceTransform {
	position: Vec3;
	scale: number;
}

const IDENTITY_POSITION: Vec3 = [0, 0, 0];

export async function loadPreparedPointSequence(options: {
	source: DemoPointSequencePlaybackSource;
	frameSequenceLoader?: FrameSequenceLoader;
	maxPointsPerFrame?: number | null;
	colorGradeId?: SequenceColorGradeId;
	initialClipId?: string;
	autoPlay?: boolean;
}): Promise<PreparedPointSequenceResult> {
	const {
		source,
		frameSequenceLoader = new FrameSequenceLoader(),
		maxPointsPerFrame = null,
		colorGradeId = 'source',
		initialClipId,
		autoPlay = true,
	} = options;

	const plyAdapter = new PlyAdapter();
	const normalizedMaxPoints = normalizeMaxPointsPerFrame(maxPointsPerFrame);
	const startTime = nowMs();

	const fetchStart = nowMs();
	const frameBuffers = await Promise.all(
		Array.from({ length: source.manifest.frameCount }, (_, frameIndex) => source.loadFrame(frameIndex)),
	);
	const fetchMs = nowMs() - fetchStart;

	const parseStart = nowMs();
	const parsedFrames = frameBuffers.map((buffer, frameIndex) => {
		if (!(buffer instanceof ArrayBuffer)) {
			throw new Error(`Prepared point-sequence frame ${frameIndex} did not resolve to an ArrayBuffer.`);
		}

		return plyAdapter.sample(buffer);
	});
	const parseMs = nowMs() - parseStart;

	const prepareStart = nowMs();
	const densityPreparedFrames = parsedFrames.map((frame) => downsampleSampleSet(frame, normalizedMaxPoints));
	const bounds = computePreparedPointSequenceBounds(densityPreparedFrames);
	const preparedFrames = applySequenceColorGrade(densityPreparedFrames, bounds, colorGradeId);
	const prepareMs = nowMs() - prepareStart;

	const buildStart = nowMs();
	const sequence = await frameSequenceLoader.load({
		manifest: source.manifest,
		frames: preparedFrames,
		initialClipId,
		autoPlay,
	});
	const buildMs = nowMs() - buildStart;

	const totalLoadMs = nowMs() - startTime;
	const originalPointCounts = parsedFrames.map((frame) => frame.count);
	const preparedPointCounts = preparedFrames.map((frame) => frame.count);

	return {
		manifest: source.manifest,
		sequence,
		bounds,
		report: {
			kind: 'point-sequence',
			loadingStrategy: 'eager-full-sequence',
			frameCount: source.manifest.frameCount,
			totalFrameBytes: frameBuffers.reduce((total, buffer) => total + buffer.byteLength, 0),
			totalPreparedBytes: preparedFrames.reduce((total, frame) => total + getSampleSetByteLength(frame), 0),
			estimatedPlaybackBytes: estimatePlaybackBufferBytes(preparedFrames),
			fetchMs,
			parseMs,
			prepareMs,
			buildMs,
			totalLoadMs,
			originalPointCountRange: resolveRange(originalPointCounts),
			preparedPointCountRange: resolveRange(preparedPointCounts),
			totalOriginalPoints: originalPointCounts.reduce((sum, count) => sum + count, 0),
			totalPreparedPoints: preparedPointCounts.reduce((sum, count) => sum + count, 0),
			maxPointsPerFrame: normalizedMaxPoints,
		},
	};
}

export function resolveSequenceTransform(
	bounds: PreparedPointSequenceBounds | null,
	settings: SequenceTransformSettings,
): SequenceTransform {
	const scaleMultiplier = Number.isFinite(settings.scaleMultiplier) && settings.scaleMultiplier > 0
		? settings.scaleMultiplier
		: 1;
	if (!bounds) {
		return {
			position: IDENTITY_POSITION,
			scale: scaleMultiplier,
		};
	}

	let fitScale = 1;
	if (settings.fitHeightEnabled && Number.isFinite(settings.fitHeight) && settings.fitHeight > 0 && bounds.height > 0) {
		fitScale = settings.fitHeight / bounds.height;
	}

	const scale = fitScale * scaleMultiplier;
	const position = settings.autoCenter
		? ([
			-bounds.center[0] * scale,
			-bounds.center[1] * scale,
			-bounds.center[2] * scale,
		] satisfies Vec3)
		: IDENTITY_POSITION;

	return { position, scale };
}

export function downsampleSampleSet(source: SampleSet, maxPointsPerFrame: number | null): SampleSet {
	const normalizedMaxPoints = normalizeMaxPointsPerFrame(maxPointsPerFrame);
	if (normalizedMaxPoints === null || source.count <= normalizedMaxPoints) {
		return cloneActiveSampleSet(source);
	}

	const targetCount = normalizedMaxPoints;
	const target = createSampleSetLike(source, targetCount);
	let previousSourceIndex = -1;

	for (let targetIndex = 0; targetIndex < targetCount; targetIndex++) {
		let sourceIndex = Math.floor((targetIndex * source.count) / targetCount);
		if (sourceIndex <= previousSourceIndex) {
			sourceIndex = previousSourceIndex + 1;
		}
		if (sourceIndex >= source.count) {
			sourceIndex = source.count - 1;
		}

		copyPoint(source, target, sourceIndex, targetIndex);
		previousSourceIndex = sourceIndex;
	}

	return target;
}

export function applySequenceColorGrade(
	frames: readonly SampleSet[],
	bounds: PreparedPointSequenceBounds | null,
	colorGradeId: SequenceColorGradeId,
): SampleSet[] {
	if (colorGradeId === 'source' || !bounds) {
		return Array.from(frames);
	}

	return frames.map((frame) => applySequenceColorGradeToFrame(frame, bounds, colorGradeId));
}

export function computePreparedPointSequenceBounds(
	frames: readonly SampleSet[],
): PreparedPointSequenceBounds | null {
	let minX = Number.POSITIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	let minZ = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;
	let maxZ = Number.NEGATIVE_INFINITY;

	for (const frame of frames) {
		for (let pointIndex = 0; pointIndex < frame.count; pointIndex++) {
			const i3 = pointIndex * 3;
			const x = frame.positions[i3];
			const y = frame.positions[i3 + 1];
			const z = frame.positions[i3 + 2];

			if (x < minX) minX = x;
			if (y < minY) minY = y;
			if (z < minZ) minZ = z;
			if (x > maxX) maxX = x;
			if (y > maxY) maxY = y;
			if (z > maxZ) maxZ = z;
		}
	}

	if (!Number.isFinite(minX)) {
		return null;
	}

	const size: Vec3 = [maxX - minX, maxY - minY, maxZ - minZ];
	return {
		min: [minX, minY, minZ],
		max: [maxX, maxY, maxZ],
		center: [(minX + maxX) * 0.5, (minY + maxY) * 0.5, (minZ + maxZ) * 0.5],
		size,
		maxDimension: Math.max(...size),
		height: size[1],
	};
}

function cloneActiveSampleSet(source: SampleSet): SampleSet {
	const clone = createSampleSetLike(source, source.count);
	for (let pointIndex = 0; pointIndex < source.count; pointIndex++) {
		copyPoint(source, clone, pointIndex, pointIndex);
	}
	return clone;
}

function applySequenceColorGradeToFrame(
	source: SampleSet,
	bounds: PreparedPointSequenceBounds,
	colorGradeId: SequenceColorGradeId,
): SampleSet {
	const frame = cloneActiveSampleSet(source);
	const width = Math.max(bounds.size[0], 1e-6);
	const height = Math.max(bounds.size[1], 1e-6);
	const depth = Math.max(bounds.size[2], 1e-6);

	for (let pointIndex = 0; pointIndex < frame.count; pointIndex++) {
		const i3 = pointIndex * 3;
		const x = frame.positions[i3];
		const y = frame.positions[i3 + 1];
		const z = frame.positions[i3 + 2];

		const nx = clamp01((x - bounds.min[0]) / width);
		const ny = clamp01((y - bounds.min[1]) / height);
		const nz = clamp01((z - bounds.min[2]) / depth);
		const centeredX = clamp01((x - bounds.center[0]) / Math.max(width * 0.5, 1e-6) * 0.5 + 0.5);

		const [r, g, b] = resolveColorGrade(colorGradeId, {
			sourceR: source.colors[i3],
			sourceG: source.colors[i3 + 1],
			sourceB: source.colors[i3 + 2],
			nx,
			ny,
			nz,
			centeredX,
		});

		frame.colors[i3] = r;
		frame.colors[i3 + 1] = g;
		frame.colors[i3 + 2] = b;
	}

	return frame;
}

function createSampleSetLike(source: SampleSet, count: number): SampleSet {
	return {
		ids: source.ids ? new Uint32Array(count) : undefined,
		positions: new Float32Array(count * 3),
		colors: new Float32Array(count * 3),
		radii: new Float32Array(count),
		opacities: new Float32Array(count),
		normals: source.normals ? new Float32Array(count * 3) : undefined,
		orientations: source.orientations ? new Float32Array(count * 3) : undefined,
		velocities: source.velocities ? new Float32Array(count * 3) : undefined,
		anchors: source.anchors ? new Uint32Array(count) : undefined,
		barycentrics: source.barycentrics ? new Float32Array(count * 3) : undefined,
		uv: source.uv ? new Float32Array(count * 2) : undefined,
		count,
	};
}

function copyPoint(source: SampleSet, target: SampleSet, sourceIndex: number, targetIndex: number): void {
	copyStride(source.positions, target.positions, sourceIndex, targetIndex, 3);
	copyStride(source.colors, target.colors, sourceIndex, targetIndex, 3);
	target.radii[targetIndex] = source.radii[sourceIndex];
	target.opacities[targetIndex] = source.opacities[sourceIndex];

	if (source.ids && target.ids) target.ids[targetIndex] = source.ids[sourceIndex];
	if (source.normals && target.normals) copyStride(source.normals, target.normals, sourceIndex, targetIndex, 3);
	if (source.orientations && target.orientations) copyStride(source.orientations, target.orientations, sourceIndex, targetIndex, 3);
	if (source.velocities && target.velocities) copyStride(source.velocities, target.velocities, sourceIndex, targetIndex, 3);
	if (source.anchors && target.anchors) target.anchors[targetIndex] = source.anchors[sourceIndex];
	if (source.barycentrics && target.barycentrics) copyStride(source.barycentrics, target.barycentrics, sourceIndex, targetIndex, 3);
	if (source.uv && target.uv) copyStride(source.uv, target.uv, sourceIndex, targetIndex, 2);
}

function copyStride(
	source: Float32Array,
	target: Float32Array,
	sourceIndex: number,
	targetIndex: number,
	stride: number,
): void {
	const sourceOffset = sourceIndex * stride;
	const targetOffset = targetIndex * stride;
	for (let i = 0; i < stride; i++) {
		target[targetOffset + i] = source[sourceOffset + i];
	}
}

function normalizeMaxPointsPerFrame(value: number | null | undefined): number | null {
	if (value == null) return null;
	if (!Number.isFinite(value) || value <= 0) return null;
	return Math.max(1, Math.floor(value));
}

function resolveColorGrade(
	colorGradeId: SequenceColorGradeId,
	context: {
		sourceR: number;
		sourceG: number;
		sourceB: number;
		nx: number;
		ny: number;
		nz: number;
		centeredX: number;
	},
): Vec3 {
	const { sourceR, sourceG, sourceB, nx, ny, nz, centeredX } = context;
	const sourceLuma = clamp01(sourceR * 0.299 + sourceG * 0.587 + sourceB * 0.114);

	switch (colorGradeId) {
		case 'studio-ivory': {
			const shade = clamp01(0.2 + ny * 0.58 + (1 - nz) * 0.22);
			return lerpColor([0.16, 0.15, 0.16], [0.98, 0.93, 0.86], shade);
		}
		case 'painted-figure': {
			const warmMix = clamp01(ny * 0.62 + (1 - nz) * 0.24 + sourceLuma * 0.14);
			const accentMix = clamp01(centeredX * 0.5 + nz * 0.35);
			const base = lerpColor([0.08, 0.12, 0.32], [0.98, 0.78, 0.38], warmMix);
			return lerpColor(base, [0.92, 0.36, 0.44], accentMix * 0.35);
		}
		case 'electric-duotone': {
			const duotone = clamp01(centeredX * 0.55 + (1 - nz) * 0.45);
			return lerpColor([0.09, 0.92, 0.94], [1.0, 0.25, 0.62], duotone);
		}
		case 'source':
			return [sourceR, sourceG, sourceB];
	}
}

function resolveRange(values: readonly number[]): readonly [number, number] {
	return [Math.min(...values), Math.max(...values)];
}

function getSampleSetByteLength(frame: SampleSet): number {
	return (
		frame.positions.byteLength +
		frame.colors.byteLength +
		frame.radii.byteLength +
		frame.opacities.byteLength +
		(frame.ids?.byteLength ?? 0) +
		(frame.normals?.byteLength ?? 0) +
		(frame.orientations?.byteLength ?? 0) +
		(frame.velocities?.byteLength ?? 0) +
		(frame.anchors?.byteLength ?? 0) +
		(frame.barycentrics?.byteLength ?? 0) +
		(frame.uv?.byteLength ?? 0)
	);
}

function estimatePlaybackBufferBytes(frames: readonly SampleSet[]): number {
	const maxCount = frames.reduce((max, frame) => Math.max(max, frame.count), 0);
	const hasIds = frames.some((frame) => frame.ids !== undefined);
	const hasNormals = frames.some((frame) => frame.normals !== undefined);
	const hasOrientations = frames.some((frame) => frame.orientations !== undefined);
	const hasVelocities = frames.some((frame) => frame.velocities !== undefined);
	const hasAnchors = frames.some((frame) => frame.anchors !== undefined);
	const hasBarycentrics = frames.some((frame) => frame.barycentrics !== undefined);
	const hasUv = frames.some((frame) => frame.uv !== undefined);

	return (
		maxCount * 3 * Float32Array.BYTES_PER_ELEMENT +
		maxCount * 3 * Float32Array.BYTES_PER_ELEMENT +
		maxCount * Float32Array.BYTES_PER_ELEMENT +
		maxCount * Float32Array.BYTES_PER_ELEMENT +
		(hasIds ? maxCount * Uint32Array.BYTES_PER_ELEMENT : 0) +
		(hasNormals ? maxCount * 3 * Float32Array.BYTES_PER_ELEMENT : 0) +
		(hasOrientations ? maxCount * 3 * Float32Array.BYTES_PER_ELEMENT : 0) +
		(hasVelocities ? maxCount * 3 * Float32Array.BYTES_PER_ELEMENT : 0) +
		(hasAnchors ? maxCount * Uint32Array.BYTES_PER_ELEMENT : 0) +
		(hasBarycentrics ? maxCount * 3 * Float32Array.BYTES_PER_ELEMENT : 0) +
		(hasUv ? maxCount * 2 * Float32Array.BYTES_PER_ELEMENT : 0)
	);
}

function nowMs(): number {
	return globalThis.performance?.now() ?? Date.now();
}

function lerpColor(start: Vec3, end: Vec3, t: number): Vec3 {
	return [
		start[0] + (end[0] - start[0]) * t,
		start[1] + (end[1] - start[1]) * t,
		start[2] + (end[2] - start[2]) * t,
	];
}

function clamp01(value: number): number {
	return Math.min(1, Math.max(0, value));
}
