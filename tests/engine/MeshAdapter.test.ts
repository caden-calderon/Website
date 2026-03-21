import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { MeshAdapter } from '../../src/lib/engine/ingest/MeshAdapter.js';

describe('MeshAdapter', () => {
	it('applies the mesh world transform to sampled positions', () => {
		const geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
		const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
		const mesh = new THREE.Mesh(geometry, material);
		mesh.position.set(3, 4, 5);
		mesh.scale.set(2, 4, 1);
		mesh.updateMatrixWorld(true);

		const result = new MeshAdapter().sample(mesh, { count: 64 });

		for (let i = 0; i < result.count; i++) {
			const i3 = i * 3;
			expect(result.positions[i3]).toBeGreaterThanOrEqual(2);
			expect(result.positions[i3]).toBeLessThanOrEqual(4);
			expect(result.positions[i3 + 1]).toBeGreaterThanOrEqual(2);
			expect(result.positions[i3 + 1]).toBeLessThanOrEqual(6);
			expect(result.positions[i3 + 2]).toBeCloseTo(5, 5);
		}

		geometry.dispose();
		material.dispose();
	});

	it('transforms sampled normals into world space', () => {
		const geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
		const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
		const mesh = new THREE.Mesh(geometry, material);
		mesh.rotation.x = -Math.PI / 2;
		mesh.updateMatrixWorld(true);

		const result = new MeshAdapter().sample(mesh, { count: 8 });

		expect(result.normals).toBeDefined();
		for (let i = 0; i < result.count; i++) {
			const i3 = i * 3;
			expect(result.normals![i3]).toBeCloseTo(0, 5);
			expect(result.normals![i3 + 1]).toBeCloseTo(1, 5);
			expect(result.normals![i3 + 2]).toBeCloseTo(0, 5);
		}

		geometry.dispose();
		material.dispose();
	});

	it('populates stable ids, uv coordinates, and material fallback colours', () => {
		const geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
		const material = new THREE.MeshBasicMaterial({ color: 0x336699 });
		const mesh = new THREE.Mesh(geometry, material);

		const result = new MeshAdapter().sample(mesh, { count: 8 });
		const expectedColor = new THREE.Color(0x336699);

		expect(result.ids).toBeDefined();
		expect(result.uv).toBeDefined();

		for (let i = 0; i < result.count; i++) {
			const i2 = i * 2;
			const i3 = i * 3;

			expect(result.ids![i]).toBe(i);
			expect(result.uv![i2]).toBeGreaterThanOrEqual(0);
			expect(result.uv![i2]).toBeLessThanOrEqual(1);
			expect(result.uv![i2 + 1]).toBeGreaterThanOrEqual(0);
			expect(result.uv![i2 + 1]).toBeLessThanOrEqual(1);
			expect(result.colors[i3]).toBeCloseTo(expectedColor.r, 5);
			expect(result.colors[i3 + 1]).toBeCloseTo(expectedColor.g, 5);
			expect(result.colors[i3 + 2]).toBeCloseTo(expectedColor.b, 5);
		}

		geometry.dispose();
		material.dispose();
	});
});
