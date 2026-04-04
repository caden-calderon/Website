import { describe, expect, it, vi } from 'vitest';
import { defaultResolveFrameUrl, loadPointSequencePlaybackSource } from '../../src/lib/demo/pointSequenceSources.js';
import type { DemoPointSequenceAsset } from '../../src/lib/demo/assets.js';
import type { PointSequenceManifest } from '../../src/lib/engine/animation/types.js';

const baseAsset: DemoPointSequenceAsset = {
	kind: 'point-sequence',
	id: 'synthetic-pulse',
	label: 'Synthetic Figure Study',
	manifestUrl: '/api/point-sequences/synthetic-pulse/manifest.json',
	description: 'Synthetic test sequence.',
	initialClipId: 'breathing_idle',
};

function makeManifest(): PointSequenceManifest {
	return {
		version: 1,
		fps: 12,
		frameCount: 2,
		frameTimestampsMs: [0, 83.333],
		frameFiles: ['frame-0000.ply', 'frame-0001.ply'],
		clips: [{ id: 'breathing_idle', startFrame: 0, endFrame: 1, mode: 'loop' }],
		coordinateSystem: {
			upAxis: 'y',
			forwardAxis: '-z',
			handedness: 'right',
		},
		units: 'meters',
		processing: {
			generator: 'synthetic',
		},
	};
}

function withResponseUrl(response: Response, url: string): Response {
	Object.defineProperty(response, 'url', {
		value: url,
		configurable: true,
	});
	return response;
}

describe('pointSequenceSources', () => {
	it('loads a manifest and resolves frame URLs relative to the manifest response URL', async () => {
		const frameBytes = new Uint8Array([1, 2, 3, 4]);
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.endsWith('manifest.json')) {
				return withResponseUrl(
					new Response(JSON.stringify(makeManifest()), {
						status: 200,
						headers: { 'content-type': 'application/json' },
					}),
					'http://localhost/api/point-sequences/synthetic-pulse/manifest.json',
				);
			}

			expect(url).toBe('http://localhost/api/point-sequences/synthetic-pulse/frame-0001.ply');
			return new Response(frameBytes, { status: 200 });
		}) as unknown as typeof fetch;

		const source = await loadPointSequencePlaybackSource(baseAsset, { fetch: fetchMock });
		const frame = await source.loadFrame(1);

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(source.manifest.frameCount).toBe(2);
		expect(Array.from(new Uint8Array(frame))).toEqual([1, 2, 3, 4]);
	});

	it('allows the app layer to override frame URL policy', async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.endsWith('manifest.json')) {
				return withResponseUrl(
					new Response(JSON.stringify(makeManifest()), {
						status: 200,
						headers: { 'content-type': 'application/json' },
					}),
					'http://localhost/api/point-sequences/synthetic-pulse/manifest.json',
				);
			}

			expect(url).toBe('https://cdn.example.test/frames/0.bin');
			return new Response(new Uint8Array([9]), { status: 200 });
		}) as unknown as typeof fetch;

		const source = await loadPointSequencePlaybackSource(baseAsset, {
			fetch: fetchMock,
			resolveFrameUrl: ({ frameIndex }) => `https://cdn.example.test/frames/${frameIndex}.bin`,
		});
		await source.loadFrame(0);

		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('fails clearly when the manifest does not declare frameFiles and no override is provided', () => {
		expect(() =>
			defaultResolveFrameUrl({
				asset: baseAsset,
				manifest: {
					...makeManifest(),
					frameFiles: undefined,
				},
				frameIndex: 0,
				manifestUrl: 'http://localhost/api/point-sequences/synthetic-pulse/manifest.json',
			}),
		).toThrow(/does not declare frameFiles/i);
	});
});
