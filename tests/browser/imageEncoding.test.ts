import { describe, expect, it } from 'vitest';
import { resolveEncodedBitmapSize } from '../../src/lib/browser/imageEncoding.js';

describe('imageEncoding', () => {
	it('preserves size when no max edge is provided', () => {
		expect(resolveEncodedBitmapSize(1600, 900)).toEqual({
			width: 1600,
			height: 900,
		});
	});

	it('scales down to fit the longest edge while preserving aspect ratio', () => {
		expect(resolveEncodedBitmapSize(4000, 2000, 1000)).toEqual({
			width: 1000,
			height: 500,
		});
		expect(resolveEncodedBitmapSize(1200, 2400, 600)).toEqual({
			width: 300,
			height: 600,
		});
	});

	it('never returns dimensions smaller than one pixel', () => {
		expect(resolveEncodedBitmapSize(1, 5000, 1)).toEqual({
			width: 1,
			height: 1,
		});
	});
});
