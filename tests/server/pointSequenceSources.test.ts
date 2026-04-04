import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	getPointSequenceContentType,
	getPointSequenceDirectorySource,
	resolvePointSequenceAssetPath,
} from '../../src/lib/server/pointSequenceSources.js';

describe('server point-sequence sources', () => {
	it('resolves the synthetic source to the tmp sequence directory', () => {
		const source = getPointSequenceDirectorySource('synthetic-pulse');

		expect(source).toEqual({
			id: 'synthetic-pulse',
			rootDir: path.resolve(process.cwd(), 'tmp', 'synthetic-point-sequence'),
		});
		expect(resolvePointSequenceAssetPath('synthetic-pulse', 'manifest.json')).toBe(
			path.resolve(process.cwd(), 'tmp', 'synthetic-point-sequence', 'manifest.json'),
		);
	});

	it('resolves ITOP stress-test sources under tmp/point-sequences', () => {
		const source = getPointSequenceDirectorySource('itop-side-test-medium');

		expect(source).toEqual({
			id: 'itop-side-test-medium',
			rootDir: path.resolve(process.cwd(), 'tmp', 'point-sequences', 'itop-side-test-medium'),
		});
		expect(resolvePointSequenceAssetPath('itop-side-test-medium', 'manifest.json')).toBe(
			path.resolve(process.cwd(), 'tmp', 'point-sequences', 'itop-side-test-medium', 'manifest.json'),
		);
	});

	it('rejects unknown sources and path traversal', () => {
		expect(() => resolvePointSequenceAssetPath('missing-source', 'manifest.json')).toThrow(/unknown point-sequence source/i);
		expect(() => resolvePointSequenceAssetPath('synthetic-pulse', '../secret.txt')).toThrow(/invalid point-sequence asset path/i);
	});

	it('maps content types for manifest and frame assets', () => {
		expect(getPointSequenceContentType('manifest.json')).toBe('application/json; charset=utf-8');
		expect(getPointSequenceContentType('frame-0001.ply')).toBe('application/octet-stream');
	});
});
