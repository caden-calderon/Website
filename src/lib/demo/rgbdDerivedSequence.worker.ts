/// <reference lib="webworker" />

import type { DemoDerivedRgbdSequenceAsset } from './assets.js';
import {
	buildDerivedRgbdSequenceData,
	type DerivedRgbdSequenceBuildData,
	type DerivedRgbdSequenceBuildProgress,
} from './rgbdDerivedSequence.js';
import type { RasterSampleSource } from '$lib/engine/ingest/types.js';
import type { DepthMap } from '$lib/engine/preprocessing/DepthEstimation.js';

interface PrepareDerivedRgbdSequenceWorkerRequest {
	type: 'build';
	asset: DemoDerivedRgbdSequenceAsset;
	raster: RasterSampleSource;
	depthMap?: DepthMap;
}

interface PrepareDerivedRgbdSequenceWorkerProgressMessage {
	type: 'progress';
	progress: DerivedRgbdSequenceBuildProgress;
}

interface PrepareDerivedRgbdSequenceWorkerResultMessage {
	type: 'result';
	buildData: DerivedRgbdSequenceBuildData;
}

interface PrepareDerivedRgbdSequenceWorkerErrorMessage {
	type: 'error';
	message: string;
}

type PrepareDerivedRgbdSequenceWorkerMessage =
	| PrepareDerivedRgbdSequenceWorkerProgressMessage
	| PrepareDerivedRgbdSequenceWorkerResultMessage
	| PrepareDerivedRgbdSequenceWorkerErrorMessage;

self.onmessage = (event: MessageEvent<PrepareDerivedRgbdSequenceWorkerRequest>) => {
	if (event.data.type !== 'build') {
		return;
	}

	try {
		const buildData = buildDerivedRgbdSequenceData({
			asset: event.data.asset,
			raster: event.data.raster,
			depthMap: event.data.depthMap,
			onProgress: (progress) => {
				self.postMessage({
					type: 'progress',
					progress,
				} satisfies PrepareDerivedRgbdSequenceWorkerProgressMessage);
			},
		});

		self.postMessage(
			{
				type: 'result',
				buildData,
			} satisfies PrepareDerivedRgbdSequenceWorkerResultMessage,
			collectTransferables(buildData),
		);
	} catch (error) {
		self.postMessage({
			type: 'error',
			message: error instanceof Error ? error.message : 'Derived RGBD build failed.',
		} satisfies PrepareDerivedRgbdSequenceWorkerErrorMessage);
	}
};

function collectTransferables(buildData: DerivedRgbdSequenceBuildData): Transferable[] {
	const transferables: Transferable[] = [];
	for (const frame of buildData.rawFrames) {
		transferables.push(frame.raster.pixels.buffer);
		if (frame.depthMap) {
			transferables.push(frame.depthMap.data.buffer);
		}
	}
	return transferables;
}

export {};
