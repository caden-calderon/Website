import { describe, it, expect } from 'vitest';
import { createSampleSet, cloneSampleSet } from '../../src/lib/engine/core/SampleSet.js';

describe('createSampleSet', () => {
	it('allocates typed arrays of the correct size', () => {
		const s = createSampleSet({ count: 100 });

		expect(s.count).toBe(100);
		expect(s.positions).toBeInstanceOf(Float32Array);
		expect(s.positions.length).toBe(300); // 100 × 3
		expect(s.colors.length).toBe(300);
		expect(s.radii.length).toBe(100);
		expect(s.opacities.length).toBe(100);
	});

	it('omits optional fields by default', () => {
		const s = createSampleSet({ count: 10 });
		expect(s.ids).toBeUndefined();
		expect(s.normals).toBeUndefined();
		expect(s.uv).toBeUndefined();
	});

	it('includes optional fields when requested', () => {
		const s = createSampleSet({ count: 10, includeIds: true, includeNormals: true, includeUv: true });
		expect(s.ids).toBeInstanceOf(Uint32Array);
		expect(s.ids!.length).toBe(10);
		expect(s.normals!.length).toBe(30);
		expect(s.uv!.length).toBe(20);
	});

	it('initialises arrays to zero', () => {
		const s = createSampleSet({ count: 5 });
		for (let i = 0; i < s.positions.length; i++) {
			expect(s.positions[i]).toBe(0);
		}
	});
});

describe('cloneSampleSet', () => {
	it('produces an independent deep copy', () => {
		const original = createSampleSet({ count: 3, includeNormals: true });
		original.positions[0] = 1;
		original.positions[1] = 2;
		original.positions[2] = 3;
		original.colors[0] = 0.5;

		const clone = cloneSampleSet(original);

		expect(clone.positions[0]).toBe(1);
		expect(clone.colors[0]).toBe(0.5);
		expect(clone.count).toBe(3);

		// Mutation independence
		clone.positions[0] = 99;
		expect(original.positions[0]).toBe(1);
	});

	it('preserves undefined optional fields', () => {
		const original = createSampleSet({ count: 2 });
		const clone = cloneSampleSet(original);
		expect(clone.normals).toBeUndefined();
		expect(clone.ids).toBeUndefined();
	});
});
