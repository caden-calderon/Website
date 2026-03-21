import * as THREE from 'three';
import type { SampleSet } from '../../core/types.js';
import type { RendererAdapter, RenderParams } from '../types.js';
import { DEFAULT_RENDER_PARAMS } from '../types.js';
import vertexShader from '../shaders/point.vert.glsl';
import fragmentShader from '../shaders/point.frag.glsl';

export interface GLPointRendererOptions {
	params?: Partial<RenderParams>;
}

/**
 * First renderer adapter: WebGL2 `THREE.Points` with a custom ShaderMaterial.
 *
 * The architecture expects this to be replaceable by an instanced-splat
 * renderer later; all consumers use the `RendererAdapter` interface.
 */
export class GLPointRenderer implements RendererAdapter {
	private geometry: THREE.BufferGeometry;
	private material: THREE.ShaderMaterial;
	private points: THREE.Points;

	constructor(options: GLPointRendererOptions = {}) {
		const params: RenderParams = { ...DEFAULT_RENDER_PARAMS, ...options.params };

		this.geometry = new THREE.BufferGeometry();

		this.material = new THREE.ShaderMaterial({
			vertexShader,
			fragmentShader,
			uniforms: {
				uPointSize: { value: params.pointSize },
				uSizeAttenuation: { value: params.sizeAttenuation },
				uSizeRange: { value: new THREE.Vector2(...params.sizeRange) },
				uBrightness: { value: params.brightness },
				uSaturation: { value: params.saturation },
				uOpacity: { value: params.opacity },
				uDepthFade: { value: params.depthFade },
				uEdgeSharpness: { value: params.edgeSharpness },
				uDarkCutoff: { value: params.darkCutoff },
				uHueShift: { value: params.hueShift },
				uWarmth: { value: params.warmth },
			},
			vertexColors: true,
			transparent: true,
			depthWrite: !params.additiveBlending,
			blending: params.additiveBlending ? THREE.AdditiveBlending : THREE.NormalBlending,
		});

		this.points = new THREE.Points(this.geometry, this.material);
	}

	setSamples(samples: SampleSet): void {
		const { positions, colors, radii, opacities, count } = samples;

		this.setOrUpdateAttribute('position', positions, 3, count);
		this.setOrUpdateAttribute('color', colors, 3, count);
		this.setOrUpdateAttribute('aRadius', radii, 1, count);
		this.setOrUpdateAttribute('aOpacity', opacities, 1, count);

		this.geometry.setDrawRange(0, count);
		this.geometry.computeBoundingSphere();
	}

	updateUniforms(params: RenderParams): void {
		const u = this.material.uniforms;
		u.uPointSize.value = params.pointSize;
		u.uSizeAttenuation.value = params.sizeAttenuation;
		(u.uSizeRange.value as THREE.Vector2).set(...params.sizeRange);
		u.uBrightness.value = params.brightness;
		u.uSaturation.value = params.saturation;
		u.uOpacity.value = params.opacity;
		u.uDepthFade.value = params.depthFade;
		u.uEdgeSharpness.value = params.edgeSharpness;
		u.uDarkCutoff.value = params.darkCutoff;
		u.uHueShift.value = params.hueShift;
		u.uWarmth.value = params.warmth;

		this.material.blending = params.additiveBlending
			? THREE.AdditiveBlending
			: THREE.NormalBlending;
		this.material.depthWrite = !params.additiveBlending;
		this.material.needsUpdate = true;
	}

	getPrimitive(): THREE.Points {
		return this.points;
	}

	dispose(): void {
		this.geometry.dispose();
		this.material.dispose();
	}

	// -- internal ----------------------------------------------------------

	private setOrUpdateAttribute(
		name: string,
		data: Float32Array,
		itemSize: number,
		count: number,
	): void {
		const existing = this.geometry.getAttribute(name) as THREE.BufferAttribute | undefined;

		if (existing && existing.count === count) {
			(existing.array as Float32Array).set(data);
			existing.needsUpdate = true;
		} else {
			if (existing) this.geometry.deleteAttribute(name);
			const copy = new Float32Array(data);
			const attr = new THREE.BufferAttribute(copy, itemSize);
			attr.setUsage(THREE.DynamicDrawUsage);
			this.geometry.setAttribute(name, attr);
		}
	}
}
