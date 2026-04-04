import type { AnimationClip } from '$lib/engine/animation/types.js';

export interface RgbdSequenceFrameFile {
	colorFile: string;
	depthFile?: string;
}

export interface RgbdSequenceManifest {
	version: 1;
	fps: number;
	frameCount: number;
	frameTimestampsMs: readonly number[];
	frames: readonly RgbdSequenceFrameFile[];
	clips?: readonly AnimationClip[];
	raster: {
		width: number;
		height: number;
		colorEncoding: 'rgba8-json-base64';
		description?: string;
	};
	depth?: {
		width: number;
		height: number;
		encoding: 'float32-json-base64';
		semantics: '0-far-1-near' | '0-near-1-far';
		description?: string;
	};
	coordinateSystem: {
		upAxis: string;
		forwardAxis?: string;
		handedness?: 'left' | 'right' | 'unknown';
		description?: string;
	};
	units: string;
	processing: Readonly<Record<string, unknown>>;
	capture?: {
		sensor?: string;
		serial?: string;
		calibration?: Readonly<Record<string, unknown>>;
		metadata?: Readonly<Record<string, unknown>>;
	};
}

export interface EncodedRasterFrame {
	width: number;
	height: number;
	encoding: 'rgba8-json-base64';
	data: string;
}

export interface EncodedDepthFrame {
	width: number;
	height: number;
	encoding: 'float32-json-base64';
	semantics: '0-far-1-near' | '0-near-1-far';
	data: string;
}
