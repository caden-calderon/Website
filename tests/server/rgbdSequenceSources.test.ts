import path from 'node:path';
import fs from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
	getRgbdSequenceContentType,
	getRgbdSequenceDirectorySource,
	listRgbdSequenceDirectorySources,
	listRgbdSequenceManifestSources,
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

	it('discovers local manifest-backed RGBD studies under tmp/rgbd-sequences', async () => {
		const sequenceId = 'test-local-rgbd-study';
		const rootDir = path.resolve(process.cwd(), 'tmp', 'rgbd-sequences', sequenceId);

		try {
			await fs.mkdir(rootDir, { recursive: true });
			await fs.writeFile(
				path.join(rootDir, 'manifest.json'),
				JSON.stringify(
					{
						version: 1,
						fps: 12,
						frameCount: 4,
						frameTimestampsMs: [0, 83.333, 166.667, 250],
						frames: [
							{ colorFile: 'color-0000.json', depthFile: 'depth-0000.json' },
							{ colorFile: 'color-0001.json', depthFile: 'depth-0001.json' },
							{ colorFile: 'color-0002.json', depthFile: 'depth-0002.json' },
							{ colorFile: 'color-0003.json', depthFile: 'depth-0003.json' },
						],
						clips: [{ id: 'study_clip', startFrame: 0, endFrame: 3, mode: 'loop' }],
						raster: { width: 96, height: 128, colorEncoding: 'rgba8-json-base64' },
						depth: { width: 96, height: 128, encoding: 'float32-json-base64', semantics: '0-far-1-near' },
						coordinateSystem: { upAxis: 'y' },
						units: 'meters',
						processing: {},
					},
					null,
					2,
				),
				'utf-8',
			);

			expect(getRgbdSequenceDirectorySource(sequenceId)).toEqual({
				id: sequenceId,
				rootDir,
			});
			expect(resolveRgbdSequenceAssetPath(sequenceId, 'manifest.json')).toBe(path.join(rootDir, 'manifest.json'));

			const listedSources = listRgbdSequenceDirectorySources();
			expect(listedSources.some((source) => source.id === sequenceId && source.builtin === false)).toBe(true);

			const listedManifests = listRgbdSequenceManifestSources();
			expect(listedManifests).toContainEqual(
				expect.objectContaining({
					id: sequenceId,
					builtin: false,
					label: 'Test Local Rgbd Study',
					manifestUrl: `/api/rgbd-sequences/${sequenceId}/manifest.json`,
					initialClipId: 'study_clip',
					frameCount: 4,
					fps: 12,
				}),
			);
		} finally {
			await fs.rm(rootDir, { recursive: true, force: true });
		}
	});

	it('maps content types for manifest and frame assets', () => {
		expect(getRgbdSequenceContentType('manifest.json')).toBe('application/json; charset=utf-8');
		expect(getRgbdSequenceContentType('color-0001.bin')).toBe('application/octet-stream');
	});
});
