import { createCanvas2d } from '$lib/browser/imageEncoding.js';
import type { RasterSampleSource } from '$lib/engine/ingest/types.js';
import {
	estimateDepthFromBitmap,
	type DepthMap,
} from '$lib/engine/preprocessing/DepthEstimation.js';
import type { DemoRgbdSequenceAsset, DemoUploadedVideoRgbdSequenceAsset } from './assets.js';
import type { DemoRgbdSequencePlaybackSource, RgbdSequenceFrameData } from './rgbdSequenceSources.js';
import type { RgbdSequenceManifest } from './rgbdSequenceTypes.js';

const DEFAULT_VIDEO_CLIP_ID = 'uploaded_clip';
const VIDEO_SEEK_EPSILON_SECONDS = 1 / 240;

export interface UploadedVideoRgbdSequenceBuildProgress {
	frameIndex: number;
	frameCount: number;
	overallProgress: number;
	message: string;
	elapsedMs: number;
	estimatedTotalMs: number;
	estimatedRemainingMs: number;
}

export interface UploadedVideoRgbdSequenceResult {
	source: DemoRgbdSequencePlaybackSource;
	rawFrames: readonly RgbdSequenceFrameData[];
}

export interface UploadedVideoFramePlan {
	sourceWidth: number;
	sourceHeight: number;
	rasterWidth: number;
	rasterHeight: number;
	frameCount: number;
	fps: number;
	timestampsMs: readonly number[];
}

export function resolveUploadedVideoFramePlan(options: {
	durationSeconds: number;
	sourceWidth: number;
	sourceHeight: number;
	targetFps: number;
	maxFrameCount: number;
	maxEdge: number;
}): UploadedVideoFramePlan {
	const durationSeconds = options.durationSeconds;
	if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
		throw new Error(`Uploaded video duration must be finite and non-negative; received ${durationSeconds}.`);
	}
	if (!Number.isInteger(options.sourceWidth) || options.sourceWidth <= 0) {
		throw new Error(`Uploaded video width must be a positive integer; received ${options.sourceWidth}.`);
	}
	if (!Number.isInteger(options.sourceHeight) || options.sourceHeight <= 0) {
		throw new Error(`Uploaded video height must be a positive integer; received ${options.sourceHeight}.`);
	}
	if (!Number.isFinite(options.targetFps) || options.targetFps <= 0) {
		throw new Error(`Uploaded video target fps must be > 0; received ${options.targetFps}.`);
	}
	if (!Number.isInteger(options.maxFrameCount) || options.maxFrameCount <= 0) {
		throw new Error(`Uploaded video maxFrameCount must be a positive integer; received ${options.maxFrameCount}.`);
	}

	const { width: rasterWidth, height: rasterHeight } = scaleToMaxEdge(
		options.sourceWidth,
		options.sourceHeight,
		options.maxEdge,
	);
	const uncappedFrameCount = Math.ceil(durationSeconds * options.targetFps);
	const frameCount = Math.max(1, Math.min(options.maxFrameCount, uncappedFrameCount || 1));
	const timestampsMs = Array.from({ length: frameCount }, (_, frameIndex) => (frameIndex * 1000) / options.targetFps);
	const fps = frameCount > 1
		? 1000 / ((timestampsMs[timestampsMs.length - 1] - timestampsMs[0]) / (frameCount - 1))
		: options.targetFps;

	return {
		sourceWidth: options.sourceWidth,
		sourceHeight: options.sourceHeight,
		rasterWidth,
		rasterHeight,
		frameCount,
		fps,
		timestampsMs,
	};
}

export function estimateUploadedVideoRgbdBuildMs(options: {
	frameCount: number;
	rasterWidth: number;
	rasterHeight: number;
	useEstimatedDepth: boolean;
}): number {
	const pixelsPerFrame = options.rasterWidth * options.rasterHeight;
	const perFrameDecodeMs = 12 + (pixelsPerFrame * 0.00002);
	const perFrameDepthMs = options.useEstimatedDepth ? 80 + (pixelsPerFrame * 0.00008) : 0;
	return Math.max(120, options.frameCount * (perFrameDecodeMs + perFrameDepthMs));
}

export async function buildUploadedVideoRgbdSequence(options: {
	asset: DemoUploadedVideoRgbdSequenceAsset;
	file: File;
	useEstimatedDepth: boolean;
	depthModelIndex: number;
	onProgress?: (progress: UploadedVideoRgbdSequenceBuildProgress) => void;
	shouldCancel?: () => boolean;
}): Promise<UploadedVideoRgbdSequenceResult> {
	const videoHandle = await loadVideoFromFile(options.file);

	try {
		const plan = resolveUploadedVideoFramePlan({
			durationSeconds: videoHandle.video.duration,
			sourceWidth: videoHandle.video.videoWidth,
			sourceHeight: videoHandle.video.videoHeight,
			targetFps: options.asset.fps,
			maxFrameCount: options.asset.maxFrameCount,
			maxEdge: options.asset.maxEdge,
		});
		const estimatedInitialMs = estimateUploadedVideoRgbdBuildMs({
			frameCount: plan.frameCount,
			rasterWidth: plan.rasterWidth,
			rasterHeight: plan.rasterHeight,
			useEstimatedDepth: options.useEstimatedDepth,
		});
		const buildStart = nowMs();
		const { canvas, context } = createCanvas2d(plan.rasterWidth, plan.rasterHeight);
		const rawFrames: RgbdSequenceFrameData[] = [];

		for (let frameIndex = 0; frameIndex < plan.frameCount; frameIndex++) {
			throwIfCancelled(options.shouldCancel);

			const timestampMs = plan.timestampsMs[frameIndex] ?? 0;
			const seekSeconds = clampSeekTime(timestampMs / 1000, videoHandle.video.duration);
			reportProgress({
				onProgress: options.onProgress,
				frameIndex,
				frameCount: plan.frameCount,
				frameProgress: 0.1,
				message: `Sampling video frame ${frameIndex + 1}/${plan.frameCount}...`,
				buildStart,
				estimatedInitialMs,
			});
			await seekVideo(videoHandle.video, seekSeconds);
			throwIfCancelled(options.shouldCancel);

			context.clearRect(0, 0, plan.rasterWidth, plan.rasterHeight);
			context.drawImage(videoHandle.video, 0, 0, plan.rasterWidth, plan.rasterHeight);
			const imageData = context.getImageData(0, 0, plan.rasterWidth, plan.rasterHeight);
			const raster = toRasterSource(imageData);
			let depthMap: DepthMap | undefined;

			if (options.useEstimatedDepth) {
				if (typeof createImageBitmap !== 'function') {
					throw new Error('Video RGBD depth estimation requires createImageBitmap support in this browser.');
				}

				const bitmap = await createImageBitmap(canvas);
				try {
					depthMap = await estimateDepthFromBitmap(bitmap, {
						modelIndex: options.depthModelIndex,
						onProgress: (status) => {
							reportProgress({
								onProgress: options.onProgress,
								frameIndex,
								frameCount: plan.frameCount,
								frameProgress: 0.15,
								message: status.replace(/\.\.\.$/, ` for frame ${frameIndex + 1}/${plan.frameCount}...`),
								buildStart,
								estimatedInitialMs,
							});
						},
					});
				} finally {
					bitmap.close();
				}
				throwIfCancelled(options.shouldCancel);
			}

			rawFrames.push({
				raster,
				depthMap,
				sourceBytes: {
					color: raster.pixels.byteLength,
					depth: depthMap?.data.byteLength ?? 0,
				},
			});

			reportProgress({
				onProgress: options.onProgress,
				frameIndex,
				frameCount: plan.frameCount,
				frameProgress: 1,
				message: `Baked video RGBD frame ${frameIndex + 1}/${plan.frameCount}.`,
				buildStart,
				estimatedInitialMs,
			});
		}

		const manifest = buildUploadedVideoManifest({
			asset: options.asset,
			file: options.file,
			plan,
			depthMap: rawFrames[0]?.depthMap,
			useEstimatedDepth: options.useEstimatedDepth,
			depthModelIndex: options.depthModelIndex,
		});

		return {
			source: buildPlaybackSource(options.asset, manifest, rawFrames),
			rawFrames,
		};
	} finally {
		videoHandle.dispose();
	}
}

function buildUploadedVideoManifest(options: {
	asset: DemoUploadedVideoRgbdSequenceAsset;
	file: File;
	plan: UploadedVideoFramePlan;
	depthMap?: DepthMap;
	useEstimatedDepth: boolean;
	depthModelIndex: number;
}): RgbdSequenceManifest {
	return {
		version: 1,
		fps: options.plan.fps,
		frameCount: options.plan.frameCount,
		frameTimestampsMs: options.plan.timestampsMs,
		frames: Array.from({ length: options.plan.frameCount }, (_, index) => ({
			colorFile: `uploaded-video-color-${index.toString().padStart(4, '0')}`,
			depthFile: options.useEstimatedDepth
				? `uploaded-video-depth-${index.toString().padStart(4, '0')}`
				: undefined,
		})),
		clips: [
			{
				id: options.asset.initialClipId ?? DEFAULT_VIDEO_CLIP_ID,
				startFrame: 0,
				endFrame: options.plan.frameCount - 1,
				mode: 'loop',
			},
		],
		raster: {
			width: options.plan.rasterWidth,
			height: options.plan.rasterHeight,
			colorEncoding: 'rgba8-json-base64',
			description: `Uploaded video frames sampled from "${options.file.name}".`,
		},
		depth: options.depthMap
			? {
				width: options.depthMap.width,
				height: options.depthMap.height,
				encoding: 'float32-json-base64',
				semantics: '0-far-1-near',
				description: 'Per-frame monocular depth estimation on uploaded video frames.',
			}
			: undefined,
		coordinateSystem: {
			upAxis: 'y',
			forwardAxis: '-z',
			handedness: 'right',
			description: 'Uploaded-video RGBD rehearsal clip in normalized raster space.',
		},
		units: 'normalized-depth',
		processing: {
			source: 'uploaded-video',
			maxFrameCount: options.asset.maxFrameCount,
			targetFps: options.asset.fps,
			maxEdge: options.asset.maxEdge,
			useEstimatedDepth: options.useEstimatedDepth,
			depthModelIndex: options.useEstimatedDepth ? options.depthModelIndex : null,
		},
		capture: {
			sensor: 'uploaded-video',
			metadata: {
				fileName: options.file.name,
				fileSizeBytes: options.file.size,
				frameCount: options.plan.frameCount,
				sourceWidth: options.plan.sourceWidth,
				sourceHeight: options.plan.sourceHeight,
			},
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
				throw new Error(`Uploaded video RGBD frame index ${frameIndex} is outside range 0-${rawFrames.length - 1}.`);
			}
			return frame;
		},
	};
}

async function loadVideoFromFile(file: File): Promise<{
	video: HTMLVideoElement;
	dispose: () => void;
}> {
	if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
		throw new Error('Uploaded-video RGBD rehearsal requires DOM video decoding support.');
	}

	const objectUrl = URL.createObjectURL(file);
	const video = document.createElement('video');
	video.preload = 'auto';
	video.muted = true;
	video.playsInline = true;
	video.src = objectUrl;

	try {
		await waitForVideoMetadata(video);
		await waitForVideoFrameData(video);
		return {
			video,
			dispose: () => {
				video.pause();
				video.removeAttribute('src');
				video.load();
				URL.revokeObjectURL(objectUrl);
			},
		};
	} catch (error) {
		video.pause();
		video.removeAttribute('src');
		video.load();
		URL.revokeObjectURL(objectUrl);
		throw error;
	}
}

async function waitForVideoMetadata(video: HTMLVideoElement): Promise<void> {
	if (video.readyState >= HTMLMediaElement.HAVE_METADATA && Number.isFinite(video.duration)) {
		return;
	}
	await waitForVideoEvent(video, 'loadedmetadata');
}

async function waitForVideoFrameData(video: HTMLVideoElement): Promise<void> {
	if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
		return;
	}
	await waitForVideoEvent(video, 'loadeddata');
}

async function seekVideo(video: HTMLVideoElement, timeSeconds: number): Promise<void> {
	if (Math.abs(video.currentTime - timeSeconds) <= VIDEO_SEEK_EPSILON_SECONDS && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
		return;
	}

	await new Promise<void>((resolve, reject) => {
		const handleSeeked = () => {
			cleanup();
			resolve();
		};
		const handleError = () => {
			cleanup();
			reject(new Error('Failed to seek uploaded video frame.'));
		};
		const cleanup = () => {
			video.removeEventListener('seeked', handleSeeked);
			video.removeEventListener('error', handleError);
		};

		video.addEventListener('seeked', handleSeeked, { once: true });
		video.addEventListener('error', handleError, { once: true });
		video.currentTime = timeSeconds;
	});
}

function waitForVideoEvent(video: HTMLVideoElement, eventName: 'loadedmetadata' | 'loadeddata'): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		const handleSuccess = () => {
			cleanup();
			resolve();
		};
		const handleError = () => {
			cleanup();
			reject(new Error(`Failed while loading uploaded video (${eventName}).`));
		};
		const cleanup = () => {
			video.removeEventListener(eventName, handleSuccess);
			video.removeEventListener('error', handleError);
		};

		video.addEventListener(eventName, handleSuccess, { once: true });
		video.addEventListener('error', handleError, { once: true });
	});
}

function toRasterSource(imageData: ImageData): RasterSampleSource {
	return {
		width: imageData.width,
		height: imageData.height,
		pixels: new Uint8ClampedArray(imageData.data),
	};
}

function scaleToMaxEdge(width: number, height: number, maxEdge: number): { width: number; height: number } {
	if (!Number.isFinite(maxEdge) || maxEdge <= 0) {
		return { width, height };
	}

	const longestEdge = Math.max(width, height, 1);
	const scale = Math.min(1, maxEdge / longestEdge);
	return {
		width: Math.max(1, Math.round(width * scale)),
		height: Math.max(1, Math.round(height * scale)),
	};
}

function clampSeekTime(timeSeconds: number, durationSeconds: number): number {
	const maxTime = Math.max(0, durationSeconds - VIDEO_SEEK_EPSILON_SECONDS);
	return Math.min(maxTime, Math.max(0, timeSeconds));
}

function throwIfCancelled(shouldCancel?: () => boolean): void {
	if (shouldCancel?.()) {
		throw new Error('Uploaded video RGBD build cancelled.');
	}
}

function reportProgress(options: {
	onProgress?: (progress: UploadedVideoRgbdSequenceBuildProgress) => void;
	frameIndex: number;
	frameCount: number;
	frameProgress: number;
	message: string;
	buildStart: number;
	estimatedInitialMs: number;
}): void {
	if (!options.onProgress) {
		return;
	}

	const elapsedMs = nowMs() - options.buildStart;
	const overallProgress = clamp01(
		(options.frameIndex + clamp01(options.frameProgress)) / Math.max(options.frameCount, 1),
	);
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

function clamp01(value: number): number {
	return Math.min(1, Math.max(0, value));
}

function nowMs(): number {
	return typeof performance !== 'undefined' && typeof performance.now === 'function'
		? performance.now()
		: Date.now();
}
