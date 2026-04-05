import { describe, expect, it } from 'vitest';
import {
	estimateUploadedVideoRgbdBuildMs,
	resolveUploadedVideoFramePlan,
} from '../../src/lib/demo/rgbdVideoSequence.js';

describe('rgbdVideoSequence', () => {
	it('scales uploaded video frames to the configured max edge and caps frame count', () => {
		const plan = resolveUploadedVideoFramePlan({
			durationSeconds: 10,
			sourceWidth: 1920,
			sourceHeight: 1080,
			targetFps: 12,
			maxFrameCount: 48,
			maxEdge: 640,
		});

		expect(plan.rasterWidth).toBe(640);
		expect(plan.rasterHeight).toBe(360);
		expect(plan.frameCount).toBe(48);
		expect(plan.timestampsMs).toHaveLength(48);
		expect(plan.fps).toBeCloseTo(12, 5);
		expect(plan.timestampsMs[1]).toBeCloseTo(1000 / 12, 5);
	});

	it('still produces a single frame for extremely short clips', () => {
		const plan = resolveUploadedVideoFramePlan({
			durationSeconds: 0.02,
			sourceWidth: 512,
			sourceHeight: 424,
			targetFps: 12,
			maxFrameCount: 48,
			maxEdge: 640,
		});

		expect(plan.frameCount).toBe(1);
		expect(plan.timestampsMs).toEqual([0]);
		expect(plan.rasterWidth).toBe(512);
		expect(plan.rasterHeight).toBe(424);
	});

	it('estimates deeper builds as more expensive than raster-only uploads', () => {
		const withoutDepth = estimateUploadedVideoRgbdBuildMs({
			frameCount: 24,
			rasterWidth: 640,
			rasterHeight: 360,
			useEstimatedDepth: false,
		});
		const withDepth = estimateUploadedVideoRgbdBuildMs({
			frameCount: 24,
			rasterWidth: 640,
			rasterHeight: 360,
			useEstimatedDepth: true,
		});

		expect(withDepth).toBeGreaterThan(withoutDepth);
	});
});
