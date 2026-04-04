import type {
	DemoDerivedRgbdSequenceAsset,
	DemoRgbdSequenceAsset,
} from './assets.js';
import type { RgbdSequenceManifest } from './rgbdSequenceTypes.js';
import type { DemoRgbdSequencePlaybackSource, RgbdSequenceFrameData } from './rgbdSequenceSources.js';
import type { RasterSampleSource } from '$lib/engine/ingest/types.js';
import type { DepthMap } from '$lib/engine/preprocessing/DepthEstimation.js';

const TAU = Math.PI * 2;

export interface DerivedRgbdSequenceBuildProgress {
	frameIndex: number;
	frameCount: number;
	overallProgress: number;
	message: string;
	elapsedMs: number;
	estimatedTotalMs: number;
	estimatedRemainingMs: number;
}

export interface DerivedRgbdSequenceBuildData {
	manifest: RgbdSequenceManifest;
	rawFrames: readonly RgbdSequenceFrameData[];
}

export interface DerivedRgbdSequenceResult {
	source: DemoRgbdSequencePlaybackSource;
	rawFrames: readonly RgbdSequenceFrameData[];
}

export function buildDerivedRgbdSequence(options: {
	asset: DemoDerivedRgbdSequenceAsset;
	raster: RasterSampleSource;
	depthMap?: DepthMap;
	onProgress?: (progress: DerivedRgbdSequenceBuildProgress) => void;
}): DerivedRgbdSequenceResult {
	const buildData = buildDerivedRgbdSequenceData(options);
	return buildDerivedRgbdSequenceResult({
		asset: options.asset,
		buildData,
	});
}

export function buildDerivedRgbdSequenceData(options: {
	asset: DemoDerivedRgbdSequenceAsset;
	raster: RasterSampleSource;
	depthMap?: DepthMap;
	onProgress?: (progress: DerivedRgbdSequenceBuildProgress) => void;
}): DerivedRgbdSequenceBuildData {
	const { asset, raster } = options;
	const effectiveDepthMap = options.depthMap ?? deriveDepthMapFromRaster(raster);
	validateDepthMapDimensions(raster, effectiveDepthMap);
	const buildStart = nowMs();
	const estimatedInitialMs = estimateDerivedRgbdBuildMs({
		raster,
		frameCount: asset.frameCount,
	});
	const rawFrames = Array.from({ length: asset.frameCount }, (_, frameIndex) => {
		const frame = buildDerivedFrame({
			raster,
			depthMap: effectiveDepthMap,
			frameIndex,
			frameCount: asset.frameCount,
			motion: asset.motion,
		});
		reportBuildProgress({
			onProgress: options.onProgress,
			frameIndex,
			frameCount: asset.frameCount,
			message: `Baking derived RGBD frame ${frameIndex + 1}/${asset.frameCount}...`,
			buildStart,
			estimatedInitialMs,
		});
		return frame;
	});
	const manifest = buildDerivedManifest(asset, raster);

	return {
		rawFrames,
		manifest,
	};
}

export function buildDerivedRgbdSequenceResult(options: {
	asset: DemoDerivedRgbdSequenceAsset;
	buildData: DerivedRgbdSequenceBuildData;
}): DerivedRgbdSequenceResult {
	return {
		source: buildPlaybackSource(options.asset, options.buildData.manifest, options.buildData.rawFrames),
		rawFrames: options.buildData.rawFrames,
	};
}

export function estimateDerivedRgbdBuildMs(options: {
	raster: RasterSampleSource;
	frameCount: number;
}): number {
	const pixelsPerFrame = options.raster.width * options.raster.height;
	return Math.max(40, (pixelsPerFrame * options.frameCount * 0.0009) + (options.frameCount * 2));
}

function reportBuildProgress(options: {
	onProgress?: (progress: DerivedRgbdSequenceBuildProgress) => void;
	frameIndex: number;
	frameCount: number;
	message: string;
	buildStart: number;
	estimatedInitialMs: number;
}) {
	if (!options.onProgress) {
		return;
	}

	const elapsedMs = nowMs() - options.buildStart;
	const overallProgress = clamp01((options.frameIndex + 1) / Math.max(options.frameCount, 1));
	const estimatedTotalMs = overallProgress >= 0.05
		? Math.max(options.estimatedInitialMs, elapsedMs / overallProgress)
		: options.estimatedInitialMs;

	options.onProgress({
		frameIndex: options.frameIndex,
		frameCount: options.frameCount,
		overallProgress,
		message: options.message,
		elapsedMs,
		estimatedTotalMs,
		estimatedRemainingMs: Math.max(0, estimatedTotalMs - elapsedMs),
	});
}

export function extractRasterFromImage(source: HTMLImageElement): RasterSampleSource {
	const width = source.naturalWidth || source.width;
	const height = source.naturalHeight || source.height;
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;

	const context = canvas.getContext('2d');
	if (!context) {
		throw new Error('Failed to create 2D canvas context for RGBD sequence raster extraction.');
	}

	context.drawImage(source, 0, 0, width, height);
	const imageData = context.getImageData(0, 0, width, height);
	return {
		width: imageData.width,
		height: imageData.height,
		pixels: imageData.data,
	};
}

function buildDerivedFrame(options: {
	raster: RasterSampleSource;
	depthMap: DepthMap;
	frameIndex: number;
	frameCount: number;
	motion: DemoDerivedRgbdSequenceAsset['motion'];
}): RgbdSequenceFrameData {
	const { raster, depthMap, frameIndex, frameCount, motion } = options;
	const pixels = new Uint8ClampedArray(raster.pixels.length);
	const depthValues = new Float32Array(depthMap.data.length);
	const width = raster.width;
	const height = raster.height;
	const progress = frameCount <= 1 ? 0 : frameIndex / frameCount;
	const phase = Math.sin(progress * TAU);
	const bob = Math.sin(progress * TAU * 0.5);

	for (let y = 0; y < height; y++) {
		const centeredY = height <= 1 ? 0 : (y / (height - 1)) * 2 - 1;
		for (let x = 0; x < width; x++) {
			const centeredX = width <= 1 ? 0 : (x / (width - 1)) * 2 - 1;
			const baseDepth = depthMap.data[y * width + x];
			const depthWeight = 0.15 + baseDepth * 0.85;
			const xOffset = phase * motion.parallaxPixels * depthWeight;
			const yOffset = bob * motion.verticalPixels * centeredX * (1 - Math.abs(centeredY));
			const sourceX = clampInt(Math.round(x - xOffset), 0, width - 1);
			const sourceY = clampInt(Math.round(y - yOffset), 0, height - 1);
			const sourceIndex = sourceY * width + sourceX;
			const sourceIndex4 = sourceIndex * 4;
			const targetIndex = y * width + x;
			const targetIndex4 = targetIndex * 4;
			const sampledAlpha = raster.pixels[sourceIndex4 + 3] / 255;

			pixels[targetIndex4] = raster.pixels[sourceIndex4];
			pixels[targetIndex4 + 1] = raster.pixels[sourceIndex4 + 1];
			pixels[targetIndex4 + 2] = raster.pixels[sourceIndex4 + 2];
			pixels[targetIndex4 + 3] = raster.pixels[sourceIndex4 + 3];

			const sampledDepth = depthMap.data[sourceIndex];
			depthValues[targetIndex] = sampledAlpha <= 0.001
				? 0
				: clamp01(sampledDepth + phase * motion.depthDrift * (sampledDepth - 0.5));
		}
	}

	return {
		raster: {
			width,
			height,
			pixels,
		},
		depthMap: {
			data: depthValues,
			width,
			height,
			modelId: depthMap.modelId,
		},
		sourceBytes: {
			color: pixels.byteLength,
			depth: depthValues.byteLength,
		},
	};
}

function deriveDepthMapFromRaster(raster: RasterSampleSource): DepthMap {
	const depth = new Float32Array(raster.width * raster.height);
	for (let i = 0; i < depth.length; i++) {
		const i4 = i * 4;
		const r = raster.pixels[i4] / 255;
		const g = raster.pixels[i4 + 1] / 255;
		const b = raster.pixels[i4 + 2] / 255;
		const a = raster.pixels[i4 + 3] / 255;
		const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
		depth[i] = a <= 0.001 ? 0 : luminance;
	}

	return {
		data: depth,
		width: raster.width,
		height: raster.height,
		modelId: 'derived-luminance-depth',
	};
}

function validateDepthMapDimensions(raster: RasterSampleSource, depthMap: DepthMap): void {
	if (depthMap.width !== raster.width || depthMap.height !== raster.height) {
		throw new Error(
			`Derived RGBD sequence expects matching raster/depth dimensions, received raster ${raster.width}x${raster.height} and depth ${depthMap.width}x${depthMap.height}.`,
		);
	}
}

function buildDerivedManifest(
	asset: DemoDerivedRgbdSequenceAsset,
	raster: RasterSampleSource,
): RgbdSequenceManifest {
	return {
		version: 1,
		fps: asset.fps,
		frameCount: asset.frameCount,
		frameTimestampsMs: Array.from({ length: asset.frameCount }, (_, index) => (index * 1000) / asset.fps),
		frames: Array.from({ length: asset.frameCount }, (_, index) => ({
			colorFile: `derived-color-${index.toString().padStart(4, '0')}`,
			depthFile: `derived-depth-${index.toString().padStart(4, '0')}`,
		})),
		clips: [
			{
				id: asset.initialClipId ?? 'full_clip',
				startFrame: 0,
				endFrame: asset.frameCount - 1,
				mode: 'loop',
			},
		],
		raster: {
			width: raster.width,
			height: raster.height,
			colorEncoding: 'rgba8-json-base64',
			description: `Image-derived RGBD rehearsal raster from asset "${asset.imageAssetId}".`,
		},
		depth: {
			width: raster.width,
			height: raster.height,
			encoding: 'float32-json-base64',
			semantics: '0-far-1-near',
			description: 'Browser-derived depth map reused across a bounded rehearsal motion loop.',
		},
		coordinateSystem: {
			upAxis: 'y',
			forwardAxis: '-z',
			handedness: 'right',
			description: 'Image-derived RGBD rehearsal clip in normalized raster space.',
		},
		units: 'normalized-depth',
		processing: {
			source: 'derived-image',
			imageAssetId: asset.imageAssetId,
			useBackgroundRemoval: asset.useBackgroundRemoval ?? false,
			useEstimatedDepth: asset.useEstimatedDepth ?? false,
			motion: asset.motion,
		},
	};
}

function buildPlaybackSource(
	asset: DemoRgbdSequenceAsset,
	manifest: RgbdSequenceManifest,
	rawFrames: readonly RgbdSequenceFrameData[],
): DemoRgbdSequencePlaybackSource {
	return {
		asset,
		manifest,
		loadFrame: async (frameIndex: number) => {
			const frame = rawFrames[frameIndex];
			if (!frame) {
				throw new Error(`Derived RGBD frame index ${frameIndex} is outside range 0-${rawFrames.length - 1}.`);
			}
			return frame;
		},
	};
}

function clampInt(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function clamp01(value: number): number {
	return Math.min(1, Math.max(0, value));
}

function nowMs(): number {
	return typeof performance !== 'undefined' && typeof performance.now === 'function'
		? performance.now()
		: Date.now();
}
