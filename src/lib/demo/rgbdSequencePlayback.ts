import type { FrameSequence } from '$lib/engine/animation/FrameSequence.js';
import { FrameSequenceLoader } from '$lib/engine/animation/FrameSequenceLoader.js';
import type { RenderParams } from '$lib/engine/render/types.js';
import { mergeSampleSets } from '$lib/engine/core/SampleSet.js';
import type { SampleSet } from '$lib/engine/core/types.js';
import { RasterAdapter } from '$lib/engine/ingest/RasterAdapter.js';
import type { ImageAdapterOptions } from '$lib/engine/ingest/types.js';
import type { AlgorithmProgressEvent } from '$lib/engine/algorithms/types.js';
import { MAX_WEIGHTED_VORONOI_SAMPLES } from '$lib/engine/algorithms/weighted-voronoi.js';
import { FrameGenerator, type FrameParams } from '$lib/engine/processing/FrameGenerator.js';
import type { DemoRgbdSequencePlaybackSource, RgbdSequenceFrameData } from './rgbdSequenceSources.js';
import type { PreparedPointSequenceBounds } from './pointSequencePlayback.js';
import { computePreparedPointSequenceBounds } from './pointSequencePlayback.js';

export interface PreparedRgbdSequenceReport {
	kind: 'rgbd';
	loadingStrategy: 'eager-full-sequence';
	frameCount: number;
	totalColorBytes: number;
	totalDepthBytes: number;
	totalPreparedBytes: number;
	estimatedPlaybackBytes: number;
	fetchMs: number;
	prepareMs: number;
	buildMs: number;
	totalLoadMs: number;
	preparedPointCountRange: readonly [number, number];
	totalPreparedPoints: number;
	sampleCountPerFrame: number;
	rasterSize: readonly [number, number];
	algorithm: ImageAdapterOptions['algorithm'];
}

export interface PreparedRgbdSequenceResult {
	sequence: FrameSequence;
	bounds: PreparedPointSequenceBounds | null;
	report: PreparedRgbdSequenceReport;
}

export interface PreparedRgbdSequencePreparedData {
	frames: SampleSet[];
	bounds: PreparedPointSequenceBounds | null;
	frameCount: number;
	totalColorBytes: number;
	totalDepthBytes: number;
	totalPreparedBytes: number;
	estimatedPlaybackBytes: number;
	fetchMs: number;
	prepareMs: number;
	preparedPointCountRange: readonly [number, number];
	totalPreparedPoints: number;
	sampleCountPerFrame: number;
	rasterSize: readonly [number, number];
	algorithm: ImageAdapterOptions['algorithm'];
}

export interface RgbdSequencePreparationProgress {
	frameIndex: number;
	frameCount: number;
	frameProgress: number;
	overallProgress: number;
	message: string;
	elapsedMs: number;
	estimatedTotalMs: number;
	estimatedRemainingMs: number;
}

export interface RgbdSequenceSamplingSettings {
	sampleCount: number;
	algorithm: ImageAdapterOptions['algorithm'];
	depthScale: number;
	densityGamma: number;
	radiusFromLuminance: boolean;
	sizeVariation: number;
	outlierRadius: number;
	normalDisplacement: number;
	alphaCutoff?: number;
	frameParams: FrameParams;
}

export function prepareRgbdSequenceData(options: {
	rawFrames: readonly RgbdSequenceFrameData[];
	sampling: RgbdSequenceSamplingSettings;
	frameGenerator?: FrameGenerator;
	fetchMs?: number;
	onProgress?: (progress: RgbdSequencePreparationProgress) => void;
}): PreparedRgbdSequencePreparedData {
	const {
		rawFrames,
		sampling,
		frameGenerator = new FrameGenerator(),
		fetchMs = 0,
		onProgress,
	} = options;

	const rasterAdapter = new RasterAdapter();
	const prepareStart = nowMs();
	const estimatedInitialMs = estimateRgbdSequencePreparationMs({
		frameCount: rawFrames.length,
		sampling,
	});

	const preparedFrames = rawFrames.map((frame, frameIndex) => {
		const reportProgress = (frameProgress: number, message: string) => {
			const elapsedMs = nowMs() - prepareStart;
			const overallProgress = clamp01((frameIndex + frameProgress) / Math.max(rawFrames.length, 1));
			const estimatedTotalMs = overallProgress >= 0.05
				? Math.max(estimatedInitialMs, elapsedMs / overallProgress)
				: estimatedInitialMs;
			onProgress?.({
				frameIndex,
				frameCount: rawFrames.length,
				frameProgress: clamp01(frameProgress),
				overallProgress,
				message,
				elapsedMs,
				estimatedTotalMs,
				estimatedRemainingMs: Math.max(0, estimatedTotalMs - elapsedMs),
			});
		};

		reportProgress(0, buildFrameProgressMessage(frameIndex, rawFrames.length, sampling.algorithm, 'starting'));
		const samples = rasterAdapter.sample(frame.raster, {
			count: sampling.sampleCount,
			algorithm: sampling.algorithm,
			baseRadius: 1.0,
			seed: 42,
			depthScale: sampling.depthScale,
			densityGamma: sampling.densityGamma,
			radiusFromLuminance: sampling.radiusFromLuminance,
			sizeVariation: sampling.sizeVariation,
			outlierRadius: sampling.outlierRadius,
			normalDisplacement: sampling.normalDisplacement,
			alphaCutoff: sampling.alphaCutoff,
			depthMap: frame.depthMap,
			onProgress: (event: AlgorithmProgressEvent) => {
				reportProgress(
					event.progress,
					buildFrameProgressMessage(frameIndex, rawFrames.length, sampling.algorithm, event.stage),
				);
			},
		});

		let preparedFrame = samples;
		if (sampling.frameParams.enabled) {
			const aspect = frame.raster.width / frame.raster.height;
			const frameSamples = frameGenerator.generate(aspect, samples.count, sampling.frameParams, 42);
			preparedFrame = mergeSampleSets(samples, frameSamples);
		}

		reportProgress(1, buildFrameProgressMessage(frameIndex, rawFrames.length, sampling.algorithm, 'done'));
		return preparedFrame;
	});

	const bounds = computePreparedPointSequenceBounds(preparedFrames);
	const prepareMs = nowMs() - prepareStart;
	const pointCounts = preparedFrames.map((frame) => frame.count);
	const firstFrame = rawFrames[0];

	return {
		frames: preparedFrames,
		bounds,
		frameCount: rawFrames.length,
		totalColorBytes: rawFrames.reduce((total, frame) => total + frame.sourceBytes.color, 0),
		totalDepthBytes: rawFrames.reduce((total, frame) => total + frame.sourceBytes.depth, 0),
		totalPreparedBytes: preparedFrames.reduce((total, frame) => total + getSampleSetByteLength(frame), 0),
		estimatedPlaybackBytes: estimatePlaybackBufferBytes(preparedFrames),
		fetchMs,
		prepareMs,
		preparedPointCountRange: resolveRange(pointCounts),
		totalPreparedPoints: pointCounts.reduce((sum, count) => sum + count, 0),
		sampleCountPerFrame: sampling.sampleCount,
		rasterSize: [firstFrame?.raster.width ?? 0, firstFrame?.raster.height ?? 0],
		algorithm: sampling.algorithm,
	};
}

export async function loadPreparedRgbdSequence(options: {
	source: DemoRgbdSequencePlaybackSource;
	rawFrames?: readonly RgbdSequenceFrameData[];
	preparedData?: PreparedRgbdSequencePreparedData;
	frameSequenceLoader?: FrameSequenceLoader;
	frameGenerator?: FrameGenerator;
	initialClipId?: string;
	autoPlay?: boolean;
	sampling?: RgbdSequenceSamplingSettings;
	onProgress?: (progress: RgbdSequencePreparationProgress) => void;
}): Promise<PreparedRgbdSequenceResult> {
	const {
		source,
		rawFrames,
		preparedData,
		frameSequenceLoader = new FrameSequenceLoader(),
		frameGenerator = new FrameGenerator(),
		initialClipId,
		autoPlay = true,
		sampling,
		onProgress,
	} = options;

	let resolvedPreparedData = preparedData;
	if (!resolvedPreparedData) {
		if (rawFrames) {
			if (!sampling) {
				throw new Error('loadPreparedRgbdSequence requires sampling settings when preparedData is not provided.');
			}
			resolvedPreparedData = prepareRgbdSequenceData({
				rawFrames,
				sampling,
				frameGenerator,
				onProgress,
			});
		} else {
			if (!sampling) {
				throw new Error('loadPreparedRgbdSequence requires sampling settings when preparedData is not provided.');
			}
			const fetchStart = nowMs();
			const fetchedFrames = await Promise.all(
				Array.from({ length: source.manifest.frameCount }, (_, frameIndex) => source.loadFrame(frameIndex)),
			);
			resolvedPreparedData = prepareRgbdSequenceData({
				rawFrames: fetchedFrames,
				sampling,
				frameGenerator,
				fetchMs: nowMs() - fetchStart,
				onProgress,
			});
		}
	}

	const buildStart = nowMs();
	const sequence = await frameSequenceLoader.load({
		manifest: {
			version: 1,
			fps: source.manifest.fps,
			frameCount: source.manifest.frameCount,
			frameTimestampsMs: source.manifest.frameTimestampsMs,
			clips: source.manifest.clips,
			coordinateSystem: source.manifest.coordinateSystem,
			units: source.manifest.units,
			processing: source.manifest.processing,
			capture: source.manifest.capture,
		},
		frames: resolvedPreparedData.frames,
		initialClipId,
		autoPlay,
	});
	const buildMs = nowMs() - buildStart;

	return {
		sequence,
		bounds: resolvedPreparedData.bounds,
		report: {
			kind: 'rgbd',
			loadingStrategy: 'eager-full-sequence',
			frameCount: resolvedPreparedData.frameCount,
			totalColorBytes: resolvedPreparedData.totalColorBytes,
			totalDepthBytes: resolvedPreparedData.totalDepthBytes,
			totalPreparedBytes: resolvedPreparedData.totalPreparedBytes,
			estimatedPlaybackBytes: resolvedPreparedData.estimatedPlaybackBytes,
			fetchMs: resolvedPreparedData.fetchMs,
			prepareMs: resolvedPreparedData.prepareMs,
			buildMs,
			totalLoadMs: resolvedPreparedData.fetchMs + resolvedPreparedData.prepareMs + buildMs,
			preparedPointCountRange: resolvedPreparedData.preparedPointCountRange,
			totalPreparedPoints: resolvedPreparedData.totalPreparedPoints,
			sampleCountPerFrame: resolvedPreparedData.sampleCountPerFrame,
			rasterSize: resolvedPreparedData.rasterSize,
			algorithm: resolvedPreparedData.algorithm,
		},
	};
}

export function estimateRgbdSequencePreparationMs(options: {
	frameCount: number;
	sampling: Pick<RgbdSequenceSamplingSettings, 'algorithm' | 'sampleCount' | 'frameParams'>;
}): number {
	const siteCount = Math.max(1, options.sampling.sampleCount);
	const frameCount = Math.max(1, options.frameCount);
	const frameOverhead = options.sampling.frameParams.enabled ? 1.08 : 1;

	switch (options.sampling.algorithm) {
		case 'weighted-voronoi':
			return Math.round(
				frameCount *
				Math.min(siteCount, MAX_WEIGHTED_VORONOI_SAMPLES) *
				0.1 *
				frameOverhead,
			);
		case 'importance':
			return Math.round(frameCount * siteCount * 0.0007 * frameOverhead);
		case 'rejection':
		default:
			return Math.round(frameCount * siteCount * 0.001 * frameOverhead);
	}
}

export function buildRgbdSequenceLookStatus(report: PreparedRgbdSequenceReport, renderParams: RenderParams): string {
	return `RGBD sample path: ${report.sampleCountPerFrame.toLocaleString()} pts/frame, ${report.algorithm}, point size ${renderParams.pointSize.toFixed(1)}px.`;
}

function buildFrameProgressMessage(
	frameIndex: number,
	frameCount: number,
	algorithm: ImageAdapterOptions['algorithm'],
	stage: string,
): string {
	const prefix = `Preparing RGBD frame ${frameIndex + 1}/${frameCount}`;
	if (algorithm !== 'weighted-voronoi') {
		return stage === 'done' ? `${prefix}...` : `${prefix}...`;
	}

	switch (stage) {
		case 'seed-candidates':
			return `${prefix}: seeding Voronoi sites...`;
		case 'relax-sites':
			return `${prefix}: relaxing Voronoi sites...`;
		case 'build-result':
			return `${prefix}: finalizing Voronoi result...`;
		default:
			return `${prefix}: ${stage}...`;
	}
}

function resolveRange(values: readonly number[]): readonly [number, number] {
	if (values.length === 0) {
		return [0, 0];
	}
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

function clamp01(value: number): number {
	return Math.min(1, Math.max(0, value));
}

function nowMs(): number {
	return globalThis.performance?.now() ?? Date.now();
}
