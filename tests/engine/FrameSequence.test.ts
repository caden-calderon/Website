import { describe, expect, it } from 'vitest';
import { FrameSequence } from '../../src/lib/engine/animation/FrameSequence.js';
import type { AnimationClip } from '../../src/lib/engine/animation/types.js';
import type { SampleSet } from '../../src/lib/engine/core/types.js';
import { createSampleSet } from '../../src/lib/engine/core/SampleSet.js';

function makeFrame(frameValue: number, count = 2, includeNormals = false): SampleSet {
	const samples = createSampleSet({ count, includeIds: true, includeNormals });
	for (let i = 0; i < count; i++) {
		const i3 = i * 3;
		samples.positions[i3] = frameValue * 10 + i;
		samples.positions[i3 + 1] = frameValue * 10 + i + 0.25;
		samples.positions[i3 + 2] = -frameValue * 10 - i;
		samples.colors[i3] = frameValue / 10;
		samples.colors[i3 + 1] = i / 10;
		samples.colors[i3 + 2] = 1;
		samples.radii[i] = frameValue + 1;
		samples.opacities[i] = 1 - i * 0.1;
		samples.ids![i] = frameValue * 100 + i;

		if (samples.normals) {
			samples.normals[i3] = frameValue;
			samples.normals[i3 + 1] = frameValue + 1;
			samples.normals[i3 + 2] = frameValue + 2;
		}
	}

	return samples;
}

describe('FrameSequence', () => {
	it('allocates one shared playback buffer sized to the maximum frame count', () => {
		const sequence = new FrameSequence({
			frames: [makeFrame(0, 3, true), makeFrame(1, 1)],
			fps: 24,
		});

		const playback = sequence.getPlaybackSamples();
		expect(playback.count).toBe(3);
		expect(playback.positions.length).toBe(9);
		expect(playback.ids).toBeDefined();
		expect(playback.normals).toBeDefined();
		expect(Array.from(playback.positions.slice(0, 9)).map((value) => (Object.is(value, -0) ? 0 : value))).toEqual([
			0, 0.25, 0,
			1, 1.25, -1,
			2, 2.25, -2,
		]);
	});

	it('only copies frame data when the visible frame index changes', () => {
		const sequence = new FrameSequence({
			frames: [makeFrame(0), makeFrame(1), makeFrame(2)],
			fps: 10,
		});

		const playback = sequence.getPlaybackSamples();
		const originalReference = playback;

		const halfTick = sequence.tick(50);
		expect(halfTick.frameChanged).toBe(false);
		expect(halfTick.copiedFrame).toBe(false);
		expect(sequence.getPlaybackSamples()).toBe(originalReference);
		expect(sequence.getCurrentFrameIndex()).toBe(0);

		const fullTick = sequence.tick(50);
		expect(fullTick.frameChanged).toBe(true);
		expect(fullTick.copiedFrame).toBe(true);
		expect(fullTick.frameIndex).toBe(1);
		expect(Array.from(playback.positions.slice(0, 6))).toEqual([10, 10.25, -10, 11, 11.25, -11]);
	});

	it('keeps SampleSet.count authoritative when clips move between larger and smaller frames', () => {
		const clips: AnimationClip[] = [
			{ id: 'loop', startFrame: 0, endFrame: 1, mode: 'loop' },
		];
		const sequence = new FrameSequence({
			frames: [makeFrame(0, 3), makeFrame(1, 1)],
			fps: 5,
			clips,
			initialClipId: 'loop',
		});

		const playback = sequence.getPlaybackSamples();
		expect(playback.count).toBe(3);

		const next = sequence.tick(200);
		expect(next.frameIndex).toBe(1);
		expect(next.copiedFrame).toBe(true);
		expect(playback.count).toBe(1);
		expect(playback.positions.length).toBe(9);

		const wrapped = sequence.tick(200);
		expect(wrapped.frameIndex).toBe(0);
		expect(wrapped.looped).toBe(true);
		expect(playback.count).toBe(3);
	});

	it('clamps once clips at the endpoint and stops playback deterministically', () => {
		const clips: AnimationClip[] = [
			{ id: 'once', startFrame: 0, endFrame: 2, mode: 'once' },
		];
		const sequence = new FrameSequence({
			frames: [makeFrame(0), makeFrame(1), makeFrame(2)],
			fps: 10,
			clips,
			initialClipId: 'once',
		});

		expect(sequence.tick(200)).toMatchObject({
			frameIndex: 2,
			ended: false,
			playing: true,
		});

		expect(sequence.tick(50)).toMatchObject({
			frameIndex: 2,
			frameChanged: false,
			copiedFrame: false,
			ended: false,
			playing: true,
		});

		expect(sequence.tick(50)).toMatchObject({
			frameIndex: 2,
			frameChanged: false,
			copiedFrame: false,
			ended: true,
			playing: false,
		});
	});

	it('plays ping-pong clips without duplicating endpoints and flips direction at the boundary', () => {
		const clips: AnimationClip[] = [
			{ id: 'ping', startFrame: 0, endFrame: 2, mode: 'ping-pong' },
		];
		const sequence = new FrameSequence({
			frames: [makeFrame(0), makeFrame(1), makeFrame(2)],
			fps: 5,
			clips,
			initialClipId: 'ping',
		});

		expect(sequence.tick(200)).toMatchObject({ frameIndex: 1, direction: 'forward' });
		expect(sequence.tick(200)).toMatchObject({ frameIndex: 2, direction: 'backward' });
		expect(sequence.tick(200)).toMatchObject({ frameIndex: 1, direction: 'backward' });
		expect(sequence.tick(200)).toMatchObject({ frameIndex: 0, direction: 'forward', looped: true });
	});

	it('resets clip time and direction deterministically when switching clips', () => {
		const clips: AnimationClip[] = [
			{ id: 'ping', startFrame: 0, endFrame: 2, mode: 'ping-pong' },
			{ id: 'once', startFrame: 1, endFrame: 2, mode: 'once' },
		];
		const sequence = new FrameSequence({
			frames: [makeFrame(0), makeFrame(1), makeFrame(2)],
			fps: 5,
			clips,
			initialClipId: 'ping',
		});

		sequence.tick(400);
		expect(sequence.getCurrentFrameIndex()).toBe(2);
		expect(sequence.getDirection()).toBe('backward');

		const switched = sequence.setClip('once');
		expect(switched).toMatchObject({
			clipId: 'once',
			frameIndex: 1,
			direction: 'forward',
			frameChanged: true,
			copiedFrame: true,
		});

		const resetPing = sequence.setClip('ping');
		expect(resetPing).toMatchObject({
			clipId: 'ping',
			frameIndex: 0,
			direction: 'forward',
			frameChanged: true,
			copiedFrame: true,
		});
	});

	it('supports deterministic seek within the active clip', () => {
		const clips: AnimationClip[] = [
			{ id: 'ping', startFrame: 0, endFrame: 3, mode: 'ping-pong' },
		];
		const sequence = new FrameSequence({
			frames: [makeFrame(0), makeFrame(1), makeFrame(2), makeFrame(3)],
			fps: 8,
			clips,
			initialClipId: 'ping',
		});

		const seeked = sequence.seekToFrame(2, 'backward');
		expect(seeked).toMatchObject({
			frameIndex: 2,
			direction: 'backward',
			frameChanged: true,
			copiedFrame: true,
		});

		expect(sequence.tick(125)).toMatchObject({
			frameIndex: 1,
			direction: 'backward',
		});
	});
});
