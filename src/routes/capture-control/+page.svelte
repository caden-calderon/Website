<script lang="ts">
	import { onMount } from 'svelte';
	import type {
		CaptureControlStatus,
		CaptureDecision,
		CapturePreviewFrame,
		CaptureTakeDetail,
		CaptureTakeFrame,
		CaptureTakeSummary,
	} from '$lib/capture/types.js';

	let status = $state<CaptureControlStatus | null>(null);
	let preview = $state<CapturePreviewFrame | null>(null);
	let takes = $state<CaptureTakeSummary[]>([]);
	let selectedTakeId = $state<string | null>(null);
	let selectedTake = $state<CaptureTakeDetail | null>(null);
	let reviewFrame = $state<CaptureTakeFrame | null>(null);
	let selectedFrameIndex = $state(0);
	let recordLabel = $state('');
	let recordFps = $state(12);
	let recordMaxFrames = $state(180);
	let renameLabel = $state('');
	let actionError = $state<string | null>(null);
	let actionStatus = $state('Loading capture-control state…');
	let actionPending = $state(false);
	let reviewPlaying = $state(false);
	let previewLoadVersion = 0;
	let takeLoadVersion = 0;
	let frameLoadVersion = 0;
	let lastCompletedTakeId = '';
	let refreshInFlight = false;
	let previewColorCanvas = $state<HTMLCanvasElement | null>(null);
	let previewDepthCanvas = $state<HTMLCanvasElement | null>(null);
	let reviewColorCanvas = $state<HTMLCanvasElement | null>(null);
	let reviewDepthCanvas = $state<HTMLCanvasElement | null>(null);
	let refreshTimer: number | null = null;
	let reviewPlayTimer: number | null = null;

	onMount(() => {
		void refreshAll();
		refreshTimer = window.setInterval(() => {
			void refreshStatusAndPreview();
		}, 900);

		return () => {
			if (refreshTimer) {
				window.clearInterval(refreshTimer);
			}
			if (reviewPlayTimer) {
				window.clearInterval(reviewPlayTimer);
			}
		};
	});

	$effect(() => {
		if (reviewPlayTimer) {
			window.clearInterval(reviewPlayTimer);
			reviewPlayTimer = null;
		}
		if (!reviewPlaying || !selectedTake) {
			return;
		}

		const fps = Math.max(1, selectedTake.rawTake.capture.fps || 12);
		reviewPlayTimer = window.setInterval(() => {
			const trimOut = selectedTake?.editedTake.trim.outFrame ?? 0;
			if (selectedFrameIndex >= trimOut) {
				reviewPlaying = false;
				return;
			}
			selectedFrameIndex += 1;
		}, Math.max(33, Math.round(1000 / fps)));

		return () => {
			if (reviewPlayTimer) {
				window.clearInterval(reviewPlayTimer);
				reviewPlayTimer = null;
			}
		};
	});

	$effect(() => {
		if (selectedTake && selectedFrameIndex < selectedTake.editedTake.trim.inFrame) {
			selectedFrameIndex = selectedTake.editedTake.trim.inFrame;
		}
		if (selectedTake && selectedFrameIndex > selectedTake.editedTake.trim.outFrame) {
			selectedFrameIndex = selectedTake.editedTake.trim.outFrame;
		}
	});

	$effect(() => {
		if (selectedTakeId) {
			void loadTake(selectedTakeId);
		}
	});

	$effect(() => {
		if (selectedTakeId && selectedTake) {
			void loadReviewFrame(selectedTakeId, selectedFrameIndex);
		}
	});

	$effect(() => {
		if (previewColorCanvas && previewDepthCanvas && preview) {
			drawRgbaFrame(previewColorCanvas, preview.color);
			drawDepthFrame(previewDepthCanvas, preview.depth);
		}
	});

	$effect(() => {
		if (reviewColorCanvas && reviewDepthCanvas && reviewFrame) {
			drawRgbaFrame(reviewColorCanvas, reviewFrame.color);
			drawDepthFrame(reviewDepthCanvas, reviewFrame.depth);
		}
	});

	async function refreshAll(): Promise<void> {
		await Promise.all([refreshStatusAndPreview(), refreshTakes()]);
	}

	async function refreshStatusAndPreview(): Promise<void> {
		if (refreshInFlight) {
			return;
		}
		refreshInFlight = true;
		try {
			const nextStatus = await fetchJson<CaptureControlStatus>('/api/capture-control/status');
			status = nextStatus;
			if (nextStatus.lastCompletedTakeId && nextStatus.lastCompletedTakeId !== lastCompletedTakeId) {
				lastCompletedTakeId = nextStatus.lastCompletedTakeId;
				await refreshTakes();
				selectedTakeId = nextStatus.lastCompletedTakeId;
			}
			const nextPreview = await fetchJson<CapturePreviewFrame>('/api/capture-control/preview?width=192&height=160');
			preview = nextPreview;
		} catch (error) {
			actionError = readErrorMessage(error);
		} finally {
			refreshInFlight = false;
		}
	}

	async function refreshTakes(): Promise<void> {
		const response = await fetchJson<{ takes: CaptureTakeSummary[] }>('/api/capture-control/takes');
		takes = response.takes;
		if (!selectedTakeId && takes.length > 0) {
			selectedTakeId = takes[0].takeId;
		}
	}

	async function loadTake(takeId: string): Promise<void> {
		const version = ++takeLoadVersion;
		const detail = await fetchJson<CaptureTakeDetail>(`/api/capture-control/takes/${takeId}`);
		if (version !== takeLoadVersion) return;
		selectedTake = detail;
		renameLabel = detail.editedTake.label;
		if (
			selectedFrameIndex < detail.editedTake.trim.inFrame ||
			selectedFrameIndex > detail.editedTake.trim.outFrame
		) {
			selectedFrameIndex = detail.editedTake.trim.inFrame;
		}
	}

	async function loadReviewFrame(takeId: string, frameIndex: number): Promise<void> {
		const version = ++frameLoadVersion;
		const frame = await fetchJson<CaptureTakeFrame>(`/api/capture-control/takes/${takeId}/frames/${frameIndex}`);
		if (version !== frameLoadVersion) return;
		reviewFrame = frame;
	}

	async function handleStartRecording(): Promise<void> {
		actionPending = true;
		actionError = null;
		actionStatus = 'Starting recording…';
		try {
			status = await postJson<CaptureControlStatus>('/api/capture-control/record/start', {
				label: recordLabel || undefined,
				fps: recordFps,
				maxFrames: recordMaxFrames,
				width: 192,
				height: 160,
			});
			actionStatus = `Recording ${status.recording.label ?? status.recording.takeId ?? 'take'}…`;
			await refreshStatusAndPreview();
		} catch (error) {
			actionError = readErrorMessage(error);
		} finally {
			actionPending = false;
		}
	}

	async function handleStopRecording(): Promise<void> {
		actionPending = true;
		actionError = null;
		actionStatus = 'Stopping recording…';
		try {
			status = await postJson<CaptureControlStatus>('/api/capture-control/record/stop', {
				timeoutMs: 6_000,
			});
			actionStatus = status.lastCompletedTakeId
				? `Recorded ${status.lastCompletedTakeId}.`
				: 'Recording stopped.';
			await refreshAll();
		} catch (error) {
			actionError = readErrorMessage(error);
		} finally {
			actionPending = false;
		}
	}

	async function handleRename(): Promise<void> {
		if (!selectedTakeId) return;
		actionPending = true;
		actionError = null;
		try {
			await postJson(`/api/capture-control/takes/${selectedTakeId}/rename`, { label: renameLabel });
			actionStatus = `Renamed ${selectedTakeId}.`;
			await refreshTakes();
			await loadTake(selectedTakeId);
		} catch (error) {
			actionError = readErrorMessage(error);
		} finally {
			actionPending = false;
		}
	}

	async function handleDecision(decision: CaptureDecision): Promise<void> {
		if (!selectedTakeId) return;
		actionPending = true;
		actionError = null;
		try {
			await postJson(`/api/capture-control/takes/${selectedTakeId}/decision`, { decision });
			actionStatus = `${decision} saved for ${selectedTakeId}.`;
			await refreshTakes();
			await loadTake(selectedTakeId);
		} catch (error) {
			actionError = readErrorMessage(error);
		} finally {
			actionPending = false;
		}
	}

	async function handleTrim(trimInFrame: number, trimOutFrame: number): Promise<void> {
		if (!selectedTakeId) return;
		actionPending = true;
		actionError = null;
		try {
			await postJson(`/api/capture-control/takes/${selectedTakeId}/trim`, {
				trimInFrame,
				trimOutFrame,
			});
			actionStatus = `Trim saved for ${selectedTakeId}.`;
			await refreshTakes();
			await loadTake(selectedTakeId);
		} catch (error) {
			actionError = readErrorMessage(error);
		} finally {
			actionPending = false;
		}
	}

	function stepFrame(delta: number): void {
		if (!selectedTake) return;
		selectedFrameIndex = clamp(
			selectedFrameIndex + delta,
			selectedTake.editedTake.trim.inFrame,
			selectedTake.editedTake.trim.outFrame,
		);
	}

	function formatRelativeTime(milliseconds: number | null | undefined): string {
		if (typeof milliseconds !== 'number' || Number.isNaN(milliseconds)) {
			return 'n/a';
		}
		if (milliseconds < 1_000) {
			return `${milliseconds.toFixed(0)} ms`;
		}
		return `${(milliseconds / 1000).toFixed(2)} s`;
	}

	function formatDecision(decision: CaptureDecision): string {
		switch (decision) {
			case 'keep':
				return 'keep';
			case 'discard':
				return 'discard';
			default:
				return 'pending';
		}
	}

	async function fetchJson<T>(url: string): Promise<T> {
		const response = await fetch(url);
		const payload = (await response.json()) as T & { error?: string };
		if (!response.ok) {
			throw new Error(payload.error ?? `Request failed for ${url}.`);
		}
		return payload;
	}

	async function postJson<T>(url: string, body: object): Promise<T> {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
			},
			body: JSON.stringify(body),
		});
		const payload = (await response.json()) as T & { error?: string };
		if (!response.ok) {
			throw new Error(payload.error ?? `Request failed for ${url}.`);
		}
		return payload;
	}

	function readErrorMessage(error: unknown): string {
		return error instanceof Error ? error.message : 'Unknown capture-control error.';
	}

	function drawRgbaFrame(canvas: HTMLCanvasElement, frame: { width: number; height: number; data: string }): void {
		const context = canvas.getContext('2d');
		if (!context) return;
		const bytes = decodeBase64Bytes(frame.data);
		canvas.width = frame.width;
		canvas.height = frame.height;
		const imageData = new ImageData(new Uint8ClampedArray(bytes), frame.width, frame.height);
		context.putImageData(imageData, 0, 0);
	}

	function drawDepthFrame(
		canvas: HTMLCanvasElement,
		frame: { width: number; height: number; data: string; invalidValueMeters?: number },
	): void {
		const context = canvas.getContext('2d');
		if (!context) return;
		const depthValues = decodeFloat32Base64(frame.data);
		const invalidValue = frame.invalidValueMeters ?? 0;
		const validValues = depthValues.filter((value) => value > 0 && value !== invalidValue);
		const near = validValues.length > 0 ? Math.min(...validValues) : 0;
		const far = validValues.length > 0 ? Math.max(...validValues) : 1;
		const range = Math.max(1e-6, far - near);
		const pixels = new Uint8ClampedArray(frame.width * frame.height * 4);
		for (let index = 0; index < depthValues.length; index += 1) {
			const value = depthValues[index] ?? 0;
			const pixelIndex = index * 4;
			const intensity = value > 0 && value !== invalidValue
				? Math.round((1 - (value - near) / range) * 255)
				: 0;
			pixels[pixelIndex] = intensity;
			pixels[pixelIndex + 1] = intensity;
			pixels[pixelIndex + 2] = intensity;
			pixels[pixelIndex + 3] = 255;
		}
		canvas.width = frame.width;
		canvas.height = frame.height;
		context.putImageData(new ImageData(pixels, frame.width, frame.height), 0, 0);
	}

	function decodeBase64Bytes(encoded: string): Uint8Array {
		const binary = atob(encoded);
		const bytes = new Uint8Array(binary.length);
		for (let index = 0; index < binary.length; index += 1) {
			bytes[index] = binary.charCodeAt(index);
		}
		return bytes;
	}

	function decodeFloat32Base64(encoded: string): number[] {
		const bytes = decodeBase64Bytes(encoded);
		const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
		const values: number[] = [];
		for (let index = 0; index < bytes.byteLength; index += 4) {
			values.push(view.getFloat32(index, true));
		}
		return values;
	}

	function clamp(value: number, minimum: number, maximum: number): number {
		return Math.max(minimum, Math.min(maximum, value));
	}
</script>

<svelte:head>
	<title>Chromatic — Capture Control</title>
</svelte:head>

<div class="min-h-screen bg-[#0a0d12] px-6 py-6 text-[#d8dee6]">
	<div class="mx-auto flex max-w-7xl flex-col gap-6">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div>
				<div class="text-xs uppercase tracking-[0.24em] text-[#6f7d8d]">Phase 2 Capture Control</div>
				<h1 class="mt-2 text-3xl font-semibold text-white">Operator Workflow</h1>
				<p class="mt-2 max-w-3xl text-sm text-[#92a0b1]">
					Separate from the browser RGBD demo. This surface is for preview, record/stop, take review,
					keep/discard, rename, and trim metadata against immutable raw takes.
				</p>
			</div>
			<a
				href="/"
				class="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
			>
				Open Point Demo
			</a>
		</div>

		<div class="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
			<section class="rounded-3xl border border-white/8 bg-[#11161d] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h2 class="text-lg font-semibold text-white">Live Preview</h2>
						<p class="mt-1 text-sm text-[#8a99ab]">
							{#if status?.recording.active}
								Recording {status.recording.label ?? status.recording.takeId} ·
								{status.recording.frameCount} frames ·
								{formatRelativeTime(status.recording.elapsedMs)}
							{:else if status}
								Idle · provider {status.providerMode} ·
								{status.takeCount} saved take{status.takeCount === 1 ? '' : 's'}
							{:else}
								Loading status…
							{/if}
						</p>
					</div>
					<div class="rounded-full border border-[#3a6d9d]/30 bg-[#16304a] px-3 py-1 text-xs text-[#90c4ff]">
						{status?.providerMode === 'live-kinect'
							? 'live Kinect'
							: status?.backendAvailable
								? status.providerMode
								: 'mock fallback active'}
					</div>
				</div>

				<div class="mt-5 grid gap-4 lg:grid-cols-2">
					<div class="rounded-2xl border border-white/8 bg-black/40 p-3">
						<div class="mb-2 text-xs uppercase tracking-[0.18em] text-[#6f7d8d]">Registered Color</div>
						<canvas bind:this={previewColorCanvas} class="w-full rounded-xl bg-black"></canvas>
					</div>
					<div class="rounded-2xl border border-white/8 bg-black/40 p-3">
						<div class="mb-2 text-xs uppercase tracking-[0.18em] text-[#6f7d8d]">Depth Preview</div>
						<canvas bind:this={previewDepthCanvas} class="w-full rounded-xl bg-black"></canvas>
					</div>
				</div>

				<div class="mt-5 grid gap-3 md:grid-cols-[1fr_auto_auto]">
					<input
						bind:value={recordLabel}
						class="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-[#5b6775] focus:border-[#4d8cca]"
						placeholder="take label"
						disabled={actionPending || Boolean(status?.recording.active)}
					/>
					<label class="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-[#b8c3cf]">
						fps
						<input
							type="number"
							min="1"
							max="60"
							bind:value={recordFps}
							class="mt-2 w-20 bg-transparent text-white outline-none"
							disabled={actionPending || Boolean(status?.recording.active)}
						/>
					</label>
					<label class="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-[#b8c3cf]">
						max frames
						<input
							type="number"
							min="1"
							max="2000"
							bind:value={recordMaxFrames}
							class="mt-2 w-24 bg-transparent text-white outline-none"
							disabled={actionPending || Boolean(status?.recording.active)}
						/>
					</label>
				</div>

				<div class="mt-4 flex flex-wrap gap-3">
					<button
						class="rounded-full bg-[#6a2a1f] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7e3326] disabled:cursor-not-allowed disabled:opacity-50"
						onclick={handleStartRecording}
						disabled={actionPending || Boolean(status?.recording.active)}
					>
						Record
					</button>
					<button
						class="rounded-full bg-[#244f73] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2d618d] disabled:cursor-not-allowed disabled:opacity-50"
						onclick={handleStopRecording}
						disabled={actionPending || !status?.recording.active}
					>
						Stop
					</button>
				</div>

				<div class="mt-4 rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-[#9ba9ba]">
					<div>{actionStatus}</div>
					{#if actionError}
						<div class="mt-2 text-[#ff8b8b]">{actionError}</div>
					{/if}
					{#if status?.lastError}
						<div class="mt-2 text-[#ffb26b]">{status.lastError.message}</div>
					{/if}
				</div>
			</section>

			<section class="rounded-3xl border border-white/8 bg-[#11161d] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
				<div class="flex items-center justify-between gap-3">
					<div>
						<h2 class="text-lg font-semibold text-white">Take List</h2>
						<p class="mt-1 text-sm text-[#8a99ab]">
							{takes.length === 0 ? 'No takes recorded yet.' : `${takes.length} take${takes.length === 1 ? '' : 's'} available.`}
						</p>
					</div>
				</div>

				<div class="mt-4 flex max-h-[34rem] flex-col gap-2 overflow-y-auto pr-1">
					{#if takes.length === 0}
						<div class="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-[#728091]">
							Start with preview, record intentionally, then review here.
						</div>
					{:else}
						{#each takes as take}
							<button
								class={`rounded-2xl border px-4 py-3 text-left transition ${
									selectedTakeId === take.takeId
										? 'border-[#5c86b4] bg-[#192638]'
										: 'border-white/8 bg-black/20 hover:bg-black/30'
								}`}
								onclick={() => {
									selectedTakeId = take.takeId;
									reviewPlaying = false;
								}}
							>
								<div class="flex items-center justify-between gap-3">
									<div class="text-sm font-medium text-white">{take.label}</div>
									<div class="rounded-full border border-white/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.18em] text-[#8ea3b9]">
										{formatDecision(take.decision)}
									</div>
								</div>
								<div class="mt-2 text-xs text-[#8190a2]">
									{take.frameCount} frames at {take.fps} fps · trim {take.trim.inFrame}-{take.trim.outFrame}
								</div>
							</button>
						{/each}
					{/if}
				</div>
			</section>
		</div>

		<section class="rounded-3xl border border-white/8 bg-[#11161d] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 class="text-lg font-semibold text-white">Take Review</h2>
					<p class="mt-1 text-sm text-[#8a99ab]">
						Review raw takes immediately. Keep/discard, rename, and trim metadata without mutating the raw capture bundle.
					</p>
				</div>
			</div>

			{#if selectedTake}
				<div class="mt-5 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
					<div class="grid gap-4 lg:grid-cols-2">
						<div class="rounded-2xl border border-white/8 bg-black/40 p-3">
							<div class="mb-2 text-xs uppercase tracking-[0.18em] text-[#6f7d8d]">Review Color</div>
							<canvas bind:this={reviewColorCanvas} class="w-full rounded-xl bg-black"></canvas>
						</div>
						<div class="rounded-2xl border border-white/8 bg-black/40 p-3">
							<div class="mb-2 text-xs uppercase tracking-[0.18em] text-[#6f7d8d]">Review Depth</div>
							<canvas bind:this={reviewDepthCanvas} class="w-full rounded-xl bg-black"></canvas>
						</div>

						<div class="rounded-2xl border border-white/8 bg-black/20 p-4 lg:col-span-2">
							<div class="flex flex-wrap items-center gap-3">
								<button
									class="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white transition hover:bg-white/10"
									onclick={() => (reviewPlaying = !reviewPlaying)}
								>
									{reviewPlaying ? 'Pause' : 'Play'}
								</button>
								<button
									class="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white transition hover:bg-white/10"
									onclick={() => stepFrame(-1)}
								>
									Prev
								</button>
								<button
									class="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white transition hover:bg-white/10"
									onclick={() => stepFrame(1)}
								>
									Next
								</button>
								<div class="text-sm text-[#9ba9ba]">
									frame {selectedFrameIndex} · {formatRelativeTime(reviewFrame?.frameTimestampMs)}
								</div>
							</div>
							<input
								type="range"
								min={selectedTake.editedTake.trim.inFrame}
								max={selectedTake.editedTake.trim.outFrame}
								step="1"
								bind:value={selectedFrameIndex}
								class="mt-4 w-full"
							/>
						</div>
					</div>

					<div class="flex flex-col gap-4">
						<div class="rounded-2xl border border-white/8 bg-black/20 p-4">
							<div class="text-xs uppercase tracking-[0.18em] text-[#6f7d8d]">Metadata</div>
							<div class="mt-3 space-y-2 text-sm text-[#c7d2de]">
								<div>Raw take: {selectedTake.takeId}</div>
								<div>Frames: {selectedTake.rawTake.capture.frameCount}</div>
								<div>FPS: {selectedTake.rawTake.capture.fps}</div>
								<div>Recorded: {selectedTake.editedTake.createdAt}</div>
								<div>Trim: {selectedTake.editedTake.trim.inFrame}-{selectedTake.editedTake.trim.outFrame}</div>
							</div>
						</div>

						<div class="rounded-2xl border border-white/8 bg-black/20 p-4">
							<div class="text-xs uppercase tracking-[0.18em] text-[#6f7d8d]">Rename / Decision</div>
							<input
								bind:value={renameLabel}
								class="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-[#4d8cca]"
							/>
							<div class="mt-3 flex flex-wrap gap-2">
								<button
									class="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white transition hover:bg-white/10 disabled:opacity-50"
									onclick={handleRename}
									disabled={actionPending}
								>
									Rename
								</button>
								<button
									class="rounded-full bg-[#265b39] px-4 py-2 text-sm text-white transition hover:bg-[#2d6d43] disabled:opacity-50"
									onclick={() => handleDecision('keep')}
									disabled={actionPending}
								>
									Keep
								</button>
								<button
									class="rounded-full bg-[#6d3a27] px-4 py-2 text-sm text-white transition hover:bg-[#7d4430] disabled:opacity-50"
									onclick={() => handleDecision('discard')}
									disabled={actionPending}
								>
									Discard
								</button>
							</div>
						</div>

						<div class="rounded-2xl border border-white/8 bg-black/20 p-4">
							<div class="text-xs uppercase tracking-[0.18em] text-[#6f7d8d]">Trim Metadata</div>
							<div class="mt-3 flex flex-wrap gap-2">
								<button
									class="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white transition hover:bg-white/10 disabled:opacity-50"
									onclick={() => handleTrim(selectedFrameIndex, selectedTake!.editedTake.trim.outFrame)}
									disabled={actionPending}
								>
									Set In
								</button>
								<button
									class="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white transition hover:bg-white/10 disabled:opacity-50"
									onclick={() => handleTrim(selectedTake!.editedTake.trim.inFrame, selectedFrameIndex)}
									disabled={actionPending}
								>
									Set Out
								</button>
								<button
									class="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white transition hover:bg-white/10 disabled:opacity-50"
									onclick={() => handleTrim(0, selectedTake!.rawTake.capture.frameCount - 1)}
									disabled={actionPending}
								>
									Reset Trim
								</button>
							</div>
							<div class="mt-3 text-sm text-[#94a2b3]">
								Edited take preserves trim only. Raw capture stays unchanged under
								`tmp/kinect-capture/raw-takes/`.
							</div>
						</div>
					</div>
				</div>
			{:else}
				<div class="mt-5 rounded-2xl border border-dashed border-white/10 px-4 py-8 text-sm text-[#728091]">
					Select a take to review it.
				</div>
			{/if}
		</section>
	</div>
</div>
