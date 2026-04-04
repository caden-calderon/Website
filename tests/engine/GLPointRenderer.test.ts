import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import type { SampleSet } from '../../src/lib/engine/core/types.js';
import { createSampleSet } from '../../src/lib/engine/core/SampleSet.js';
import { GLPointRenderer } from '../../src/lib/engine/render/adapters/GLPointRenderer.js';

function makeSamples(capacity: number, activeCount = capacity): SampleSet {
	const samples = createSampleSet({ count: capacity });
	for (let i = 0; i < capacity; i++) {
		const i3 = i * 3;
		samples.positions[i3] = i;
		samples.positions[i3 + 1] = i + 0.5;
		samples.positions[i3 + 2] = -i;
		samples.colors[i3] = 0.1 * (i + 1);
		samples.colors[i3 + 1] = 0.2 * (i + 1);
		samples.colors[i3 + 2] = 0.3 * (i + 1);
		samples.radii[i] = 1 + i;
		samples.opacities[i] = 0.5;
	}

	return {
		...samples,
		count: activeCount,
	};
}

describe('GLPointRenderer', () => {
	it('uploads point attributes and draw range', () => {
		const renderer = new GLPointRenderer();
		const primitive = renderer.getPrimitive();

		renderer.setSamples(makeSamples(2));

		const geometry = primitive.geometry as THREE.BufferGeometry;
		expect(geometry.drawRange.count).toBe(2);
		expect(geometry.getAttribute('position').count).toBe(2);
		expect(Array.from(geometry.getAttribute('aRadius').array as ArrayLike<number>)).toEqual([1, 2]);
		expect(Array.from(geometry.getAttribute('aOpacity').array as ArrayLike<number>)).toEqual([0.5, 0.5]);
		expect(geometry.boundingSphere).not.toBeNull();
	});

	it('reuses existing attributes when buffer capacity is unchanged', () => {
		const renderer = new GLPointRenderer();
		const primitive = renderer.getPrimitive();
		const geometry = primitive.geometry as THREE.BufferGeometry;

		renderer.setSamples(makeSamples(4, 4));
		const positionAttribute = geometry.getAttribute('position');

		const replacement = makeSamples(4, 2);
		replacement.positions[0] = 99;
		replacement.positions[9] = 777;
		renderer.setSamples(replacement);

		const nextPositionAttribute = geometry.getAttribute('position');
		expect(nextPositionAttribute).toBe(positionAttribute);
		expect(geometry.drawRange.count).toBe(2);
		expect(nextPositionAttribute.count).toBe(4);
		expect((nextPositionAttribute.array as Float32Array)[0]).toBe(99);
		expect((nextPositionAttribute.array as Float32Array)[9]).toBe(777);
	});

	it('reallocates attributes when buffer capacity changes', () => {
		const renderer = new GLPointRenderer();
		const primitive = renderer.getPrimitive();
		const geometry = primitive.geometry as THREE.BufferGeometry;

		renderer.setSamples(makeSamples(2));
		const positionAttribute = geometry.getAttribute('position');

		renderer.setSamples(makeSamples(3));

		const nextPositionAttribute = geometry.getAttribute('position');
		expect(nextPositionAttribute).not.toBe(positionAttribute);
		expect(nextPositionAttribute.count).toBe(3);
	});

	it('treats SampleSet.count as the active prefix for bounds and draw count', () => {
		const renderer = new GLPointRenderer();
		const primitive = renderer.getPrimitive();
		const geometry = primitive.geometry as THREE.BufferGeometry;

		const samples = makeSamples(4, 1);
		samples.positions.set([
			1, 2, 3,
			1000, 1000, 1000,
			-1000, -1000, -1000,
			500, -500, 250,
		]);

		renderer.setSamples(samples);

		expect(geometry.drawRange.count).toBe(1);
		expect(geometry.getAttribute('position').count).toBe(4);
		expect(geometry.boundingSphere).not.toBeNull();
		expect(geometry.boundingSphere?.center.toArray()).toEqual([1, 2, 3]);
		expect(geometry.boundingSphere?.radius).toBe(0);
	});

	it('rejects active counts that exceed attribute capacity', () => {
		const renderer = new GLPointRenderer();
		const invalid = makeSamples(2, 3);

		expect(() => renderer.setSamples(invalid)).toThrow(/exceeds attribute capacity/i);
	});

	it('updates uniforms and material state', () => {
		const renderer = new GLPointRenderer();
		const primitive = renderer.getPrimitive();
		const material = primitive.material as THREE.ShaderMaterial;

		renderer.updateUniforms({
			pointSize: 5,
			sizeAttenuation: true,
			sizeRange: [0.25, 8],
			brightness: 1.2,
			saturation: 1.8,
			opacity: 0.9,
			depthFade: 0.5,
			edgeSharpness: 0.8,
			additiveBlending: true,
			darkCutoff: 0.1,
			hueShift: 0.25,
			warmth: 0.4,
			colorNoise: 0.12,
		});

		expect(material.uniforms.uPointSize.value).toBe(5);
		expect(material.uniforms.uSizeAttenuation.value).toBe(true);
		expect((material.uniforms.uSizeRange.value as THREE.Vector2).toArray()).toEqual([0.25, 8]);
		expect(material.uniforms.uWarmth.value).toBe(0.4);
		expect(material.uniforms.uColorNoise.value).toBe(0.12);
		expect(material.blending).toBe(THREE.AdditiveBlending);
		expect(material.depthWrite).toBe(false);
	});

	it('disposes geometry and material', () => {
		const renderer = new GLPointRenderer();
		const primitive = renderer.getPrimitive();
		const geometry = primitive.geometry as THREE.BufferGeometry;
		const material = primitive.material as THREE.ShaderMaterial;
		const geometryDispose = vi.spyOn(geometry, 'dispose');
		const materialDispose = vi.spyOn(material, 'dispose');

		renderer.dispose();

		expect(geometryDispose).toHaveBeenCalledOnce();
		expect(materialDispose).toHaveBeenCalledOnce();
	});
});
