import type * as THREE from 'three';
import type { SampleSet } from '../core/types.js';

/** Live-tunable rendering parameters. */
export interface RenderParams {
	/** Base point size in pixels (or base units when sizeAttenuation is on) */
	pointSize: number;
	/** Scale points with camera distance */
	sizeAttenuation: boolean;
	/** [min, max] pixel clamp for point size */
	sizeRange: [number, number];
	/** Exposure / gain multiplier on RGB (0–3). Applied after saturation. */
	brightness: number;
	/** Saturation multiplier (0–5) */
	saturation: number;
	/** Global opacity (0–1) */
	opacity: number;
	/** Opacity falloff with depth (0 = none) */
	depthFade: number;
	/** Edge sharpness: 0 = soft gaussian, 1 = hard circle */
	edgeSharpness: number;
	/** Use additive blending (glowy) vs normal blending (crisp, true color) */
	additiveBlending: boolean;
	/** Luminance threshold below which points fade to transparent (0 = off) */
	darkCutoff: number;
	/** Hue rotation (0–1, wraps). 0.5 = 180 degree shift. */
	hueShift: number;
	/** Colour temperature shift. Positive = warm/amber, negative = cool/blue. (-1 to 1) */
	warmth: number;
}

/** Bloom post-processing parameters. */
export interface BloomParams {
	/** Bloom strength (0–3) */
	strength: number;
	/** Bloom radius (0–1) */
	radius: number;
	/** Brightness threshold for bloom (0–1) */
	threshold: number;
}

/**
 * Renderer adapter interface.
 * `GLPointRenderer` is the first implementation; instanced splats can follow
 * without changing any consumer code.
 */
export interface RendererAdapter {
	setSamples(samples: SampleSet): void;
	updateUniforms(params: RenderParams): void;
	getPrimitive(): THREE.Object3D;
	dispose(): void;
}

export const DEFAULT_RENDER_PARAMS: RenderParams = {
	pointSize: 3.0,
	sizeAttenuation: false,
	sizeRange: [0.1, 12.0],
	brightness: 0.65,
	saturation: 2.45,
	opacity: 0.45,
	depthFade: 2.9,
	edgeSharpness: 0.42,
	additiveBlending: false,
	darkCutoff: 0.0,
	hueShift: 0.0,
	warmth: 0.0,
};

export const DEFAULT_BLOOM_PARAMS: BloomParams = {
	strength: 0.2,
	radius: 0.44,
	threshold: 0.33,
};
