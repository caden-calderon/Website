/// <reference lib="webworker" />

import {
	prepareRgbdSequenceData,
	type PreparedRgbdSequencePreparedData,
	type RgbdSequencePreparationProgress,
	type RgbdSequenceSamplingSettings,
} from './rgbdSequencePlayback.js';
import type { RgbdSequenceFrameData } from './rgbdSequenceSources.js';

interface PrepareRgbdSequenceWorkerRequest {
	type: 'prepare';
	rawFrames: readonly RgbdSequenceFrameData[];
	sampling: RgbdSequenceSamplingSettings;
	fetchMs: number;
}

interface PrepareRgbdSequenceWorkerProgressMessage {
	type: 'progress';
	progress: RgbdSequencePreparationProgress;
}

interface PrepareRgbdSequenceWorkerResultMessage {
	type: 'result';
	preparedData: PreparedRgbdSequencePreparedData;
}

interface PrepareRgbdSequenceWorkerErrorMessage {
	type: 'error';
	message: string;
}

type PrepareRgbdSequenceWorkerMessage =
	| PrepareRgbdSequenceWorkerProgressMessage
	| PrepareRgbdSequenceWorkerResultMessage
	| PrepareRgbdSequenceWorkerErrorMessage;

self.onmessage = (event: MessageEvent<PrepareRgbdSequenceWorkerRequest>) => {
	if (event.data.type !== 'prepare') {
		return;
	}

	try {
		const preparedData = prepareRgbdSequenceData({
			rawFrames: event.data.rawFrames,
			sampling: event.data.sampling,
			fetchMs: event.data.fetchMs,
			onProgress: (progress) => {
				self.postMessage({
					type: 'progress',
					progress,
				} satisfies PrepareRgbdSequenceWorkerProgressMessage);
			},
		});

		self.postMessage(
			{
				type: 'result',
				preparedData,
			} satisfies PrepareRgbdSequenceWorkerResultMessage,
			collectTransferables(preparedData),
		);
	} catch (error) {
		self.postMessage({
			type: 'error',
			message: error instanceof Error ? error.message : 'RGBD sequence preparation failed.',
		} satisfies PrepareRgbdSequenceWorkerErrorMessage);
	}
};

function collectTransferables(preparedData: PreparedRgbdSequencePreparedData): Transferable[] {
	const transferables: Transferable[] = [];
	for (const frame of preparedData.frames) {
		transferables.push(frame.positions.buffer, frame.colors.buffer, frame.radii.buffer, frame.opacities.buffer);
		if (frame.ids) transferables.push(frame.ids.buffer);
		if (frame.normals) transferables.push(frame.normals.buffer);
		if (frame.orientations) transferables.push(frame.orientations.buffer);
		if (frame.velocities) transferables.push(frame.velocities.buffer);
		if (frame.anchors) transferables.push(frame.anchors.buffer);
		if (frame.barycentrics) transferables.push(frame.barycentrics.buffer);
		if (frame.uv) transferables.push(frame.uv.buffer);
	}
	return transferables;
}

export {};
