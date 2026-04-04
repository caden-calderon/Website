import { describe, expect, it } from 'vitest';
import { PlyAdapter } from '../../src/lib/engine/ingest/PlyAdapter.js';

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
	return new Uint8Array(bytes).buffer;
}

function encode(text: string): Uint8Array {
	return new TextEncoder().encode(text);
}

function joinChunks(...chunks: Uint8Array[]): ArrayBuffer {
	const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
	const joined = new Uint8Array(totalLength);
	let offset = 0;

	for (const chunk of chunks) {
		joined.set(chunk, offset);
		offset += chunk.length;
	}

	return toArrayBuffer(joined);
}

describe('PlyAdapter', () => {
	it('parses binary little-endian vertex data with type-aware color normalization', () => {
		const header = [
			'ply',
			'format binary_little_endian 1.0',
			'element vertex 2',
			'property ushort red',
			'property float x',
			'property ushort blue',
			'property float y',
			'property ushort alpha',
			'property ushort green',
			'property float z',
			'end_header',
			'',
		].join('\n');

		const vertexStride = 2 + 4 + 2 + 4 + 2 + 2 + 4;
		const payload = new Uint8Array(vertexStride * 2);
		const view = new DataView(payload.buffer);
		let offset = 0;

		view.setUint16(offset, 32768, true);
		offset += 2;
		view.setFloat32(offset, 1.25, true);
		offset += 4;
		view.setUint16(offset, 16384, true);
		offset += 2;
		view.setFloat32(offset, -2.5, true);
		offset += 4;
		view.setUint16(offset, 32768, true);
		offset += 2;
		view.setUint16(offset, 65535, true);
		offset += 2;
		view.setFloat32(offset, 3.75, true);
		offset += 4;

		view.setUint16(offset, 0, true);
		offset += 2;
		view.setFloat32(offset, -4.5, true);
		offset += 4;
		view.setUint16(offset, 65535, true);
		offset += 2;
		view.setFloat32(offset, 5.5, true);
		offset += 4;
		view.setUint16(offset, 65535, true);
		offset += 2;
		view.setUint16(offset, 32768, true);
		offset += 2;
		view.setFloat32(offset, -6.5, true);

		const samples = new PlyAdapter().sample(joinChunks(encode(header), payload));

		expect(samples.count).toBe(2);
		expect(Array.from(samples.positions)).toEqual([1.25, -2.5, 3.75, -4.5, 5.5, -6.5]);
		expect(samples.colors[0]).toBeCloseTo(32768 / 65535, 6);
		expect(samples.colors[1]).toBeCloseTo(1.0, 6);
		expect(samples.colors[2]).toBeCloseTo(16384 / 65535, 6);
		expect(samples.colors[3]).toBeCloseTo(0, 6);
		expect(samples.colors[4]).toBeCloseTo(32768 / 65535, 6);
		expect(samples.colors[5]).toBeCloseTo(1.0, 6);
		expect(samples.opacities[0]).toBeCloseTo(32768 / 65535, 6);
		expect(samples.opacities[1]).toBeCloseTo(1.0, 6);
		expect(Array.from(samples.ids ?? [])).toEqual([0, 1]);
		expect(Array.from(samples.radii)).toEqual([1, 1]);
	});

	it('parses ASCII PLY with CRLF headers, reordered properties, normals, and UVs', () => {
		const source = [
			'ply',
			'format ascii 1.0',
			'comment generated in test',
			'element vertex 2',
			'property float z',
			'property float x',
			'property float y',
			'property float normal_z',
			'property float normal_x',
			'property float normal_y',
			'property float texture_v',
			'property float texture_u',
			'end_header',
			'3.0 1.0 2.0 0.3 0.1 0.2 0.75 0.25',
			'6.0 4.0 5.0 0.6 0.4 0.5 0.9 0.8',
			'',
		].join('\r\n');

		const samples = new PlyAdapter().sample(toArrayBuffer(encode(source)));

		expect(samples.count).toBe(2);
		expect(Array.from(samples.positions)).toEqual([1, 2, 3, 4, 5, 6]);
		expect(samples.normals).toBeDefined();
		expect(Array.from(samples.normals ?? []).map((value) => Number(value.toFixed(6)))).toEqual([
			0.1, 0.2, 0.3, 0.4, 0.5, 0.6,
		]);
		expect(samples.uv).toBeDefined();
		expect(Array.from(samples.uv ?? []).map((value) => Number(value.toFixed(6)))).toEqual([
			0.25, 0.75, 0.8, 0.9,
		]);
		expect(Array.from(samples.colors)).toEqual([1, 1, 1, 1, 1, 1]);
		expect(Array.from(samples.opacities)).toEqual([1, 1]);
	});

	it('rejects malformed headers', () => {
		const malformed = [
			'ply',
			'format ascii 1.0',
			'property float x',
			'element vertex 1',
			'property float y',
			'property float z',
			'end_header',
			'0 0 0',
			'',
		].join('\n');

		expect(() => new PlyAdapter().sample(toArrayBuffer(encode(malformed)))).toThrow(
			/property declared before any element/i,
		);
	});

	it('rejects binary big-endian files clearly', () => {
		const source = [
			'ply',
			'format binary_big_endian 1.0',
			'element vertex 0',
			'property float x',
			'property float y',
			'property float z',
			'end_header',
			'',
		].join('\n');

		expect(() => new PlyAdapter().sample(toArrayBuffer(encode(source)))).toThrow(
			/binary_big_endian/i,
		);
	});

	it('rejects compressed PLY variants clearly', () => {
		const source = [
			'ply',
			'format binary_little_endian_compressed 1.0',
			'element vertex 0',
			'property float x',
			'property float y',
			'property float z',
			'end_header',
			'',
		].join('\n');

		expect(() => new PlyAdapter().sample(toArrayBuffer(encode(source)))).toThrow(
			/compressed variants are not supported/i,
		);
	});

	it('rejects list properties in the vertex payload', () => {
		const source = [
			'ply',
			'format ascii 1.0',
			'element vertex 1',
			'property float x',
			'property float y',
			'property float z',
			'property list uchar int neighbours',
			'end_header',
			'0 0 0 3 1 2 3',
			'',
		].join('\n');

		expect(() => new PlyAdapter().sample(toArrayBuffer(encode(source)))).toThrow(
			/list properties are not supported in vertex payloads/i,
		);
	});
});
