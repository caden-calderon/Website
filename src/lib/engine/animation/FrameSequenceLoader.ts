import { PlyAdapter } from '../ingest/PlyAdapter.js';
import type { SampleSet } from '../core/types.js';
import type { PlyAdapterOptions } from '../ingest/types.js';
import { FrameSequence } from './FrameSequence.js';
import type { AnimationClip, FrameSequenceLoaderOptions, PointSequenceManifest } from './types.js';

export interface FrameSequenceLoaderConfig {
	plyOptions?: PlyAdapterOptions;
}

/**
 * Builds FrameSequence instances from caller-provided frame bytes.
 *
 * Fetch/path policy stays outside the engine. Callers either hand over raw
 * ArrayBuffers directly or provide a callback that resolves them per frame.
 */
export class FrameSequenceLoader {
	private readonly defaultPlyOptions?: PlyAdapterOptions;
	private readonly plyAdapter = new PlyAdapter();

	constructor(config: FrameSequenceLoaderConfig = {}) {
		this.defaultPlyOptions = config.plyOptions;
	}

	async load(options: FrameSequenceLoaderOptions): Promise<FrameSequence> {
		const { manifest, frames, frameBuffers, loadFrame, initialClipId, autoPlay } = options;
		this.validateManifest(manifest);

		const sourceCount = Number(frames !== undefined) + Number(frameBuffers !== undefined) + Number(loadFrame !== undefined);
		if (sourceCount !== 1) {
			throw new Error(
				'FrameSequenceLoader requires exactly one frame source: provide frames, frameBuffers, or loadFrame.',
			);
		}

		const resolvedFrames = frames
			? this.resolvePreparedFrames(frames, manifest.frameCount)
			: await this.resolveFramesFromBytes({
				frameBuffers,
				loadFrame,
				frameCount: manifest.frameCount,
				plyOptions: { ...this.defaultPlyOptions, ...options.plyOptions },
			});

		return new FrameSequence({
			frames: resolvedFrames,
			fps: manifest.fps,
			clips: manifest.clips,
			initialClipId,
			autoPlay,
		});
	}

	private resolvePreparedFrames(frames: readonly SampleSet[], frameCount: number): readonly SampleSet[] {
		if (frames.length !== frameCount) {
			throw new Error(
				`FrameSequenceLoader received ${frames.length} prepared frames but manifest frameCount is ${frameCount}.`,
			);
		}

		return frames;
	}

	private resolveFrameBuffers(frameBuffers: readonly ArrayBuffer[], frameCount: number): readonly ArrayBuffer[] {
		if (frameBuffers.length !== frameCount) {
			throw new Error(
				`FrameSequenceLoader received ${frameBuffers.length} frame buffers but manifest frameCount is ${frameCount}.`,
			);
		}

		return frameBuffers;
	}

	private async resolveFramesFromLoader(
		loadFrame: (frameIndex: number) => ArrayBuffer | Promise<ArrayBuffer>,
		frameCount: number,
	): Promise<ArrayBuffer[]> {
		return Promise.all(
			Array.from({ length: frameCount }, (_, frameIndex) => loadFrame(frameIndex)),
		);
	}

	private async resolveFramesFromBytes(options: {
		frameBuffers?: readonly ArrayBuffer[];
		loadFrame?: (frameIndex: number) => ArrayBuffer | Promise<ArrayBuffer>;
		frameCount: number;
		plyOptions?: PlyAdapterOptions;
	}): Promise<SampleSet[]> {
		const { frameBuffers, loadFrame, frameCount, plyOptions } = options;
		const buffers = frameBuffers
			? this.resolveFrameBuffers(frameBuffers, frameCount)
			: await this.resolveFramesFromLoader(loadFrame!, frameCount);

		return buffers.map((buffer, frameIndex) => {
			if (!(buffer instanceof ArrayBuffer)) {
				throw new Error(`FrameSequenceLoader frame ${frameIndex} did not resolve to an ArrayBuffer.`);
			}

			return this.plyAdapter.sample(buffer, plyOptions);
		});
	}

	private validateManifest(manifest: PointSequenceManifest): void {
		if (manifest.version !== 1) {
			throw new Error(`Unsupported point-sequence manifest version ${manifest.version}.`);
		}
		if (!Number.isFinite(manifest.fps) || manifest.fps <= 0) {
			throw new Error(`Point-sequence manifest fps must be > 0; received ${manifest.fps}.`);
		}
		if (!Number.isInteger(manifest.frameCount) || manifest.frameCount <= 0) {
			throw new Error(
				`Point-sequence manifest frameCount must be a positive integer; received ${manifest.frameCount}.`,
			);
		}
		if (manifest.frameTimestampsMs.length !== manifest.frameCount) {
			throw new Error(
				`Point-sequence manifest frameTimestampsMs length ${manifest.frameTimestampsMs.length} does not match frameCount ${manifest.frameCount}.`,
			);
		}
		if (manifest.frameFiles && manifest.frameFiles.length !== manifest.frameCount) {
			throw new Error(
				`Point-sequence manifest frameFiles length ${manifest.frameFiles.length} does not match frameCount ${manifest.frameCount}.`,
			);
		}

		let previousTimestamp = Number.NEGATIVE_INFINITY;
		for (let i = 0; i < manifest.frameTimestampsMs.length; i++) {
			const timestamp = manifest.frameTimestampsMs[i];
			if (!Number.isFinite(timestamp)) {
				throw new Error(`Point-sequence manifest timestamp at index ${i} is not finite.`);
			}
			if (timestamp < previousTimestamp) {
				throw new Error('Point-sequence manifest frameTimestampsMs must be non-decreasing.');
			}
			previousTimestamp = timestamp;
		}
		if (manifest.frameFiles) {
			for (let i = 0; i < manifest.frameFiles.length; i++) {
				if (!manifest.frameFiles[i].trim()) {
					throw new Error(`Point-sequence manifest frameFiles entry at index ${i} must be non-empty.`);
				}
			}
		}

		if (!manifest.coordinateSystem.upAxis.trim()) {
			throw new Error('Point-sequence manifest coordinateSystem.upAxis must be non-empty.');
		}
		if (manifest.coordinateSystem.forwardAxis !== undefined && !manifest.coordinateSystem.forwardAxis.trim()) {
			throw new Error('Point-sequence manifest coordinateSystem.forwardAxis must be non-empty when provided.');
		}
		if (!manifest.units.trim()) {
			throw new Error('Point-sequence manifest units must be non-empty.');
		}
		if (!this.isRecord(manifest.processing)) {
			throw new Error('Point-sequence manifest processing metadata must be an object.');
		}

		if (manifest.capture) {
			if (
				manifest.capture.calibration !== undefined &&
				!this.isRecord(manifest.capture.calibration)
			) {
				throw new Error('Point-sequence manifest capture.calibration must be an object when provided.');
			}
			if (
				manifest.capture.metadata !== undefined &&
				!this.isRecord(manifest.capture.metadata)
			) {
				throw new Error('Point-sequence manifest capture.metadata must be an object when provided.');
			}
		}

		this.validateClips(manifest.clips, manifest.frameCount);
	}

	private validateClips(clips: readonly AnimationClip[] | undefined, frameCount: number): void {
		if (!clips) return;

		const clipIds = new Set<string>();
		for (const clip of clips) {
			if (!clip.id) {
				throw new Error('Point-sequence manifest clip ids must be non-empty.');
			}
			if (clipIds.has(clip.id)) {
				throw new Error(`Point-sequence manifest clip id "${clip.id}" is duplicated.`);
			}
			if (!Number.isInteger(clip.startFrame) || !Number.isInteger(clip.endFrame)) {
				throw new Error(`Point-sequence manifest clip "${clip.id}" frame bounds must be integers.`);
			}
			if (clip.startFrame < 0 || clip.endFrame >= frameCount || clip.startFrame > clip.endFrame) {
				throw new Error(
					`Point-sequence manifest clip "${clip.id}" has invalid bounds ${clip.startFrame}-${clip.endFrame} for ${frameCount} frames.`,
				);
			}

			clipIds.add(clip.id);
		}
	}

	private isRecord(value: unknown): value is Record<string, unknown> {
		return typeof value === 'object' && value !== null && !Array.isArray(value);
	}
}
