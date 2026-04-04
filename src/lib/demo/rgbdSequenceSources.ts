import type { DepthMap } from '$lib/engine/preprocessing/DepthEstimation.js';
import type { RasterSampleSource } from '$lib/engine/ingest/types.js';
import type { DemoManifestRgbdSequenceAsset, DemoRgbdSequenceAsset } from './assets.js';
import type {
	EncodedDepthFrame,
	EncodedRasterFrame,
	RgbdSequenceManifest,
} from './rgbdSequenceTypes.js';

export interface RgbdSequenceFrameData {
	raster: RasterSampleSource;
	depthMap?: DepthMap;
	sourceBytes: {
		color: number;
		depth: number;
	};
}

export interface DemoRgbdSequencePlaybackSource {
	asset: DemoRgbdSequenceAsset;
	manifest: RgbdSequenceManifest;
	loadFrame: (frameIndex: number) => Promise<RgbdSequenceFrameData>;
}

export interface ResolveRgbdFrameUrlContext {
	asset: DemoManifestRgbdSequenceAsset;
	manifest: RgbdSequenceManifest;
	frameIndex: number;
	manifestUrl: string;
}

export type ResolveRgbdColorUrl = (context: ResolveRgbdFrameUrlContext) => string;
export type ResolveRgbdDepthUrl = (context: ResolveRgbdFrameUrlContext) => string | null;

export async function loadRgbdSequencePlaybackSource(
	asset: DemoManifestRgbdSequenceAsset,
	options: {
		fetch?: typeof fetch;
		resolveColorUrl?: ResolveRgbdColorUrl;
		resolveDepthUrl?: ResolveRgbdDepthUrl;
	} = {},
): Promise<DemoRgbdSequencePlaybackSource> {
	const fetchImpl = options.fetch ?? fetch;
	const manifestResponse = await fetchImpl(asset.manifestUrl);
	if (!manifestResponse.ok) {
		throw new Error(
			`Failed to fetch RGBD-sequence manifest for "${asset.label}" (${manifestResponse.status} ${manifestResponse.statusText}).`,
		);
	}

	const manifest = (await manifestResponse.json()) as RgbdSequenceManifest;
	validateRgbdManifest(manifest);
	const manifestUrl = manifestResponse.url || new URL(asset.manifestUrl, 'http://localhost').toString();
	const resolveColorUrl = options.resolveColorUrl ?? defaultResolveRgbdColorUrl;
	const resolveDepthUrl = options.resolveDepthUrl ?? defaultResolveRgbdDepthUrl;

	return {
		asset,
		manifest,
		loadFrame: async (frameIndex: number) => {
			if (!Number.isInteger(frameIndex) || frameIndex < 0 || frameIndex >= manifest.frameCount) {
				throw new Error(`RGBD sequence frame index ${frameIndex} is outside manifest range 0-${manifest.frameCount - 1}.`);
			}

			const colorUrl = resolveColorUrl({ asset, manifest, frameIndex, manifestUrl });
			const colorResponse = await fetchImpl(colorUrl);
			if (!colorResponse.ok) {
				throw new Error(
					`Failed to fetch RGBD color frame ${frameIndex} for "${asset.label}" (${colorResponse.status} ${colorResponse.statusText}).`,
				);
			}
			const colorBytes = await colorResponse.arrayBuffer();
			const colorFrame = decodeRasterFrame(new TextDecoder().decode(new Uint8Array(colorBytes)));

			const depthUrl = resolveDepthUrl({ asset, manifest, frameIndex, manifestUrl });
			let depthMap: DepthMap | undefined;
			let depthBytes = 0;
			if (depthUrl) {
				const depthResponse = await fetchImpl(depthUrl);
				if (!depthResponse.ok) {
					throw new Error(
						`Failed to fetch RGBD depth frame ${frameIndex} for "${asset.label}" (${depthResponse.status} ${depthResponse.statusText}).`,
					);
				}
				const rawDepthBytes = await depthResponse.arrayBuffer();
				depthBytes = rawDepthBytes.byteLength;
				depthMap = decodeDepthFrame(new TextDecoder().decode(new Uint8Array(rawDepthBytes)));
			}

			return {
				raster: colorFrame,
				depthMap,
				sourceBytes: {
					color: colorBytes.byteLength,
					depth: depthBytes,
				},
			};
		},
	};
}

export function defaultResolveRgbdColorUrl({
	manifest,
	frameIndex,
	manifestUrl,
}: ResolveRgbdFrameUrlContext): string {
	const frame = manifest.frames[frameIndex];
	if (!frame?.colorFile) {
		throw new Error(`RGBD manifest is missing colorFile for frame ${frameIndex}.`);
	}
	return new URL(frame.colorFile, manifestUrl).toString();
}

export function defaultResolveRgbdDepthUrl({
	manifest,
	frameIndex,
	manifestUrl,
}: ResolveRgbdFrameUrlContext): string | null {
	const frame = manifest.frames[frameIndex];
	if (!frame?.depthFile) return null;
	return new URL(frame.depthFile, manifestUrl).toString();
}

export function decodeRasterFrame(rawJson: string): RasterSampleSource {
	const frame = JSON.parse(rawJson) as EncodedRasterFrame;
	if (frame.encoding !== 'rgba8-json-base64') {
		throw new Error(`Unsupported raster frame encoding "${frame.encoding}".`);
	}

	const bytes = decodeBase64(frame.data);
	const pixels = new Uint8ClampedArray(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
	const expectedLength = frame.width * frame.height * 4;
	if (pixels.length !== expectedLength) {
		throw new Error(`Decoded raster frame length ${pixels.length} does not match expected RGBA length ${expectedLength}.`);
	}

	return {
		width: frame.width,
		height: frame.height,
		pixels,
	};
}

export function decodeDepthFrame(rawJson: string): DepthMap {
	const frame = JSON.parse(rawJson) as EncodedDepthFrame;
	if (frame.encoding !== 'float32-json-base64') {
		throw new Error(`Unsupported depth frame encoding "${frame.encoding}".`);
	}

	const bytes = decodeBase64(frame.data);
	if (bytes.byteLength % Float32Array.BYTES_PER_ELEMENT !== 0) {
		throw new Error(`Decoded depth frame byte length ${bytes.byteLength} is not aligned to float32.`);
	}

	const floats = new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
	const expectedLength = frame.width * frame.height;
	if (floats.length !== expectedLength) {
		throw new Error(`Decoded depth frame length ${floats.length} does not match expected size ${expectedLength}.`);
	}

	if (frame.semantics === '0-near-1-far') {
		for (let i = 0; i < floats.length; i++) {
			floats[i] = 1 - floats[i];
		}
	}

	return {
		data: floats,
		width: frame.width,
		height: frame.height,
		modelId: 'rgbd-sequence',
	};
}

function validateRgbdManifest(manifest: RgbdSequenceManifest): void {
	if (manifest.version !== 1) {
		throw new Error(`Unsupported RGBD-sequence manifest version ${manifest.version}.`);
	}
	if (!Number.isFinite(manifest.fps) || manifest.fps <= 0) {
		throw new Error(`RGBD-sequence manifest fps must be > 0; received ${manifest.fps}.`);
	}
	if (!Number.isInteger(manifest.frameCount) || manifest.frameCount <= 0) {
		throw new Error(`RGBD-sequence manifest frameCount must be a positive integer; received ${manifest.frameCount}.`);
	}
	if (manifest.frameTimestampsMs.length !== manifest.frameCount) {
		throw new Error(
			`RGBD-sequence manifest frameTimestampsMs length ${manifest.frameTimestampsMs.length} does not match frameCount ${manifest.frameCount}.`,
		);
	}
	if (manifest.frames.length !== manifest.frameCount) {
		throw new Error(`RGBD-sequence manifest frames length ${manifest.frames.length} does not match frameCount ${manifest.frameCount}.`);
	}
	if (!Number.isInteger(manifest.raster.width) || manifest.raster.width <= 0) {
		throw new Error(`RGBD-sequence manifest raster.width must be a positive integer; received ${manifest.raster.width}.`);
	}
	if (!Number.isInteger(manifest.raster.height) || manifest.raster.height <= 0) {
		throw new Error(`RGBD-sequence manifest raster.height must be a positive integer; received ${manifest.raster.height}.`);
	}
	if (manifest.depth) {
		if (!Number.isInteger(manifest.depth.width) || manifest.depth.width <= 0) {
			throw new Error(`RGBD-sequence manifest depth.width must be a positive integer; received ${manifest.depth.width}.`);
		}
		if (!Number.isInteger(manifest.depth.height) || manifest.depth.height <= 0) {
			throw new Error(`RGBD-sequence manifest depth.height must be a positive integer; received ${manifest.depth.height}.`);
		}
	}
	for (let i = 0; i < manifest.frameTimestampsMs.length; i++) {
		const timestamp = manifest.frameTimestampsMs[i];
		if (!Number.isFinite(timestamp)) {
			throw new Error(`RGBD-sequence manifest timestamp at index ${i} is not finite.`);
		}
		if (i > 0 && timestamp < manifest.frameTimestampsMs[i - 1]) {
			throw new Error('RGBD-sequence manifest frameTimestampsMs must be non-decreasing.');
		}
	}
	for (let i = 0; i < manifest.frames.length; i++) {
		const frame = manifest.frames[i];
		if (!frame.colorFile.trim()) {
			throw new Error(`RGBD-sequence manifest frame ${i} must declare a non-empty colorFile.`);
		}
		if (frame.depthFile !== undefined && !frame.depthFile.trim()) {
			throw new Error(`RGBD-sequence manifest frame ${i} depthFile must be non-empty when provided.`);
		}
	}
}

function decodeBase64(encoded: string): Uint8Array {
	if (typeof Buffer !== 'undefined') {
		return new Uint8Array(Buffer.from(encoded, 'base64'));
	}

	const binary = atob(encoded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}
