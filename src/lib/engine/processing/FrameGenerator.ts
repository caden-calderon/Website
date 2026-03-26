import type { SampleSet } from '../core/types.js';
import { createSampleSet } from '../core/SampleSet.js';

export type FrameStyle = 'rectangle' | 'double' | 'ornate' | 'scattered';

export const FRAME_STYLES: { value: FrameStyle; label: string }[] = [
	{ value: 'rectangle', label: 'Rectangle' },
	{ value: 'double', label: 'Double' },
	{ value: 'ornate', label: 'Ornate' },
	{ value: 'scattered', label: 'Scattered' },
];

/** Configuration for the point-based decorative frame. */
export interface FrameParams {
	/** Whether the frame is rendered */
	enabled: boolean;
	/** Frame style */
	style: FrameStyle;
	/** Frame color as hex string e.g. '#e8c872' */
	color: string;
	/** Frame width as fraction of shorter image dimension (0.01–0.2) */
	width: number;
	/** Gap between image edge and frame inner edge (0–0.1) */
	padding: number;
	/** Point density multiplier relative to image density (default 1.0) */
	densityMultiplier: number;
}

export const DEFAULT_FRAME_PARAMS: FrameParams = {
	enabled: false,
	style: 'rectangle',
	color: '#e8c872',
	width: 0.05,
	padding: 0.02,
	densityMultiplier: 1.0,
};

/** Bounds for a rectangular region. */
interface Rect {
	left: number;
	right: number;
	top: number;
	bottom: number;
}

/**
 * Generates a SampleSet of points forming a decorative frame around an image.
 *
 * Frame points share the same coordinate space as ImageAdapter output:
 * image occupies x ∈ [-aspect/2, aspect/2], y ∈ [-0.5, 0.5].
 * The frame surrounds this with configurable padding and width.
 */
export class FrameGenerator {
	generate(
		aspect: number,
		imageSampleCount: number,
		params: FrameParams,
		seed: number = 42,
	): SampleSet {
		const inner = this.computeInnerRect(aspect, params.padding);
		const outer = this.computeOuterRect(inner, params.width);
		const imageDensity = imageSampleCount / (aspect * 1.0);
		const [r, g, b] = parseHexColor(params.color);

		switch (params.style) {
			case 'double':
				return this.generateDouble(inner, outer, imageDensity, params, r, g, b, seed);
			case 'ornate':
				return this.generateOrnate(inner, outer, imageDensity, params, r, g, b, seed);
			case 'scattered':
				return this.generateScattered(inner, outer, imageDensity, params, r, g, b, seed);
			default:
				return this.generateRectangle(inner, outer, imageDensity, params, r, g, b, seed);
		}
	}

	private computeInnerRect(aspect: number, padding: number): Rect {
		const halfW = aspect / 2;
		const halfH = 0.5;
		return {
			left: -(halfW + padding),
			right: halfW + padding,
			top: halfH + padding,
			bottom: -(halfH + padding),
		};
	}

	private computeOuterRect(inner: Rect, width: number): Rect {
		return {
			left: inner.left - width,
			right: inner.right + width,
			top: inner.top + width,
			bottom: inner.bottom - width,
		};
	}

	// ── Rectangle (original) ─────────────────────────────────────────────

	private generateRectangle(
		inner: Rect, outer: Rect, imageDensity: number, params: FrameParams,
		r: number, g: number, b: number, seed: number,
	): SampleSet {
		const frameArea = rectArea(outer) - rectArea(inner);
		const targetCount = Math.max(1, Math.round(frameArea * imageDensity * params.densityMultiplier));
		return this.fillBand(outer, inner, targetCount, r, g, b, seed);
	}

	// ── Double ───────────────────────────────────────────────────────────

	private generateDouble(
		inner: Rect, outer: Rect, imageDensity: number, params: FrameParams,
		r: number, g: number, b: number, seed: number,
	): SampleSet {
		const w = params.width;
		// Split: outer band (35%) | gap (30%) | inner band (35%)
		const outerBandW = w * 0.35;
		const gapW = w * 0.3;
		const innerBandW = w * 0.35;

		// Inner band: sits just outside the inner rect
		const innerBandOuter = expandRect(inner, innerBandW);
		// Outer band: sits just inside the outer rect
		const outerBandInner = shrinkRect(outer, outerBandW);

		const innerBandArea = rectArea(innerBandOuter) - rectArea(inner);
		const outerBandArea = rectArea(outer) - rectArea(outerBandInner);
		const totalArea = innerBandArea + outerBandArea;
		const totalCount = Math.max(1, Math.round(totalArea * imageDensity * params.densityMultiplier));

		// Proportional split
		const innerCount = Math.round(totalCount * (innerBandArea / totalArea));
		const outerCount = totalCount - innerCount;

		const innerSamples = this.fillBand(innerBandOuter, inner, innerCount, r, g, b, seed);
		const outerSamples = this.fillBand(outer, outerBandInner, outerCount, r, g, b, seed + 7919);

		return mergeSamples(innerSamples, outerSamples);
	}

	// ── Ornate ───────────────────────────────────────────────────────────

	private generateOrnate(
		inner: Rect, outer: Rect, imageDensity: number, params: FrameParams,
		r: number, g: number, b: number, seed: number,
	): SampleSet {
		// Base frame band
		const frameArea = rectArea(outer) - rectArea(inner);
		const baseCount = Math.max(1, Math.round(frameArea * imageDensity * params.densityMultiplier));
		const baseSamples = this.fillBand(outer, inner, baseCount, r, g, b, seed);

		// Corner accents: extra-dense square regions at each corner
		const cornerSize = params.width * 1.5;
		const cornerDensity = imageDensity * params.densityMultiplier * 2.5;
		const cornerArea = cornerSize * cornerSize;
		const cornersPerCorner = Math.max(1, Math.round(cornerArea * cornerDensity));

		const corners: Rect[] = [
			{ left: outer.left, right: outer.left + cornerSize, top: outer.top, bottom: outer.top - cornerSize },
			{ left: outer.right - cornerSize, right: outer.right, top: outer.top, bottom: outer.top - cornerSize },
			{ left: outer.left, right: outer.left + cornerSize, top: outer.bottom + cornerSize, bottom: outer.bottom },
			{ left: outer.right - cornerSize, right: outer.right, top: outer.bottom + cornerSize, bottom: outer.bottom },
		];

		let cornerSamples = createSampleSet({ count: 0 });
		let cornerSeed = seed + 3571;
		for (const corner of corners) {
			const cs = this.fillRect(corner, cornersPerCorner, r, g, b, cornerSeed);
			cornerSamples = mergeSamples(cornerSamples, cs);
			cornerSeed += 1009;
		}

		// Inner accent line: thin border just inside the main frame
		const accentWidth = params.width * 0.15;
		const accentInner = expandRect(inner, accentWidth * 0.3);
		const accentOuter = expandRect(inner, accentWidth);
		const accentArea = rectArea(accentOuter) - rectArea(accentInner);
		const accentCount = Math.max(1, Math.round(accentArea * imageDensity * params.densityMultiplier * 0.8));
		const accentSamples = this.fillBand(accentOuter, accentInner, accentCount, r, g, b, seed + 6211);

		return mergeSamples(mergeSamples(baseSamples, cornerSamples), accentSamples);
	}

	// ── Scattered ────────────────────────────────────────────────────────

	private generateScattered(
		inner: Rect, outer: Rect, imageDensity: number, params: FrameParams,
		r: number, g: number, b: number, seed: number,
	): SampleSet {
		// Generate more candidates but accept with Gaussian falloff from band centerline
		const frameArea = rectArea(outer) - rectArea(inner);
		const targetCount = Math.max(1, Math.round(frameArea * imageDensity * params.densityMultiplier));
		const samples = createSampleSet({ count: targetCount });

		const bandCenterDist = params.width / 2; // half-width of the frame band
		let rng = xorshift32(seed);
		let placed = 0;

		// Expand outer slightly for scatter overflow
		const scatterOuter = expandRect(outer, params.width * 0.3);
		const maxAttempts = targetCount * 30;

		for (let attempt = 0; attempt < maxAttempts && placed < targetCount; attempt++) {
			rng = xorshift32(rng);
			const x = scatterOuter.left + (rng / 0xffffffff) * (scatterOuter.right - scatterOuter.left);
			rng = xorshift32(rng);
			const y = scatterOuter.bottom + (rng / 0xffffffff) * (scatterOuter.top - scatterOuter.bottom);

			// Must be outside inner rect
			if (x >= inner.left && x <= inner.right && y >= inner.bottom && y <= inner.top) {
				continue;
			}

			// Distance from the band centerline (midpoint between inner and outer edges)
			const distFromBandCenter = distToBandCenter(x, y, inner, outer);
			const normalizedDist = distFromBandCenter / (bandCenterDist + params.width * 0.3);

			// Gaussian acceptance: high near center, fades at edges
			const sigma = 0.5;
			const acceptance = Math.exp(-(normalizedDist * normalizedDist) / (2 * sigma * sigma));

			rng = xorshift32(rng);
			if ((rng / 0xffffffff) > acceptance) continue;

			const i3 = placed * 3;
			samples.positions[i3] = x;
			samples.positions[i3 + 1] = y;
			samples.positions[i3 + 2] = 0;
			samples.colors[i3] = r;
			samples.colors[i3 + 1] = g;
			samples.colors[i3 + 2] = b;
			samples.radii[placed] = 1.0;
			samples.opacities[placed] = 1.0;
			placed++;
		}

		if (placed < targetCount) return trimSampleSet(samples, placed);
		return samples;
	}

	// ── Shared helpers ───────────────────────────────────────────────────

	/** Fill a rectangular band (outer minus inner) with uniformly distributed points. */
	private fillBand(
		outer: Rect, inner: Rect, count: number,
		r: number, g: number, b: number, seed: number,
	): SampleSet {
		const samples = createSampleSet({ count });
		let rng = xorshift32(seed);
		let placed = 0;
		const maxAttempts = count * 20;

		for (let attempt = 0; attempt < maxAttempts && placed < count; attempt++) {
			rng = xorshift32(rng);
			const x = outer.left + (rng / 0xffffffff) * (outer.right - outer.left);
			rng = xorshift32(rng);
			const y = outer.bottom + (rng / 0xffffffff) * (outer.top - outer.bottom);

			if (x >= inner.left && x <= inner.right && y >= inner.bottom && y <= inner.top) {
				continue;
			}

			const i3 = placed * 3;
			samples.positions[i3] = x;
			samples.positions[i3 + 1] = y;
			samples.positions[i3 + 2] = 0;
			samples.colors[i3] = r;
			samples.colors[i3 + 1] = g;
			samples.colors[i3 + 2] = b;
			samples.radii[placed] = 1.0;
			samples.opacities[placed] = 1.0;
			placed++;
		}

		if (placed < count) return trimSampleSet(samples, placed);
		return samples;
	}

	/** Fill a solid rectangle with uniformly distributed points. */
	private fillRect(
		rect: Rect, count: number,
		r: number, g: number, b: number, seed: number,
	): SampleSet {
		const samples = createSampleSet({ count });
		let rng = xorshift32(seed);

		for (let i = 0; i < count; i++) {
			rng = xorshift32(rng);
			const x = rect.left + (rng / 0xffffffff) * (rect.right - rect.left);
			rng = xorshift32(rng);
			const y = rect.bottom + (rng / 0xffffffff) * (rect.top - rect.bottom);

			const i3 = i * 3;
			samples.positions[i3] = x;
			samples.positions[i3 + 1] = y;
			samples.positions[i3 + 2] = 0;
			samples.colors[i3] = r;
			samples.colors[i3 + 1] = g;
			samples.colors[i3 + 2] = b;
			samples.radii[i] = 1.0;
			samples.opacities[i] = 1.0;
		}

		return samples;
	}
}

// ── Module-level helpers ─────────────────────────────────────────────────

function parseHexColor(hex: string): [number, number, number] {
	const val = parseInt(hex.replace('#', ''), 16);
	return [((val >> 16) & 0xff) / 255, ((val >> 8) & 0xff) / 255, (val & 0xff) / 255];
}

function xorshift32(state: number): number {
	let s = state | 0;
	s ^= s << 13;
	s ^= s >> 17;
	s ^= s << 5;
	return s >>> 0;
}

function trimSampleSet(samples: SampleSet, count: number): SampleSet {
	return {
		positions: samples.positions.slice(0, count * 3),
		colors: samples.colors.slice(0, count * 3),
		radii: samples.radii.slice(0, count),
		opacities: samples.opacities.slice(0, count),
		ids: samples.ids?.slice(0, count),
		normals: samples.normals?.slice(0, count * 3),
		uv: samples.uv?.slice(0, count * 2),
		count,
	};
}

function rectArea(r: Rect): number {
	return (r.right - r.left) * (r.top - r.bottom);
}

function expandRect(r: Rect, amount: number): Rect {
	return { left: r.left - amount, right: r.right + amount, top: r.top + amount, bottom: r.bottom - amount };
}

function shrinkRect(r: Rect, amount: number): Rect {
	return expandRect(r, -amount);
}

/** Merge two SampleSets by concatenating their arrays. */
function mergeSamples(a: SampleSet, b: SampleSet): SampleSet {
	if (a.count === 0) return b;
	if (b.count === 0) return a;
	const count = a.count + b.count;
	const positions = new Float32Array(count * 3);
	const colors = new Float32Array(count * 3);
	const radii = new Float32Array(count);
	const opacities = new Float32Array(count);

	positions.set(a.positions.subarray(0, a.count * 3), 0);
	positions.set(b.positions.subarray(0, b.count * 3), a.count * 3);
	colors.set(a.colors.subarray(0, a.count * 3), 0);
	colors.set(b.colors.subarray(0, b.count * 3), a.count * 3);
	radii.set(a.radii.subarray(0, a.count), 0);
	radii.set(b.radii.subarray(0, b.count), a.count);
	opacities.set(a.opacities.subarray(0, a.count), 0);
	opacities.set(b.opacities.subarray(0, b.count), a.count);

	return { positions, colors, radii, opacities, count };
}

/** Distance of a point from the centerline of the frame band. */
function distToBandCenter(x: number, y: number, inner: Rect, outer: Rect): number {
	// Center of the frame band for each edge
	const midLeft = (inner.left + outer.left) / 2;
	const midRight = (inner.right + outer.right) / 2;
	const midTop = (inner.top + outer.top) / 2;
	const midBottom = (inner.bottom + outer.bottom) / 2;

	// Find shortest distance to band centerline (approximation using axis-aligned distances)
	const dLeft = Math.abs(x - midLeft);
	const dRight = Math.abs(x - midRight);
	const dTop = Math.abs(y - midTop);
	const dBottom = Math.abs(y - midBottom);

	return Math.min(dLeft, dRight, dTop, dBottom);
}
