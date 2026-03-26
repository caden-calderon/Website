import { describe, it, expect } from 'vitest';
import { createSampleSet, cloneSampleSet, mergeSampleSets } from '../../src/lib/engine/core/SampleSet.js';

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

describe('mergeSampleSets', () => {
	it('returns empty SampleSet for zero inputs', () => {
		const merged = mergeSampleSets();
		expect(merged.count).toBe(0);
		expect(merged.positions.length).toBe(0);
	});

	it('returns the same reference for a single input', () => {
		const set = createSampleSet({ count: 3 });
		set.positions.set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
		expect(mergeSampleSets(set)).toBe(set);
	});

	it('concatenates required fields from two sets', () => {
		const a = createSampleSet({ count: 2 });
		a.positions.set([1, 2, 3, 4, 5, 6]);
		a.colors.set([0.1, 0.2, 0.3, 0.4, 0.5, 0.6]);
		a.radii.set([1.0, 2.0]);
		a.opacities.set([0.5, 0.8]);

		const b = createSampleSet({ count: 1 });
		b.positions.set([7, 8, 9]);
		b.colors.set([0.7, 0.8, 0.9]);
		b.radii.set([3.0]);
		b.opacities.set([1.0]);

		const merged = mergeSampleSets(a, b);
		expect(merged.count).toBe(3);
		expect(Array.from(merged.positions)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
		for (let i = 0; i < 9; i++) {
			expect(merged.colors[i]).toBeCloseTo([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9][i], 5);
		}
		expect(Array.from(merged.radii)).toEqual([1.0, 2.0, 3.0]);
		for (let i = 0; i < 3; i++) {
			expect(merged.opacities[i]).toBeCloseTo([0.5, 0.8, 1.0][i], 5);
		}
	});

	it('preserves stable ids when they are already unique', () => {
		const a = createSampleSet({ count: 2, includeIds: true });
		a.ids!.set([10, 20]);
		const b = createSampleSet({ count: 3, includeIds: true });
		b.ids!.set([30, 31, 32]);

		const merged = mergeSampleSets(a, b);
		expect(merged.ids).toBeDefined();
		expect(Array.from(merged.ids!)).toEqual([10, 20, 30, 31, 32]);
	});

	it('assigns fresh ids for samples from inputs without ids', () => {
		const withIds = createSampleSet({ count: 2, includeIds: true });
		withIds.ids!.set([10, 11]);
		const withoutIds = createSampleSet({ count: 2 });

		const merged = mergeSampleSets(withIds, withoutIds);
		expect(merged.ids).toBeDefined();
		expect(Array.from(merged.ids!)).toEqual([10, 11, 12, 13]);
	});

	it('remaps duplicate ids to keep the merged set unique', () => {
		const a = createSampleSet({ count: 2, includeIds: true });
		a.ids!.set([5, 6]);
		const b = createSampleSet({ count: 2, includeIds: true });
		b.ids!.set([6, 7]);

		const merged = mergeSampleSets(a, b);
		expect(merged.ids).toBeDefined();
		expect(Array.from(merged.ids!)).toEqual([5, 6, 8, 7]);
	});

	it('preserves optional metadata even when only some inputs provide it', () => {
		const image = createSampleSet({ count: 1, includeIds: true, includeNormals: true, includeUv: true });
		image.ids!.set([42]);
		image.normals!.set([0, 0, 1]);
		image.uv!.set([0.25, 0.75]);

		const frame = createSampleSet({ count: 1 });

		const merged = mergeSampleSets(image, frame);
		expect(merged.ids).toBeDefined();
		expect(Array.from(merged.ids!)).toEqual([42, 43]);
		expect(merged.normals).toBeDefined();
		expect(Array.from(merged.normals!)).toEqual([0, 0, 1, 0, 0, 0]);
		expect(merged.uv).toBeDefined();
		expect(Array.from(merged.uv!)).toEqual([0.25, 0.75, 0, 0]);
	});

	it('includes uv when all inputs have it', () => {
		const a = createSampleSet({ count: 1, includeUv: true });
		a.uv!.set([0.25, 0.75]);
		const b = createSampleSet({ count: 1, includeUv: true });
		b.uv!.set([0.5, 0.5]);

		const merged = mergeSampleSets(a, b);
		expect(merged.uv).toBeDefined();
		expect(Array.from(merged.uv!)).toEqual([0.25, 0.75, 0.5, 0.5]);
	});

	it('handles three or more sets', () => {
		const sets = [1, 2, 3].map((n) => {
			const s = createSampleSet({ count: 1 });
			s.radii.set([n]);
			return s;
		});

		const merged = mergeSampleSets(...sets);
		expect(merged.count).toBe(3);
		expect(Array.from(merged.radii)).toEqual([1, 2, 3]);
	});
});
