import { describe, expect, it } from 'vitest';
import { applyAlphaMaskToImageData } from '../../src/lib/engine/preprocessing/BackgroundRemoval.js';

describe('applyAlphaMaskToImageData', () => {
	it('replaces only the alpha channel with the predicted mask', () => {
		const source = new Uint8ClampedArray([
			10, 20, 30, 255,
			40, 50, 60, 255,
		]);
		const mask = new Uint8ClampedArray([0, 128]);

		const result = applyAlphaMaskToImageData(source, mask);

		expect(Array.from(result)).toEqual([
			10, 20, 30, 0,
			40, 50, 60, 128,
		]);
	});

	it('does not mutate the source image buffer', () => {
		const source = new Uint8ClampedArray([1, 2, 3, 255]);
		const mask = new Uint8ClampedArray([10]);

		applyAlphaMaskToImageData(source, mask);

		expect(Array.from(source)).toEqual([1, 2, 3, 255]);
	});
});
