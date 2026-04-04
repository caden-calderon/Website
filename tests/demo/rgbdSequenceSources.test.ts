import { describe, expect, it, vi } from 'vitest';
import {
	decodeDepthFrame,
	decodeRasterFrame,
	defaultResolveRgbdColorUrl,
	loadRgbdSequencePlaybackSource,
} from '../../src/lib/demo/rgbdSequenceSources.js';
import type { DemoRgbdSequenceAsset } from '../../src/lib/demo/assets.js';
import type { EncodedDepthFrame, EncodedRasterFrame, RgbdSequenceManifest } from '../../src/lib/demo/rgbdSequenceTypes.js';

const baseAsset: DemoRgbdSequenceAsset = {
	kind: 'rgbd-sequence',
	source: 'manifest',
	id: 'procedural-rgbd-portrait',
	label: 'Procedural RGBD Portrait',
	manifestUrl: '/api/rgbd-sequences/procedural-rgbd-portrait/manifest.json',
	description: 'Synthetic RGBD test asset.',
	initialClipId: 'portrait_turn',
};

function makeManifest(): RgbdSequenceManifest {
	return {
		version: 1,
		fps: 12,
		frameCount: 2,
		frameTimestampsMs: [0, 83.333],
		frames: [
			{ colorFile: 'color-0000.json', depthFile: 'depth-0000.json' },
			{ colorFile: 'color-0001.json', depthFile: 'depth-0001.json' },
		],
		clips: [{ id: 'portrait_turn', startFrame: 0, endFrame: 1, mode: 'loop' }],
		raster: {
			width: 2,
			height: 1,
			colorEncoding: 'rgba8-json-base64',
		},
		depth: {
			width: 2,
			height: 1,
			encoding: 'float32-json-base64',
			semantics: '0-far-1-near',
		},
		coordinateSystem: {
			upAxis: 'y',
			forwardAxis: '-z',
			handedness: 'right',
		},
		units: 'meters',
		processing: {
			dataset: 'test',
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

function encodeRasterFrame(frame: EncodedRasterFrame): string {
	return JSON.stringify(frame);
}

function encodeDepthFrame(frame: EncodedDepthFrame): string {
	return JSON.stringify(frame);
}

describe('rgbdSequenceSources', () => {
	it('loads an RGBD manifest and resolves frame assets relative to the manifest URL', async () => {
		const colorFrame = encodeRasterFrame({
			width: 2,
			height: 1,
			encoding: 'rgba8-json-base64',
			data: Buffer.from(new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255])).toString('base64'),
		});
		const depthFrame = encodeDepthFrame({
			width: 2,
			height: 1,
			encoding: 'float32-json-base64',
			semantics: '0-near-1-far',
			data: Buffer.from(new Float32Array([0.1, 0.8]).buffer).toString('base64'),
		});
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.endsWith('manifest.json')) {
				return withResponseUrl(
					new Response(JSON.stringify(makeManifest()), {
						status: 200,
						headers: { 'content-type': 'application/json' },
					}),
					'http://localhost/api/rgbd-sequences/procedural-rgbd-portrait/manifest.json',
				);
			}
			if (url.endsWith('color-0001.json')) {
				return new Response(colorFrame, { status: 200 });
			}

			expect(url).toBe('http://localhost/api/rgbd-sequences/procedural-rgbd-portrait/depth-0001.json');
			return new Response(depthFrame, { status: 200 });
		}) as unknown as typeof fetch;

		const source = await loadRgbdSequencePlaybackSource(baseAsset, { fetch: fetchMock });
		const frame = await source.loadFrame(1);

		expect(fetchMock).toHaveBeenCalledTimes(3);
		expect(source.manifest.frameCount).toBe(2);
		expect(Array.from(frame.raster.pixels)).toEqual([255, 0, 0, 255, 0, 255, 0, 255]);
		expect(Array.from(frame.depthMap?.data ?? []).map((value) => Number(value.toFixed(3)))).toEqual([0.9, 0.2]);
		expect(frame.sourceBytes.color).toBeGreaterThan(0);
		expect(frame.sourceBytes.depth).toBeGreaterThan(0);
	});

	it('allows the app layer to override RGBD frame URL policy', async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.endsWith('manifest.json')) {
				return withResponseUrl(
					new Response(JSON.stringify(makeManifest()), {
						status: 200,
						headers: { 'content-type': 'application/json' },
					}),
					'http://localhost/api/rgbd-sequences/procedural-rgbd-portrait/manifest.json',
				);
			}

			expect(url).toBe('https://cdn.example.test/rgbd/color-0.bin');
			return new Response(
				encodeRasterFrame({
					width: 2,
					height: 1,
					encoding: 'rgba8-json-base64',
					data: Buffer.from(new Uint8Array(8)).toString('base64'),
				}),
				{ status: 200 },
			);
		}) as unknown as typeof fetch;

		const source = await loadRgbdSequencePlaybackSource(baseAsset, {
			fetch: fetchMock,
			resolveColorUrl: ({ frameIndex }) => `https://cdn.example.test/rgbd/color-${frameIndex}.bin`,
			resolveDepthUrl: () => null,
		});
		await source.loadFrame(0);

		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('decodes raster and depth frame payloads with validation', () => {
		expect(
			decodeRasterFrame(
				encodeRasterFrame({
					width: 1,
					height: 1,
					encoding: 'rgba8-json-base64',
					data: Buffer.from(new Uint8Array([1, 2, 3, 4])).toString('base64'),
				}),
			),
		).toMatchObject({
			width: 1,
			height: 1,
		});

		expect(
			Array.from(
				decodeDepthFrame(
					encodeDepthFrame({
						width: 2,
						height: 1,
						encoding: 'float32-json-base64',
						semantics: '0-far-1-near',
						data: Buffer.from(new Float32Array([0.25, 0.75]).buffer).toString('base64'),
					}),
				).data,
			),
		).toEqual([0.25, 0.75]);

		expect(() =>
			decodeRasterFrame(
				JSON.stringify({
					width: 1,
					height: 1,
					encoding: 'unsupported',
					data: '',
				}),
			),
		).toThrow(/unsupported raster frame encoding/i);
	});

	it('fails clearly when a manifest frame is missing colorFile', () => {
		expect(() =>
			defaultResolveRgbdColorUrl({
				asset: baseAsset,
				manifest: {
					...makeManifest(),
					frames: [{ colorFile: '', depthFile: 'depth-0000.json' }, makeManifest().frames[1]],
				},
				frameIndex: 0,
				manifestUrl: 'http://localhost/api/rgbd-sequences/procedural-rgbd-portrait/manifest.json',
			}),
		).toThrow(/missing colorfile/i);
	});
});
