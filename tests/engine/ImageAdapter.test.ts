import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageAdapter } from '../../src/lib/engine/ingest/ImageAdapter.js';
import type { DepthMap } from '../../src/lib/engine/preprocessing/DepthEstimation.js';

interface FakeImageSource {
	width: number;
	height: number;
	naturalWidth?: number;
	naturalHeight?: number;
	__pixels: Uint8ClampedArray;
}

function makeFakeImageSource(
	width: number,
	height: number,
	pixels: Uint8ClampedArray,
): FakeImageSource {
	return {
		width,
		height,
		naturalWidth: width,
		naturalHeight: height,
		__pixels: pixels,
	};
}

function installCanvasMock() {
	vi.stubGlobal('HTMLImageElement', class {});
	vi.stubGlobal('document', {
		createElement: (tag: string) => {
			if (tag !== 'canvas') throw new Error(`Unexpected element request: ${tag}`);

			const canvas = {
				width: 0,
				height: 0,
				getContext: () => ({
					drawImage: (source: FakeImageSource) => {
						canvas.__source = source;
					},
					getImageData: () => {
						const source = canvas.__source;
						if (!source) throw new Error('No source image assigned');
						return {
							width: source.naturalWidth ?? source.width,
							height: source.naturalHeight ?? source.height,
							data: source.__pixels,
						};
					},
				}),
				__source: undefined as FakeImageSource | undefined,
			};

			return canvas;
		},
	});
}

beforeEach(() => {
	installCanvasMock();
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('ImageAdapter', () => {
		it('does not sample transparent pixels', () => {
			const pixels = new Uint8ClampedArray([
				255, 255, 255, 255,
				255, 255, 255, 0,
			]);
			const source = makeFakeImageSource(2, 1, pixels);
			const adapter = new ImageAdapter();

			const samples = adapter.sample(source as unknown as HTMLCanvasElement, {
				count: 64,
			algorithm: 'importance',
			baseRadius: 1,
			seed: 7,
		});

		expect(samples.count).toBe(64);
		for (let i = 0; i < samples.count; i++) {
			expect(samples.uv![i * 2]).toBeLessThan(0.5);
		}
	});

		it('prefers the supplied depth map over luminance depth', () => {
			const pixels = new Uint8ClampedArray([255, 255, 255, 255]);
			const source = makeFakeImageSource(1, 1, pixels);
			const adapter = new ImageAdapter();
		const depthMap: DepthMap = {
			data: new Float32Array([1]),
			width: 1,
			height: 1,
			modelId: 'test-depth',
		};

			const withDepthMap = adapter.sample(source as unknown as HTMLCanvasElement, {
				count: 4,
				algorithm: 'importance',
			baseRadius: 1,
			seed: 3,
			depthScale: 0.4,
			depthMap,
		});

		const withLuminanceDepth = adapter.sample(source as unknown as HTMLCanvasElement, {
			count: 4,
			algorithm: 'importance',
			baseRadius: 1,
			seed: 3,
			depthScale: 0.4,
		});

		for (let i = 0; i < withDepthMap.count; i++) {
			expect(withDepthMap.positions[i * 3 + 2]).toBeCloseTo(0.2, 5);
			expect(withDepthMap.positions[i * 3 + 2]).not.toBeCloseTo(
				withLuminanceDepth.positions[i * 3 + 2],
				5,
			);
		}
	});

	it('sizeVariation=0 produces uniform radii when radiusFromLuminance is on', () => {
		// Gradient: dark to bright across 4 pixels
		const pixels = new Uint8ClampedArray([
			0, 0, 0, 255,
			85, 85, 85, 255,
			170, 170, 170, 255,
			255, 255, 255, 255,
		]);
		const source = makeFakeImageSource(4, 1, pixels);
		const adapter = new ImageAdapter();

		const samples = adapter.sample(source as unknown as HTMLCanvasElement, {
			count: 32,
			algorithm: 'importance',
			baseRadius: 1.0,
			seed: 42,
			radiusFromLuminance: true,
			sizeVariation: 0,
		});

		// All radii should be baseRadius * 1.0 (minScale=1.0, maxScale=1.0)
		for (let i = 0; i < samples.count; i++) {
			expect(samples.radii[i]).toBeCloseTo(1.0, 3);
		}
	});

	it('sizeVariation=1.0 produces a wider radius range than default', () => {
		// 4-pixel gradient with varied luminance so samples land on different brightnesses
		const pixels = new Uint8ClampedArray([
			64, 64, 64, 255,
			128, 128, 128, 255,
			192, 192, 192, 255,
			255, 255, 255, 255,
		]);
		const source = makeFakeImageSource(4, 1, pixels);
		const adapter = new ImageAdapter();

		const defaultVar = adapter.sample(source as unknown as HTMLCanvasElement, {
			count: 64,
			algorithm: 'importance',
			baseRadius: 1.0,
			seed: 42,
			radiusFromLuminance: true,
			// sizeVariation defaults to 0.4
		});

		const maxVar = adapter.sample(source as unknown as HTMLCanvasElement, {
			count: 64,
			algorithm: 'importance',
			baseRadius: 1.0,
			seed: 42,
			radiusFromLuminance: true,
			sizeVariation: 1.0,
		});

		// Max variation should have a wider spread
		const defaultMin = Math.min(...Array.from(defaultVar.radii));
		const defaultMax = Math.max(...Array.from(defaultVar.radii));
		const maxMin = Math.min(...Array.from(maxVar.radii));
		const maxMax = Math.max(...Array.from(maxVar.radii));

		expect(maxMax - maxMin).toBeGreaterThan(defaultMax - defaultMin);
	});
});
