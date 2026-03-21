import { describe, it, expect } from 'vitest';
import { Pipeline } from '../../src/lib/engine/processing/Pipeline.js';
import { ColorProcessor } from '../../src/lib/engine/processing/ColorProcessor.js';
import { createSampleSet } from '../../src/lib/engine/core/SampleSet.js';
import type { SampleProcessor, ProcessorParams } from '../../src/lib/engine/processing/types.js';
import type { SampleSet } from '../../src/lib/engine/core/types.js';

/** Doubles every radius — trivial processor for testing pipeline flow. */
class DoubleRadii implements SampleProcessor {
	readonly name = 'double-radii';

	process(samples: SampleSet): SampleSet {
		const radii = new Float32Array(samples.radii);
		for (let i = 0; i < radii.length; i++) radii[i] *= 2;
		return { ...samples, radii };
	}
}

describe('Pipeline', () => {
	it('runs processors in order', () => {
		const s = createSampleSet({ count: 3 });
		s.radii[0] = 1;
		s.radii[1] = 2;
		s.radii[2] = 3;

		const pipeline = new Pipeline().add(new DoubleRadii()).add(new DoubleRadii());
		const result = pipeline.run(s);

		expect(result.radii[0]).toBe(4); // doubled twice
		expect(result.radii[1]).toBe(8);
		expect(result.radii[2]).toBe(12);
	});

	it('returns the input unchanged when empty', () => {
		const s = createSampleSet({ count: 2 });
		s.positions[0] = 42;

		const result = new Pipeline().run(s);
		expect(result).toBe(s); // same reference — no processors, no copy
	});

	it('supports remove by name', () => {
		const pipeline = new Pipeline().add(new DoubleRadii());
		expect(pipeline.run(createSampleSet({ count: 1 })).radii[0]).toBe(0); // 0 × 2

		const s = createSampleSet({ count: 1 });
		s.radii[0] = 5;
		pipeline.remove('double-radii');
		expect(pipeline.run(s).radii[0]).toBe(5); // processor removed, no change
	});
});

describe('ColorProcessor', () => {
	it('applies brightness scaling', () => {
		const s = createSampleSet({ count: 1 });
		s.colors[0] = 0.5;
		s.colors[1] = 0.5;
		s.colors[2] = 0.5;

		const processor = new ColorProcessor();
		const result = processor.process(s, {
			hueShift: 0,
			saturation: 1,
			brightness: 2,
			contrast: 1,
		});

		// Grey (0.5) with brightness 2× → lightness doubled (clamped to 1)
		expect(result.colors[0]).toBeGreaterThan(0.5);
	});

	it('does not mutate the source', () => {
		const s = createSampleSet({ count: 1 });
		s.colors[0] = 0.4;
		s.colors[1] = 0.4;
		s.colors[2] = 0.4;

		const processor = new ColorProcessor();
		processor.process(s, { hueShift: 90, saturation: 1, brightness: 1, contrast: 1 });

		expect(s.colors[0]).toBeCloseTo(0.4, 5); // unchanged (Float32 precision)
	});
});
