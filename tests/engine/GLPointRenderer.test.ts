import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createSampleSet } from '../../src/lib/engine/core/SampleSet.js';
import { GLPointRenderer } from '../../src/lib/engine/render/adapters/GLPointRenderer.js';

function makeSamples(count: number) {
	const samples = createSampleSet({ count });
	for (let i = 0; i < count; i++) {
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
	return samples;
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

	it('reuses existing attributes when sample count is unchanged', () => {
		const renderer = new GLPointRenderer();
		const primitive = renderer.getPrimitive();
		const geometry = primitive.geometry as THREE.BufferGeometry;

		renderer.setSamples(makeSamples(2));
		const positionAttribute = geometry.getAttribute('position');

		const replacement = makeSamples(2);
		replacement.positions[0] = 99;
		renderer.setSamples(replacement);

		const nextPositionAttribute = geometry.getAttribute('position');
		expect(nextPositionAttribute).toBe(positionAttribute);
		expect((nextPositionAttribute.array as Float32Array)[0]).toBe(99);
	});

	it('reallocates attributes when sample count changes', () => {
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
