import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import type { SampleSet } from '../core/types.js';
import { createSampleSet } from '../core/SampleSet.js';
import type { IngestAdapter, MeshAdapterOptions } from './types.js';

/**
 * Samples persistent points from a Three.js mesh surface.
 *
 * Uses `MeshSurfaceSampler` for area-weighted random placement.
 * Vertex colors are used when available; otherwise the material's
 * base color is sampled.
 */
export class MeshAdapter implements IngestAdapter<THREE.Mesh, MeshAdapterOptions> {
	readonly name = 'mesh';

	sample(mesh: THREE.Mesh, options: MeshAdapterOptions): SampleSet {
		const { count, weightAttribute = null } = options;
		mesh.updateMatrixWorld(true);

		const sampler = new MeshSurfaceSampler(mesh);
		if (weightAttribute) sampler.setWeightAttribute(weightAttribute);
		sampler.build();

		const hasUv = mesh.geometry.hasAttribute('uv');
		const result = createSampleSet({
			count,
			includeIds: true,
			includeNormals: true,
			includeUv: hasUv,
		});

		const pos = new THREE.Vector3();
		const norm = new THREE.Vector3();
		const col = new THREE.Color();
		const uv = new THREE.Vector2();
		const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);

		const hasVertexColors = mesh.geometry.hasAttribute('color');

		// Fallback: pull color from the material
		const matColor = this.extractMaterialColor(mesh);

		for (let i = 0; i < count; i++) {
			if (hasVertexColors) {
				sampler.sample(pos, norm, col, hasUv ? uv : undefined);
			} else {
				sampler.sample(pos, norm, undefined, hasUv ? uv : undefined);
				col.copy(matColor);
			}

			pos.applyMatrix4(mesh.matrixWorld);
			norm.applyNormalMatrix(normalMatrix).normalize();

			const i3 = i * 3;
			result.positions[i3] = pos.x;
			result.positions[i3 + 1] = pos.y;
			result.positions[i3 + 2] = pos.z;
			result.ids![i] = i;

			if (result.normals) {
				result.normals[i3] = norm.x;
				result.normals[i3 + 1] = norm.y;
				result.normals[i3 + 2] = norm.z;
			}

			result.colors[i3] = col.r;
			result.colors[i3 + 1] = col.g;
			result.colors[i3 + 2] = col.b;

			result.radii[i] = 1.0;
			result.opacities[i] = 1.0;

			if (result.uv) {
				const i2 = i * 2;
				result.uv[i2] = uv.x;
				result.uv[i2 + 1] = uv.y;
			}
		}

		return result;
	}

	private extractMaterialColor(mesh: THREE.Mesh): THREE.Color {
		const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

		for (const material of materials) {
			if (
				material instanceof THREE.MeshStandardMaterial ||
				material instanceof THREE.MeshBasicMaterial ||
				material instanceof THREE.MeshLambertMaterial ||
				material instanceof THREE.MeshPhongMaterial
			) {
				return material.color;
			}
		}

		return new THREE.Color(0.9, 0.85, 0.8); // warm white fallback
	}
}
