import type { SampleSet } from '../core/types.js';
import type { SampleProcessor, ProcessorParams } from './types.js';
import { cloneSampleSet } from '../core/SampleSet.js';

export interface ColorParams extends ProcessorParams {
	/** Hue rotation in degrees (−180 … 180) */
	hueShift: number;
	/** Saturation scale (0 … 2) */
	saturation: number;
	/** Lightness scale (0 … 2) */
	brightness: number;
	/** Contrast scale around 0.5 (0 … 2) */
	contrast: number;
}

/* ---- colour-space helpers (CPU-side, mirrors the shader) ---- */

function rgb2hsl(r: number, g: number, b: number): [number, number, number] {
	const hi = Math.max(r, g, b);
	const lo = Math.min(r, g, b);
	const l = (hi + lo) / 2;
	if (hi === lo) return [0, 0, l];

	const d = hi - lo;
	const s = l > 0.5 ? d / (2 - hi - lo) : d / (hi + lo);

	let h: number;
	if (hi === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
	else if (hi === g) h = ((b - r) / d + 2) / 6;
	else h = ((r - g) / d + 4) / 6;

	return [h, s, l];
}

function hue2rgb(p: number, q: number, t: number): number {
	if (t < 0) t += 1;
	if (t > 1) t -= 1;
	if (t < 1 / 6) return p + (q - p) * 6 * t;
	if (t < 0.5) return q;
	if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
	return p;
}

function hsl2rgb(h: number, s: number, l: number): [number, number, number] {
	if (s === 0) return [l, l, l];
	const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
	const p = 2 * l - q;
	return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)];
}

function clamp01(v: number): number {
	return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * CPU-side colour grading processor.
 *
 * Useful for baking colour adjustments into the SampleSet before upload
 * rather than paying the cost per-fragment. Operates on a clone to keep
 * the source immutable.
 */
export class ColorProcessor implements SampleProcessor {
	readonly name = 'color';

	process(samples: SampleSet, params: ProcessorParams): SampleSet {
		const p = params as ColorParams;
		const hueShift = (p.hueShift ?? 0) / 360;
		const sat = p.saturation ?? 1;
		const bright = p.brightness ?? 1;
		const contrast = p.contrast ?? 1;

		const result = cloneSampleSet(samples);
		const c = result.colors;

		for (let i = 0; i < result.count; i++) {
			const i3 = i * 3;

			// Contrast around 0.5 midpoint
			let r = (c[i3] - 0.5) * contrast + 0.5;
			let g = (c[i3 + 1] - 0.5) * contrast + 0.5;
			let b = (c[i3 + 2] - 0.5) * contrast + 0.5;

			let [h, s, l] = rgb2hsl(clamp01(r), clamp01(g), clamp01(b));

			h = ((h + hueShift) % 1 + 1) % 1; // wrap positive
			s = clamp01(s * sat);
			l = clamp01(l * bright);

			const [nr, ng, nb] = hsl2rgb(h, s, l);
			c[i3] = nr;
			c[i3 + 1] = ng;
			c[i3 + 2] = nb;
		}

		return result;
	}
}
