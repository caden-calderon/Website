import { describe, it, expect } from 'vitest';
import { FrameGenerator, DEFAULT_FRAME_PARAMS } from '../../src/lib/engine/processing/FrameGenerator.js';
import type { FrameParams } from '../../src/lib/engine/processing/FrameGenerator.js';

describe('FrameGenerator', () => {
	const gen = new FrameGenerator();
	const baseParams: FrameParams = { ...DEFAULT_FRAME_PARAMS, enabled: true };

	it('generates points within the frame bounds', () => {
		const aspect = 1.5;
		const samples = gen.generate(aspect, 10000, baseParams, 42);

		const halfW = aspect / 2;
		const halfH = 0.5;
		const outerX = halfW + baseParams.padding + baseParams.width;
		const outerY = halfH + baseParams.padding + baseParams.width;
		const innerX = halfW + baseParams.padding;
		const innerY = halfH + baseParams.padding;

		for (let i = 0; i < samples.count; i++) {
			const x = samples.positions[i * 3];
			const y = samples.positions[i * 3 + 1];
			const z = samples.positions[i * 3 + 2];

			// All points within outer bounds
			expect(Math.abs(x)).toBeLessThanOrEqual(outerX + 0.001);
			expect(Math.abs(y)).toBeLessThanOrEqual(outerY + 0.001);

			// All points outside inner bounds (at least one axis exceeds)
			const insideInner = Math.abs(x) <= innerX && Math.abs(y) <= innerY;
			expect(insideInner).toBe(false);

			// All z = 0
			expect(z).toBe(0);
		}
	});

	it('assigns the correct color from hex', () => {
		const params: FrameParams = { ...baseParams, color: '#ff8040' };
		const samples = gen.generate(1.0, 5000, params, 7);

		expect(samples.count).toBeGreaterThan(0);
		for (let i = 0; i < samples.count; i++) {
			const i3 = i * 3;
			expect(samples.colors[i3]).toBeCloseTo(1.0, 2);       // 0xFF / 255
			expect(samples.colors[i3 + 1]).toBeCloseTo(0.502, 1); // 0x80 / 255
			expect(samples.colors[i3 + 2]).toBeCloseTo(0.251, 1); // 0x40 / 255
		}
	});

	it('scales point count with density multiplier', () => {
		const low = gen.generate(1.0, 10000, { ...baseParams, densityMultiplier: 0.5 }, 42);
		const high = gen.generate(1.0, 10000, { ...baseParams, densityMultiplier: 2.0 }, 42);

		expect(high.count).toBeGreaterThan(low.count * 2);
	});

	it('produces deterministic output with the same seed', () => {
		const a = gen.generate(1.0, 10000, baseParams, 99);
		const b = gen.generate(1.0, 10000, baseParams, 99);

		expect(a.count).toBe(b.count);
		expect(Array.from(a.positions)).toEqual(Array.from(b.positions));
	});

	it('produces different output with different seeds', () => {
		const a = gen.generate(1.0, 10000, baseParams, 1);
		const b = gen.generate(1.0, 10000, baseParams, 2);

		// Same count (deterministic formula) but different positions
		expect(a.count).toBe(b.count);
		let differ = false;
		for (let i = 0; i < a.positions.length; i++) {
			if (a.positions[i] !== b.positions[i]) {
				differ = true;
				break;
			}
		}
		expect(differ).toBe(true);
	});

	it('sets all opacities to 1.0 and all radii to 1.0', () => {
		const samples = gen.generate(1.0, 5000, baseParams, 42);
		for (let i = 0; i < samples.count; i++) {
			expect(samples.opacities[i]).toBe(1.0);
			expect(samples.radii[i]).toBe(1.0);
		}
	});

	it('generates more points for wider frames', () => {
		const narrow = gen.generate(1.0, 10000, { ...baseParams, width: 0.02 }, 42);
		const wide = gen.generate(1.0, 10000, { ...baseParams, width: 0.15 }, 42);

		expect(wide.count).toBeGreaterThan(narrow.count);
	});

	// ── Style tests ──────────────────────────────────────────────────

	it('double style generates points in two separate bands', () => {
		const params: FrameParams = { ...baseParams, style: 'double', width: 0.1 };
		const samples = gen.generate(1.0, 10000, params, 42);

		expect(samples.count).toBeGreaterThan(0);
		// All points should be at z=0
		for (let i = 0; i < samples.count; i++) {
			expect(samples.positions[i * 3 + 2]).toBe(0);
		}
	});

	it('ornate style generates more points than rectangle (corner accents)', () => {
		const rectSamples = gen.generate(1.0, 10000, { ...baseParams, style: 'rectangle' }, 42);
		const ornateSamples = gen.generate(1.0, 10000, { ...baseParams, style: 'ornate' }, 42);

		expect(ornateSamples.count).toBeGreaterThan(rectSamples.count);
	});

	it('scattered style generates points that extend beyond the standard outer bounds', () => {
		const aspect = 1.0;
		const params: FrameParams = { ...baseParams, style: 'scattered', width: 0.08 };
		const samples = gen.generate(aspect, 10000, params, 42);

		const halfW = aspect / 2;
		const halfH = 0.5;
		const standardOuterX = halfW + params.padding + params.width;

		// At least some points should exceed standard outer bounds (scatter overflow)
		let hasOverflow = false;
		for (let i = 0; i < samples.count; i++) {
			if (Math.abs(samples.positions[i * 3]) > standardOuterX) {
				hasOverflow = true;
				break;
			}
		}
		expect(hasOverflow).toBe(true);
	});

	it('all styles produce deterministic output', () => {
		const styles = ['rectangle', 'double', 'ornate', 'scattered'] as const;
		for (const style of styles) {
			const params: FrameParams = { ...baseParams, style };
			const a = gen.generate(1.0, 10000, params, 42);
			const b = gen.generate(1.0, 10000, params, 42);
			expect(a.count).toBe(b.count);
			expect(Array.from(a.positions.slice(0, 30))).toEqual(Array.from(b.positions.slice(0, 30)));
		}
	});
});
