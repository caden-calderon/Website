import type { SampleSet } from '../core/types.js';
import type {
	AnimationClip,
	FrameSequenceOptions,
	FrameSequenceTickResult,
	FrameSequenceUpdateResult,
	PlaybackDirection,
	PlaybackMode,
} from './types.js';

type NumericArray = Float32Array | Uint32Array;

interface MutableSampleSet {
	ids?: Uint32Array;
	positions: Float32Array;
	colors: Float32Array;
	radii: Float32Array;
	opacities: Float32Array;
	normals?: Float32Array;
	orientations?: Float32Array;
	velocities?: Float32Array;
	anchors?: Uint32Array;
	barycentrics?: Float32Array;
	uv?: Float32Array;
	count: number;
}

interface FrameState {
	frameIndex: number;
	direction: PlaybackDirection;
}

interface AdvanceResult {
	timeMs: number;
	playing: boolean;
	looped: boolean;
	ended: boolean;
}

const DEFAULT_CLIP_ID = '__default__';

/**
 * Shared-buffer frame playback controller for point-cloud animation.
 *
 * One mutable SampleSet is reused across all frames. Only the active prefix
 * `[0, count)` is rewritten when the visible frame changes.
 */
export class FrameSequence {
	private readonly frames: readonly SampleSet[];
	private readonly clips = new Map<string, AnimationClip>();
	private readonly frameDurationMs: number;
	private readonly playback: MutableSampleSet;

	private activeClip: AnimationClip;
	private clipTimeMs = 0;
	private currentFrameIndex: number;
	private direction: PlaybackDirection = 'forward';
	private playing: boolean;

	constructor(options: FrameSequenceOptions) {
		const { frames, fps, clips = [], initialClipId, autoPlay = true } = options;

		if (!Number.isFinite(fps) || fps <= 0) {
			throw new Error(`FrameSequence requires fps > 0; received ${fps}.`);
		}
		if (frames.length === 0) {
			throw new Error('FrameSequence requires at least one frame.');
		}

		this.frames = frames;
		this.frameDurationMs = 1000 / fps;
		this.validateFrames(frames);

		for (const clip of clips) {
			this.registerClip(clip);
		}

		const defaultClip: AnimationClip = {
			id: DEFAULT_CLIP_ID,
			startFrame: 0,
			endFrame: frames.length - 1,
			mode: 'loop',
		};
		this.clips.set(defaultClip.id, defaultClip);

		const initialClip = initialClipId
			? this.getClipOrThrow(initialClipId)
			: clips[0] ?? defaultClip;

		this.playback = this.createPlaybackBuffer(frames);
		this.activeClip = initialClip;
		this.currentFrameIndex = initialClip.startFrame;
		this.playing = autoPlay;
		this.copyFrame(initialClip.startFrame);
	}

	getPlaybackSamples(): SampleSet {
		return this.playback;
	}

	getCurrentClip(): AnimationClip {
		return this.activeClip;
	}

	getCurrentFrameIndex(): number {
		return this.currentFrameIndex;
	}

	getDirection(): PlaybackDirection {
		return this.direction;
	}

	isPlaying(): boolean {
		return this.playing;
	}

	play(): void {
		this.playing = true;
	}

	pause(): void {
		this.playing = false;
	}

	setClip(clipId: string): FrameSequenceUpdateResult {
		const previousFrameIndex = this.currentFrameIndex;
		this.activeClip = this.getClipOrThrow(clipId);
		this.clipTimeMs = 0;
		this.direction = 'forward';

		const nextFrameIndex = this.activeClip.startFrame;
		const frameChanged = nextFrameIndex !== previousFrameIndex;
		if (frameChanged) {
			this.copyFrame(nextFrameIndex);
		}
		this.currentFrameIndex = nextFrameIndex;

		return this.buildUpdateResult({
			frameChanged,
			copiedFrame: frameChanged,
			looped: false,
			ended: false,
		});
	}

	seekToFrame(frameIndex: number, direction: PlaybackDirection = 'forward'): FrameSequenceUpdateResult {
		if (!Number.isInteger(frameIndex)) {
			throw new Error(`FrameSequence seek target must be an integer frame index; received ${frameIndex}.`);
		}
		if (frameIndex < this.activeClip.startFrame || frameIndex > this.activeClip.endFrame) {
			throw new Error(
				`FrameSequence seek target ${frameIndex} is outside active clip "${this.activeClip.id}" range ${this.activeClip.startFrame}-${this.activeClip.endFrame}.`,
			);
		}

		const previousFrameIndex = this.currentFrameIndex;
		this.clipTimeMs = this.resolveClipTimeForFrame(this.activeClip, frameIndex, direction);

		const state = this.getFrameState(this.activeClip, this.clipTimeMs);
		this.direction = state.direction;
		this.currentFrameIndex = state.frameIndex;

		const frameChanged = this.currentFrameIndex !== previousFrameIndex;
		if (frameChanged) {
			this.copyFrame(this.currentFrameIndex);
		}

		return this.buildUpdateResult({
			frameChanged,
			copiedFrame: frameChanged,
			looped: false,
			ended: false,
		});
	}

	tick(deltaMs: number): FrameSequenceTickResult {
		if (!Number.isFinite(deltaMs) || deltaMs < 0) {
			throw new Error(`FrameSequence tick delta must be a finite non-negative number; received ${deltaMs}.`);
		}
		if (!this.playing || deltaMs === 0) {
			return this.buildUpdateResult({
				frameChanged: false,
				copiedFrame: false,
				looped: false,
				ended: false,
			});
		}

		const previousFrameIndex = this.currentFrameIndex;
		const advanced = this.advanceClipTime(deltaMs);
		this.clipTimeMs = advanced.timeMs;
		this.playing = advanced.playing;

		const state = this.getFrameState(this.activeClip, this.clipTimeMs);
		this.direction = state.direction;
		this.currentFrameIndex = state.frameIndex;

		const frameChanged = this.currentFrameIndex !== previousFrameIndex;
		if (frameChanged) {
			this.copyFrame(this.currentFrameIndex);
		}

		return this.buildUpdateResult({
			frameChanged,
			copiedFrame: frameChanged,
			looped: advanced.looped,
			ended: advanced.ended,
		});
	}

	private buildUpdateResult(
		overrides: Pick<FrameSequenceUpdateResult, 'frameChanged' | 'copiedFrame' | 'looped' | 'ended'>,
	): FrameSequenceUpdateResult {
		return {
			clipId: this.activeClip.id,
			frameIndex: this.currentFrameIndex,
			direction: this.direction,
			playing: this.playing,
			...overrides,
		};
	}

	private advanceClipTime(deltaMs: number): AdvanceResult {
		const clipFrameCount = this.getClipFrameCount(this.activeClip);
		const rawTime = this.clipTimeMs + deltaMs;

		if (this.activeClip.mode === 'once') {
			const totalDuration = clipFrameCount * this.frameDurationMs;
			if (rawTime >= totalDuration) {
				return {
					timeMs: totalDuration,
					playing: false,
					looped: false,
					ended: true,
				};
			}

			return {
				timeMs: rawTime,
				playing: true,
				looped: false,
				ended: false,
			};
		}

		const cycleSteps = this.getCycleStepCount(this.activeClip.mode, clipFrameCount);
		const cycleDuration = cycleSteps * this.frameDurationMs;

		if (cycleDuration === 0) {
			return {
				timeMs: 0,
				playing: true,
				looped: false,
				ended: false,
			};
		}

		return {
			timeMs: rawTime % cycleDuration,
			playing: true,
			looped: rawTime >= cycleDuration,
			ended: false,
		};
	}

	private getFrameState(clip: AnimationClip, clipTimeMs: number): FrameState {
		const clipFrameCount = this.getClipFrameCount(clip);

		if (clip.mode === 'ping-pong') {
			if (clipFrameCount === 1) {
				return {
					frameIndex: clip.startFrame,
					direction: 'forward',
				};
			}

			const cycleSteps = this.getCycleStepCount(clip.mode, clipFrameCount);
			const step = Math.min(
				cycleSteps - 1,
				Math.floor(clipTimeMs / this.frameDurationMs),
			);
			const localFrameIndex = step < clipFrameCount ? step : cycleSteps - step;

			return {
				frameIndex: clip.startFrame + localFrameIndex,
				direction: step < clipFrameCount - 1 ? 'forward' : 'backward',
			};
		}

		const localFrameIndex = Math.min(
			clipFrameCount - 1,
			Math.floor(clipTimeMs / this.frameDurationMs),
		);

		return {
			frameIndex: clip.startFrame + localFrameIndex,
			direction: 'forward',
		};
	}

	private resolveClipTimeForFrame(
		clip: AnimationClip,
		frameIndex: number,
		direction: PlaybackDirection,
	): number {
		const localFrameIndex = frameIndex - clip.startFrame;
		const clipFrameCount = this.getClipFrameCount(clip);

		if (clip.mode !== 'ping-pong' || clipFrameCount === 1) {
			return localFrameIndex * this.frameDurationMs;
		}

		if (direction === 'forward' || localFrameIndex === 0 || localFrameIndex === clipFrameCount - 1) {
			return localFrameIndex * this.frameDurationMs;
		}

		const cycleSteps = this.getCycleStepCount(clip.mode, clipFrameCount);
		return (cycleSteps - localFrameIndex) * this.frameDurationMs;
	}

	private getCycleStepCount(mode: PlaybackMode, clipFrameCount: number): number {
		if (mode === 'ping-pong') {
			return clipFrameCount === 1 ? 1 : clipFrameCount * 2 - 2;
		}

		return clipFrameCount;
	}

	private getClipFrameCount(clip: AnimationClip): number {
		return clip.endFrame - clip.startFrame + 1;
	}

	private copyFrame(frameIndex: number): void {
		const source = this.frames[frameIndex];
		const activeCount = source.count;

		this.copyInto(this.playback.positions, source.positions, activeCount, 3);
		this.copyInto(this.playback.colors, source.colors, activeCount, 3);
		this.copyInto(this.playback.radii, source.radii, activeCount, 1);
		this.copyInto(this.playback.opacities, source.opacities, activeCount, 1);

		if (this.playback.ids) {
			if (source.ids) {
				this.copyInto(this.playback.ids, source.ids, activeCount, 1);
			} else {
				for (let i = 0; i < activeCount; i++) {
					this.playback.ids[i] = i;
				}
			}
		}

		this.copyOptionalInto(this.playback.normals, source.normals, activeCount, 3);
		this.copyOptionalInto(this.playback.orientations, source.orientations, activeCount, 3);
		this.copyOptionalInto(this.playback.velocities, source.velocities, activeCount, 3);
		this.copyOptionalInto(this.playback.anchors, source.anchors, activeCount, 1);
		this.copyOptionalInto(this.playback.barycentrics, source.barycentrics, activeCount, 3);
		this.copyOptionalInto(this.playback.uv, source.uv, activeCount, 2);

		this.playback.count = activeCount;
	}

	private copyOptionalInto(
		target: NumericArray | undefined,
		source: NumericArray | undefined,
		count: number,
		stride: number,
	): void {
		if (!target) return;

		if (source) {
			this.copyInto(target, source, count, stride);
			return;
		}

		target.fill(0, 0, count * stride);
	}

	private copyInto(target: NumericArray, source: NumericArray, count: number, stride: number): void {
		target.set(source.subarray(0, count * stride), 0);
	}

	private createPlaybackBuffer(frames: readonly SampleSet[]): MutableSampleSet {
		const maxCount = frames.reduce((max, frame) => Math.max(max, frame.count), 0);
		const hasIds = frames.some((frame) => frame.ids !== undefined);
		const hasNormals = frames.some((frame) => frame.normals !== undefined);
		const hasOrientations = frames.some((frame) => frame.orientations !== undefined);
		const hasVelocities = frames.some((frame) => frame.velocities !== undefined);
		const hasAnchors = frames.some((frame) => frame.anchors !== undefined);
		const hasBarycentrics = frames.some((frame) => frame.barycentrics !== undefined);
		const hasUv = frames.some((frame) => frame.uv !== undefined);

		return {
			ids: hasIds ? new Uint32Array(maxCount) : undefined,
			positions: new Float32Array(maxCount * 3),
			colors: new Float32Array(maxCount * 3),
			radii: new Float32Array(maxCount),
			opacities: new Float32Array(maxCount),
			normals: hasNormals ? new Float32Array(maxCount * 3) : undefined,
			orientations: hasOrientations ? new Float32Array(maxCount * 3) : undefined,
			velocities: hasVelocities ? new Float32Array(maxCount * 3) : undefined,
			anchors: hasAnchors ? new Uint32Array(maxCount) : undefined,
			barycentrics: hasBarycentrics ? new Float32Array(maxCount * 3) : undefined,
			uv: hasUv ? new Float32Array(maxCount * 2) : undefined,
			count: 0,
		};
	}

	private registerClip(clip: AnimationClip): void {
		if (!clip.id) {
			throw new Error('FrameSequence clip ids must be non-empty.');
		}
		if (this.clips.has(clip.id)) {
			throw new Error(`FrameSequence clip id "${clip.id}" is duplicated.`);
		}
		if (!Number.isInteger(clip.startFrame) || !Number.isInteger(clip.endFrame)) {
			throw new Error(`FrameSequence clip "${clip.id}" frame bounds must be integers.`);
		}
		if (clip.startFrame < 0 || clip.endFrame >= this.frames.length || clip.startFrame > clip.endFrame) {
			throw new Error(
				`FrameSequence clip "${clip.id}" has invalid bounds ${clip.startFrame}-${clip.endFrame} for ${this.frames.length} frames.`,
			);
		}

		this.clips.set(clip.id, clip);
	}

	private getClipOrThrow(clipId: string): AnimationClip {
		const clip = this.clips.get(clipId);
		if (!clip) {
			throw new Error(`Unknown FrameSequence clip "${clipId}".`);
		}
		return clip;
	}

	private validateFrames(frames: readonly SampleSet[]): void {
		frames.forEach((frame, frameIndex) => {
			if (!Number.isInteger(frame.count) || frame.count < 0) {
				throw new Error(`FrameSequence frame ${frameIndex} has invalid count ${frame.count}.`);
			}

			this.assertCapacity(frameIndex, 'positions', frame.positions.length, 3, frame.count);
			this.assertCapacity(frameIndex, 'colors', frame.colors.length, 3, frame.count);
			this.assertCapacity(frameIndex, 'radii', frame.radii.length, 1, frame.count);
			this.assertCapacity(frameIndex, 'opacities', frame.opacities.length, 1, frame.count);
			this.assertOptionalCapacity(frameIndex, 'ids', frame.ids?.length, 1, frame.count);
			this.assertOptionalCapacity(frameIndex, 'normals', frame.normals?.length, 3, frame.count);
			this.assertOptionalCapacity(frameIndex, 'orientations', frame.orientations?.length, 3, frame.count);
			this.assertOptionalCapacity(frameIndex, 'velocities', frame.velocities?.length, 3, frame.count);
			this.assertOptionalCapacity(frameIndex, 'anchors', frame.anchors?.length, 1, frame.count);
			this.assertOptionalCapacity(frameIndex, 'barycentrics', frame.barycentrics?.length, 3, frame.count);
			this.assertOptionalCapacity(frameIndex, 'uv', frame.uv?.length, 2, frame.count);
		});
	}

	private assertOptionalCapacity(
		frameIndex: number,
		fieldName: string,
		length: number | undefined,
		stride: number,
		count: number,
	): void {
		if (length === undefined) return;
		this.assertCapacity(frameIndex, fieldName, length, stride, count);
	}

	private assertCapacity(
		frameIndex: number,
		fieldName: string,
		length: number,
		stride: number,
		count: number,
	): void {
		if (length % stride !== 0) {
			throw new Error(
				`FrameSequence frame ${frameIndex} field "${fieldName}" length ${length} is not divisible by stride ${stride}.`,
			);
		}
		if (length / stride < count) {
			throw new Error(
				`FrameSequence frame ${frameIndex} field "${fieldName}" capacity ${length / stride} is smaller than count ${count}.`,
			);
		}
	}
}
