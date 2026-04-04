import type { PointSequenceManifest } from '$lib/engine/animation/types.js';
import type { DemoPointSequenceAsset } from './assets.js';

export interface DemoPointSequencePlaybackSource {
	asset: DemoPointSequenceAsset;
	manifest: PointSequenceManifest;
	loadFrame: (frameIndex: number) => Promise<ArrayBuffer>;
}

export interface ResolveFrameUrlContext {
	asset: DemoPointSequenceAsset;
	manifest: PointSequenceManifest;
	frameIndex: number;
	manifestUrl: string;
}

export type ResolveFrameUrl = (context: ResolveFrameUrlContext) => string;

export async function loadPointSequencePlaybackSource(
	asset: DemoPointSequenceAsset,
	options: {
		fetch?: typeof fetch;
		resolveFrameUrl?: ResolveFrameUrl;
	} = {},
): Promise<DemoPointSequencePlaybackSource> {
	const fetchImpl = options.fetch ?? fetch;
	const manifestResponse = await fetchImpl(asset.manifestUrl);
	if (!manifestResponse.ok) {
		throw new Error(
			`Failed to fetch point-sequence manifest for "${asset.label}" (${manifestResponse.status} ${manifestResponse.statusText}).`,
		);
	}

	const manifest = (await manifestResponse.json()) as PointSequenceManifest;
	const manifestUrl = manifestResponse.url || new URL(asset.manifestUrl, 'http://localhost').toString();
	const resolveFrameUrl = options.resolveFrameUrl ?? defaultResolveFrameUrl;

	return {
		asset,
		manifest,
		loadFrame: async (frameIndex: number) => {
			const frameUrl = resolveFrameUrl({
				asset,
				manifest,
				frameIndex,
				manifestUrl,
			});
			const frameResponse = await fetchImpl(frameUrl);
			if (!frameResponse.ok) {
				throw new Error(
					`Failed to fetch point-sequence frame ${frameIndex} for "${asset.label}" (${frameResponse.status} ${frameResponse.statusText}).`,
				);
			}
			return frameResponse.arrayBuffer();
		},
	};
}

export function defaultResolveFrameUrl({
	manifest,
	frameIndex,
	manifestUrl,
}: ResolveFrameUrlContext): string {
	if (!Number.isInteger(frameIndex) || frameIndex < 0 || frameIndex >= manifest.frameCount) {
		throw new Error(`Point-sequence frame index ${frameIndex} is outside manifest range 0-${manifest.frameCount - 1}.`);
	}

	if (!manifest.frameFiles) {
		throw new Error('Point-sequence manifest does not declare frameFiles; app layer must provide a frame resolver.');
	}

	const frameFile = manifest.frameFiles[frameIndex];
	if (!frameFile) {
		throw new Error(`Point-sequence manifest is missing frameFiles[${frameIndex}].`);
	}

	return new URL(frameFile, manifestUrl).toString();
}
