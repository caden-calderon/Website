/// <reference lib="webworker" />

import type { RasterSampleSource } from '$lib/engine/ingest/types.js';
import type { DepthMap } from '$lib/engine/preprocessing/DepthEstimation.js';
import type { SampleSet } from '$lib/engine/core/types.js';
import {
	prepareImageSamples,
	type ImageSamplingPreparationProgress,
	type ImageSamplingSettings,
} from './imageSampling.js';

interface PrepareImageSamplesWorkerRequest {
	type: 'prepare';
	raster: RasterSampleSource;
	depthMap?: DepthMap;
	sampling: ImageSamplingSettings;
}

interface PrepareImageSamplesWorkerProgressMessage {
	type: 'progress';
	progress: ImageSamplingPreparationProgress;
}

interface PrepareImageSamplesWorkerResultMessage {
	type: 'result';
	samples: SampleSet;
}

interface PrepareImageSamplesWorkerErrorMessage {
	type: 'error';
	message: string;
}

type PrepareImageSamplesWorkerMessage =
	| PrepareImageSamplesWorkerProgressMessage
	| PrepareImageSamplesWorkerResultMessage
	| PrepareImageSamplesWorkerErrorMessage;

self.onmessage = (event: MessageEvent<PrepareImageSamplesWorkerRequest>) => {
	if (event.data.type !== 'prepare') {
		return;
	}

	try {
		const samples = prepareImageSamples({
			raster: event.data.raster,
			depthMap: event.data.depthMap,
			sampling: event.data.sampling,
			onProgress: (progress) => {
				self.postMessage({
					type: 'progress',
					progress,
				} satisfies PrepareImageSamplesWorkerProgressMessage);
			},
		});

		self.postMessage(
			{
				type: 'result',
				samples,
			} satisfies PrepareImageSamplesWorkerResultMessage,
			collectTransferables(samples),
		);
	} catch (error) {
		self.postMessage({
			type: 'error',
			message: error instanceof Error ? error.message : 'Image sample preparation failed.',
		} satisfies PrepareImageSamplesWorkerErrorMessage);
	}
};

function collectTransferables(samples: SampleSet): Transferable[] {
	const transferables: Transferable[] = [
		samples.positions.buffer,
		samples.colors.buffer,
		samples.radii.buffer,
		samples.opacities.buffer,
	];
	if (samples.ids) transferables.push(samples.ids.buffer);
	if (samples.normals) transferables.push(samples.normals.buffer);
	if (samples.orientations) transferables.push(samples.orientations.buffer);
	if (samples.velocities) transferables.push(samples.velocities.buffer);
	if (samples.anchors) transferables.push(samples.anchors.buffer);
	if (samples.barycentrics) transferables.push(samples.barycentrics.buffer);
	if (samples.uv) transferables.push(samples.uv.buffer);
	return transferables;
}

export {};
