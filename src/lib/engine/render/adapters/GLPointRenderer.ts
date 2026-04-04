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
				uColorNoise: { value: params.colorNoise },
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
		this.validateSamples(samples);

		this.setOrUpdateAttribute('position', positions, 3);
		this.setOrUpdateAttribute('color', colors, 3);
		this.setOrUpdateAttribute('aRadius', radii, 1);
		this.setOrUpdateAttribute('aOpacity', opacities, 1);

		this.geometry.setDrawRange(0, count);
		this.updateBoundingSphere(positions, count);
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
		u.uColorNoise.value = params.colorNoise;

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
	): void {
		const existing = this.geometry.getAttribute(name) as THREE.BufferAttribute | undefined;
		const capacity = data.length / itemSize;

		if (existing && existing.itemSize === itemSize && existing.count === capacity) {
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

	private validateSamples(samples: SampleSet): void {
		const { count } = samples;

		if (!Number.isInteger(count) || count < 0) {
			throw new Error(`GLPointRenderer requires a non-negative integer sample count; received ${count}.`);
		}

		const positionCapacity = this.getCapacity('positions', samples.positions, 3);
		const colorCapacity = this.getCapacity('colors', samples.colors, 3);
		const radiusCapacity = this.getCapacity('radii', samples.radii, 1);
		const opacityCapacity = this.getCapacity('opacities', samples.opacities, 1);

		if (
			positionCapacity !== colorCapacity ||
			positionCapacity !== radiusCapacity ||
			positionCapacity !== opacityCapacity
		) {
			throw new Error(
				`GLPointRenderer requires matching attribute capacities; received positions=${positionCapacity}, colors=${colorCapacity}, radii=${radiusCapacity}, opacities=${opacityCapacity}.`,
			);
		}

		if (count > positionCapacity) {
			throw new Error(
				`GLPointRenderer sample count ${count} exceeds attribute capacity ${positionCapacity}.`,
			);
		}
	}

	private getCapacity(name: string, data: Float32Array, itemSize: number): number {
		if (data.length % itemSize !== 0) {
			throw new Error(
				`GLPointRenderer received ${name} length ${data.length}, which is not divisible by itemSize ${itemSize}.`,
			);
		}

		return data.length / itemSize;
	}

	private updateBoundingSphere(positions: Float32Array, count: number): void {
		const sphere = this.geometry.boundingSphere ?? new THREE.Sphere();

		if (count === 0) {
			sphere.center.set(0, 0, 0);
			sphere.radius = 0;
			this.geometry.boundingSphere = sphere;
			return;
		}

		let minX = positions[0];
		let minY = positions[1];
		let minZ = positions[2];
		let maxX = positions[0];
		let maxY = positions[1];
		let maxZ = positions[2];

		for (let i = 1; i < count; i++) {
			const i3 = i * 3;
			const x = positions[i3];
			const y = positions[i3 + 1];
			const z = positions[i3 + 2];

			if (x < minX) minX = x;
			if (y < minY) minY = y;
			if (z < minZ) minZ = z;
			if (x > maxX) maxX = x;
			if (y > maxY) maxY = y;
			if (z > maxZ) maxZ = z;
		}

		sphere.center.set(
			(minX + maxX) * 0.5,
			(minY + maxY) * 0.5,
			(minZ + maxZ) * 0.5,
		);

		let maxRadiusSq = 0;
		for (let i = 0; i < count; i++) {
			const i3 = i * 3;
			const dx = positions[i3] - sphere.center.x;
			const dy = positions[i3 + 1] - sphere.center.y;
			const dz = positions[i3 + 2] - sphere.center.z;
			const radiusSq = dx * dx + dy * dy + dz * dz;

			if (radiusSq > maxRadiusSq) {
				maxRadiusSq = radiusSq;
			}
		}

		sphere.radius = Math.sqrt(maxRadiusSq);
		this.geometry.boundingSphere = sphere;
	}
}
