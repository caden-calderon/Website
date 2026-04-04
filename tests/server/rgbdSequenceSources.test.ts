import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	getRgbdSequenceContentType,
	getRgbdSequenceDirectorySource,
	resolveRgbdSequenceAssetPath,
} from '../../src/lib/server/rgbdSequenceSources.js';

describe('server rgbd-sequence sources', () => {
	it('resolves the procedural RGBD source under tmp/rgbd-sequences', () => {
		const source = getRgbdSequenceDirectorySource('procedural-rgbd-portrait');

		expect(source).toEqual({
			id: 'procedural-rgbd-portrait',
			rootDir: path.resolve(process.cwd(), 'tmp', 'rgbd-sequences', 'procedural-rgbd-portrait'),
		});
		expect(resolveRgbdSequenceAssetPath('procedural-rgbd-portrait', 'manifest.json')).toBe(
			path.resolve(process.cwd(), 'tmp', 'rgbd-sequences', 'procedural-rgbd-portrait', 'manifest.json'),
		);
	});

	it('resolves the mock Kinect RGBD source under tmp/rgbd-sequences', () => {
		const source = getRgbdSequenceDirectorySource('kinect-rgbd-registration-smoke');

		expect(source).toEqual({
			id: 'kinect-rgbd-registration-smoke',
			rootDir: path.resolve(process.cwd(), 'tmp', 'rgbd-sequences', 'kinect-rgbd-registration-smoke'),
		});
		expect(resolveRgbdSequenceAssetPath('kinect-rgbd-registration-smoke', 'manifest.json')).toBe(
			path.resolve(process.cwd(), 'tmp', 'rgbd-sequences', 'kinect-rgbd-registration-smoke', 'manifest.json'),
		);
	});

	it('rejects unknown sources and path traversal', () => {
		expect(() => resolveRgbdSequenceAssetPath('missing-source', 'manifest.json')).toThrow(/unknown rgbd-sequence source/i);
		expect(() => resolveRgbdSequenceAssetPath('procedural-rgbd-portrait', '../secret.txt')).toThrow(/invalid rgbd-sequence asset path/i);
	});

	it('maps content types for manifest and frame assets', () => {
		expect(getRgbdSequenceContentType('manifest.json')).toBe('application/json; charset=utf-8');
		expect(getRgbdSequenceContentType('color-0001.bin')).toBe('application/octet-stream');
	});
});
