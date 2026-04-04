import type { SampleSet } from '../core/types.js';
import type { PlyAdapterOptions } from '../ingest/types.js';

export type PlaybackMode = 'loop' | 'once' | 'ping-pong';
export type PlaybackDirection = 'forward' | 'backward';

export interface AnimationClip {
	id: string;
	startFrame: number;
	endFrame: number;
	mode: PlaybackMode;
}

export interface FrameSequenceOptions {
	frames: readonly SampleSet[];
	fps: number;
	clips?: readonly AnimationClip[];
	initialClipId?: string;
	autoPlay?: boolean;
}

/**
 * Sidecar manifest for a recorded or generated point-cloud sequence.
 *
 * This carries timing plus coordinate metadata, but intentionally does not
 * prescribe how frame bytes are fetched. Asset routing stays above the engine.
 */
export interface PointSequenceManifest {
	version: 1;
	fps: number;
	frameCount: number;
	frameTimestampsMs: readonly number[];
	frameFiles?: readonly string[];
	clips?: readonly AnimationClip[];
	coordinateSystem: {
		upAxis: string;
		forwardAxis?: string;
		handedness?: 'left' | 'right' | 'unknown';
		description?: string;
	};
	units: string;
	processing: Readonly<Record<string, unknown>>;
	capture?: {
		sensor?: string;
		serial?: string;
		calibration?: Readonly<Record<string, unknown>>;
		metadata?: Readonly<Record<string, unknown>>;
	};
}

export type FrameBufferLoader = (frameIndex: number) => ArrayBuffer | Promise<ArrayBuffer>;

export interface FrameSequenceLoaderOptions {
	manifest: PointSequenceManifest;
	frames?: readonly SampleSet[];
	frameBuffers?: readonly ArrayBuffer[];
	loadFrame?: FrameBufferLoader;
	plyOptions?: PlyAdapterOptions;
	initialClipId?: string;
	autoPlay?: boolean;
}

/**
 * Result shape returned by tick/seek/clip-switch operations.
 *
 * `copiedFrame` indicates whether the shared playback buffer was updated this
 * operation. Callers can use that to avoid redundant downstream work.
 */
export interface FrameSequenceUpdateResult {
	clipId: string;
	frameIndex: number;
	direction: PlaybackDirection;
	playing: boolean;
	frameChanged: boolean;
	copiedFrame: boolean;
	looped: boolean;
	ended: boolean;
}

export type FrameSequenceTickResult = FrameSequenceUpdateResult;
