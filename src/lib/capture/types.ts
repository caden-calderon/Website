export type CaptureDecision = 'pending' | 'keep' | 'discard';

export interface CaptureFramePayload {
	width: number;
	height: number;
	encoding: string;
	data: string;
	units?: string;
	invalidValueMeters?: number;
}

export interface CaptureRecordingState {
	active: boolean;
	status: string;
	takeId: string | null;
	pid: number | null;
	label: string | null;
	startedAt: string | null;
	frameCount: number;
	elapsedMs: number;
	fps: number | null;
	width: number | null;
	height: number | null;
	maxFrames: number | null;
	stopRequested: boolean;
	mockFallback: boolean;
}

export interface CaptureControlStatus {
	version: number;
	backendAvailable: boolean;
	providerMode: string;
	updatedAt: string;
	lastCompletedTakeId: string | null;
	lastError: {
		message: string;
		logPath?: string;
		takeId?: string;
	} | null;
	recording: CaptureRecordingState;
	takeCount: number;
}

export interface CapturePreviewFrame {
	version: number;
	capturedAt: string;
	providerMode: string;
	recordingActive: boolean;
	rawTakeId: string | null;
	frameIndex: number;
	frameTimestampMs: number;
	color: CaptureFramePayload;
	depth: CaptureFramePayload;
}

export interface CaptureTakeSummary {
	takeId: string;
	rawTakeId: string;
	label: string;
	decision: CaptureDecision;
	createdAt: string;
	updatedAt: string;
	trim: {
		inFrame: number;
		outFrame: number;
		inTimestampMs: number;
		outTimestampMs: number | null;
	};
	frameCount: number;
	fps: number;
	startedAt: string;
	endedAt: string;
	registration: {
		provider: string;
		alignedTo: string;
		status: string;
		colorSource: string;
	};
}

export interface CaptureTakeListResponse {
	takes: CaptureTakeSummary[];
}

export interface CaptureEditedTake {
	version: number;
	editedTakeId: string;
	rawTakeId: string;
	label: string;
	decision: CaptureDecision;
	createdAt: string;
	updatedAt: string;
	trim: {
		inFrame: number;
		outFrame: number;
		inTimestampMs: number;
		outTimestampMs: number | null;
	};
	sync: {
		markers: unknown[];
		solvedOffsetMs: number | null;
	};
	externalCamera: {
		clipId: string | null;
		notes: string | null;
	};
	notes: string;
}

export interface CaptureRawTakePayload {
	version: number;
	fps: number;
	frameCount: number;
	frameTimestampsMs: number[];
	frames: Array<{
		colorFile: string;
		depthFile: string;
	}>;
	clips: Array<{
		id: string;
		startFrame: number;
		endFrame: number;
		mode: string;
	}>;
	color: {
		width: number;
		height: number;
		encoding: string;
		description: string;
	};
	depth: {
		width: number;
		height: number;
		encoding: string;
		units: string;
		invalidValueMeters: number;
		description: string;
	};
	registration: {
		provider: string;
		alignedTo: string;
		status: string;
		colorSource: string;
	};
	capture: Record<string, unknown>;
}

export interface CaptureTakeDetail {
	takeId: string;
	editedTake: CaptureEditedTake;
	rawTake: {
		path: string;
		capture: CaptureRawTakePayload;
	};
}

export interface CaptureTakeFrame {
	takeId: string;
	frameIndex: number;
	frameTimestampMs: number;
	color: CaptureFramePayload;
	depth: CaptureFramePayload;
}
