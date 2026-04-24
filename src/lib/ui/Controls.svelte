<script lang="ts">
	import type { RenderParams, BloomParams } from '$lib/engine/render/types.js';
	import type { DepthModelInfo } from '$lib/engine/preprocessing/DepthEstimation.js';
	import type { BgRemovalModelInfo } from '$lib/engine/preprocessing/BackgroundRemoval.js';
	import type { FrameParams } from '$lib/engine/processing/FrameGenerator.js';
	import { FRAME_STYLES } from '$lib/engine/processing/FrameGenerator.js';
	import type { FrameStyle } from '$lib/engine/processing/FrameGenerator.js';
	import type { DemoImageAsset, DemoMeshAsset, DemoSequenceAsset } from '$lib/demo/assets.js';
	import type { SequenceLookPreset } from '$lib/demo/sequenceLooks.js';
	import type {
		PreparedPointSequenceBounds,
		PreparedPointSequenceReport,
	} from '$lib/demo/pointSequencePlayback.js';
	import type { PreparedRgbdSequenceReport } from '$lib/demo/rgbdSequencePlayback.js';
	import type {
		BgRemovalProvider,
		ServerBgRemovalModelInfo,
	} from '$lib/services/backgroundRemoval.js';
	import { MAX_WEIGHTED_VORONOI_SAMPLES } from '$lib/engine/algorithms/weighted-voronoi.js';

	interface Props {
		renderParams: RenderParams;
		bloomParams: BloomParams;
		mode: 'mesh' | 'image' | 'sequence';
		selectedMeshAssetId: string;
		selectedImageAssetId: string;
		selectedSequenceAssetId: string;
		selectedSequenceAssetKind: 'point-sequence' | 'rgbd-sequence';
		selectedSequenceAssetSource: 'manifest' | 'derived-image' | 'uploaded-video' | null;
		uploadedSequenceVideoName: string | null;
		uploadedVideoTargetFps: number;
		uploadedVideoMaxFrameCount: number;
		selectedSequenceClipId: string;
		selectedSequenceLookPresetId: string;
		availableSequenceClipIds: string[];
		sequenceMaxPointsPerFrame: number;
		sequenceAutoCenter: boolean;
		sequenceFitHeightEnabled: boolean;
		sequenceFitHeight: number;
		sequenceScaleMultiplier: number;
		sequenceReport: PreparedPointSequenceReport | PreparedRgbdSequenceReport | null;
		sequenceBounds: PreparedPointSequenceBounds | null;
		sequenceLookPresets: readonly SequenceLookPreset[];
		sequenceStatus: string;
		sequenceIsPlaying: boolean;
		algorithm: 'rejection' | 'importance' | 'weighted-voronoi';
		sampleCount: number;
		depthScale: number;
		densityGamma: number;
		radiusFromLuminance: boolean;
		sizeVariation: number;
		outlierRadius: number;
		normalDisplacement: number;
		removeBg: boolean;
		bgProvider: BgRemovalProvider;
		bgModelIndex: number;
		serverBgModelId: string;
		useDepthMap: boolean;
		depthModelIndex: number;
		outerBackgroundColor: string | null;
		innerBackgroundColor: string | null;
		frameParams: FrameParams;
		meshAssets: DemoMeshAsset[];
		imageAssets: DemoImageAsset[];
		sequenceAssets: DemoSequenceAsset[];
		bgModels: BgRemovalModelInfo[];
		serverBgModels: ServerBgRemovalModelInfo[];
		depthModels: DepthModelInfo[];
		processingStatus: string;
		hasImage: boolean;
		onRenderParamsChange: (params: RenderParams) => void;
		onModeChange: (mode: 'mesh' | 'image' | 'sequence') => void;
		onMeshAssetChange: (assetId: string) => void;
		onImageAssetChange: (assetId: string) => void;
		onSequenceAssetChange: (assetId: string) => void;
		onSequenceLookPresetChange: (presetId: string) => void;
		onSequenceMaxPointsPerFrameChange: (maxPointsPerFrame: number) => void;
		onSequenceAutoCenterChange: (enabled: boolean) => void;
		onSequenceFitHeightEnabledChange: (enabled: boolean) => void;
		onSequenceFitHeightChange: (height: number) => void;
		onSequenceScaleMultiplierChange: (scale: number) => void;
		onSequenceClipChange: (clipId: string) => void;
		onSequencePlaybackToggle: () => void;
		onSequenceRestart: () => void;
		onAlgorithmChange: (algorithm: 'rejection' | 'importance' | 'weighted-voronoi') => void;
		onSampleCountChange: (count: number) => void;
		onImageUpload: (file: File) => void;
		onVideoUpload: (file: File) => void;
		onUploadedVideoTargetFpsChange: (fps: number) => void;
		onUploadedVideoMaxFrameCountChange: (maxFrameCount: number) => void;
		onResample: () => void;
		onRemoveBg: (enabled: boolean) => void;
		onBgProviderChange: (provider: BgRemovalProvider) => void;
		onBgModelChange: (index: number) => void;
		onServerBgModelChange: (modelId: string) => void;
		onEstimateDepth: (enabled: boolean) => void;
		onDepthModelChange: (index: number) => void;
		onOuterBackgroundColorChange: (color: string | null) => void;
		onInnerBackgroundColorChange: (color: string | null) => void;
		onFrameParamsChange: (params: FrameParams) => void;
		onSaveSettings: () => void;
		onResetSettings: () => void;
		panelLayout?: 'viewport' | 'container';
	}

	let {
		renderParams = $bindable(),
		bloomParams = $bindable(),
		mode = $bindable(),
		selectedMeshAssetId,
		selectedImageAssetId,
		selectedSequenceAssetId,
		selectedSequenceAssetKind,
		selectedSequenceAssetSource,
		uploadedSequenceVideoName,
		uploadedVideoTargetFps = $bindable(),
		uploadedVideoMaxFrameCount = $bindable(),
		selectedSequenceClipId,
		selectedSequenceLookPresetId,
		availableSequenceClipIds,
		sequenceMaxPointsPerFrame = $bindable(),
		sequenceAutoCenter = $bindable(),
		sequenceFitHeightEnabled = $bindable(),
		sequenceFitHeight = $bindable(),
		sequenceScaleMultiplier = $bindable(),
		sequenceReport,
		sequenceBounds,
		sequenceLookPresets,
		sequenceStatus,
		sequenceIsPlaying,
		algorithm = $bindable(),
		sampleCount = $bindable(),
		depthScale = $bindable(),
		densityGamma = $bindable(),
		radiusFromLuminance = $bindable(),
		sizeVariation = $bindable(),
		outlierRadius = $bindable(),
		normalDisplacement = $bindable(),
		removeBg = $bindable(),
		bgProvider = $bindable(),
		bgModelIndex = $bindable(),
		serverBgModelId = $bindable(),
		useDepthMap = $bindable(),
		depthModelIndex = $bindable(),
		outerBackgroundColor = $bindable(),
		innerBackgroundColor = $bindable(),
		frameParams = $bindable(),
		meshAssets,
		imageAssets,
		sequenceAssets,
		bgModels,
		serverBgModels,
		depthModels,
		processingStatus,
		hasImage,
		onRenderParamsChange,
		onModeChange,
		onMeshAssetChange,
		onImageAssetChange,
		onSequenceAssetChange,
		onSequenceLookPresetChange,
		onSequenceMaxPointsPerFrameChange,
		onSequenceAutoCenterChange,
		onSequenceFitHeightEnabledChange,
		onSequenceFitHeightChange,
		onSequenceScaleMultiplierChange,
		onSequenceClipChange,
		onSequencePlaybackToggle,
		onSequenceRestart,
		onAlgorithmChange,
		onSampleCountChange,
		onImageUpload,
		onVideoUpload,
		onUploadedVideoTargetFpsChange,
		onUploadedVideoMaxFrameCountChange,
		onResample,
		onRemoveBg,
		onBgProviderChange,
		onBgModelChange,
		onServerBgModelChange,
		onEstimateDepth,
		onDepthModelChange,
		onOuterBackgroundColorChange,
		onInnerBackgroundColorChange,
		onFrameParamsChange,
		onSaveSettings,
		onResetSettings,
		panelLayout = 'viewport',
	}: Props = $props();

	import { onMount } from 'svelte';
	import { canRunTransformersBgModels } from '$lib/engine/preprocessing/webgpu-probe.js';

	let collapsed = $state(false);
	let compatDismissed = $state(false);
	let hasWebGpuForBg = $state(false);
	const sequenceDensityOptions = [0, 2048, 4096, 8192, 12000, 24000];
	const effectiveImageSampleCount = $derived(
		algorithm === 'weighted-voronoi'
			? Math.min(sampleCount, MAX_WEIGHTED_VORONOI_SAMPLES)
			: sampleCount,
	);
	const weightedVoronoiIsCapped = $derived(
		algorithm === 'weighted-voronoi' && sampleCount > MAX_WEIGHTED_VORONOI_SAMPLES,
	);

	onMount(async () => {
		hasWebGpuForBg = await canRunTransformersBgModels();
	});

	// Section collapse state
	let showBg = $state(true);
	let showImage = $state(true);
	let showSequence = $state(true);
	let showMl = $state(true);
	let showSampling = $state(true);
	let showFrame = $state(true);
	let showRender = $state(false);
	let showBloom = $state(false);
	const uploadedVideoFpsOptions = [6, 12, 24, 30];
	const uploadedVideoFrameCapOptions = [24, 48, 72, 96, 120, 150];

	function handleImageFileInput(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) onImageUpload(file);
	}

	function handleVideoFileInput(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) onVideoUpload(file);
	}

	function updateRender<K extends keyof RenderParams>(key: K, value: RenderParams[K]) {
		renderParams = { ...renderParams, [key]: value };
		onRenderParamsChange(renderParams);
	}

	function updateBloom<K extends keyof BloomParams>(key: K, value: BloomParams[K]) {
		bloomParams = { ...bloomParams, [key]: value };
	}

	function updateFrame<K extends keyof FrameParams>(key: K, value: FrameParams[K]) {
		frameParams = { ...frameParams, [key]: value };
		onFrameParamsChange(frameParams);
	}

	function isBgModelSupported(model: BgRemovalModelInfo): boolean {
		if (model.backend === 'imgly') return true;
		return hasWebGpuForBg;
	}

	function formatSequenceDensity(maxPointsPerFrame: number): string {
		return maxPointsPerFrame <= 0 ? 'all body points' : `${maxPointsPerFrame.toLocaleString()} max/frame`;
	}

	function formatBytes(bytes: number): string {
		return `${(bytes / (1024 * 1024)).toFixed(bytes >= 100 * 1024 * 1024 ? 0 : 1)} MiB`;
	}

	const panelStyle = $derived(
		panelLayout === 'container'
			? 'max-height: calc(100% - 2rem); max-width: calc(100% - 2rem);'
			: 'max-height: 95vh; max-width: calc(100vw - 2rem);',
	);
</script>

<div
	class="controls-panel top-4 right-4 z-50 overflow-y-auto overflow-x-hidden font-mono text-xs select-none"
	class:fixed={panelLayout === 'viewport'}
	class:absolute={panelLayout === 'container'}
	class:w-[22rem]={!collapsed}
	class:w-auto={collapsed}
	style={panelStyle}
>
	<button
		class="mb-2 rounded bg-white/10 px-3 py-1 text-white/60 backdrop-blur hover:bg-white/20"
		onclick={() => (collapsed = !collapsed)}
	>
		{collapsed ? '◀ controls' : '▶ hide'}
	</button>

	{#if !collapsed}
		<div class="flex min-w-0 flex-col gap-0 rounded-lg bg-black/80 p-3 text-white/80 backdrop-blur">

			{#if bgProvider === 'browser' && !hasWebGpuForBg && !compatDismissed}
				<div class="relative mb-2 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 pr-6 text-amber-300/80">
					Some ML models require a Chromium browser (Chrome, Brave, Edge).
					<button
						class="absolute top-1 right-1 text-amber-300/50 hover:text-amber-300"
						onclick={() => (compatDismissed = true)}
						aria-label="Dismiss"
					>
						&times;
					</button>
				</div>
			{/if}

			<!-- ─── Source ─────────────────────────────────────────── -->
			<fieldset class="flex gap-2 border-b border-white/10 pb-2 mb-2">
				<legend class="mb-1 text-white/50">Source</legend>
				<label class="flex items-center gap-1">
					<input type="radio" name="mode" value="mesh" checked={mode === 'mesh'} onchange={() => onModeChange('mesh')} />
					mesh
				</label>
				<label class="flex items-center gap-1">
					<input type="radio" name="mode" value="image" checked={mode === 'image'} onchange={() => onModeChange('image')} />
					image
				</label>
				<label class="flex items-center gap-1">
					<input type="radio" name="mode" value="sequence" checked={mode === 'sequence'} onchange={() => onModeChange('sequence')} />
					sequence
				</label>
			</fieldset>

			<!-- ─── Background ─────────────────────────────────────── -->
			<div class="border-b border-white/10 pb-2 mb-2">
				<button class="mb-1 w-full text-left" onclick={() => (showBg = !showBg)}>
					<span class="text-white/40">{showBg ? '▾' : '▸'} Background</span>
				</button>
				{#if showBg}
					<div class="flex flex-col gap-2 pl-1">
						<div class="flex items-center gap-2">
							<span class="w-10 text-white/50">outer</span>
							<input
								type="color"
								value={outerBackgroundColor ?? '#000000'}
								oninput={(e) => onOuterBackgroundColorChange((e.target as HTMLInputElement).value)}
								class="h-6 w-8 cursor-pointer rounded border border-white/20 bg-transparent"
							/>
							<span class="flex-1 text-white/40">{outerBackgroundColor ?? '#000000'}</span>
							{#if outerBackgroundColor}
								<button class="text-white/30 hover:text-white/60" onclick={() => onOuterBackgroundColorChange(null)}>
									reset
								</button>
							{/if}
						</div>
						<div class="flex items-center gap-2">
							<span class="w-10 text-white/50">inner</span>
							<input
								type="color"
								value={innerBackgroundColor ?? '#000000'}
								oninput={(e) => onInnerBackgroundColorChange((e.target as HTMLInputElement).value)}
								class="h-6 w-8 cursor-pointer rounded border border-white/20 bg-transparent"
							/>
							<span class="flex-1 text-white/40">{innerBackgroundColor ?? '#000000'}</span>
							{#if innerBackgroundColor}
								<button class="text-white/30 hover:text-white/60" onclick={() => onInnerBackgroundColorChange(null)}>
									reset
								</button>
							{/if}
						</div>
					</div>
				{/if}
			</div>

			{#if mode === 'image'}
				<!-- ─── Image ─────────────────────────────────────────── -->
				<div class="border-b border-white/10 pb-2 mb-2">
					<button class="mb-1 w-full text-left" onclick={() => (showImage = !showImage)}>
						<span class="text-white/40">{showImage ? '▾' : '▸'} Image</span>
					</button>
					{#if showImage}
						<div class="flex flex-col gap-2 pl-1">
						<div class="flex min-w-0 items-center gap-2">
							<span class="text-white/50">preset</span>
							<select
								class="min-w-0 flex-1 rounded bg-white/10 px-2 py-1 text-white/80"
								value={selectedImageAssetId}
								onchange={(e) => onImageAssetChange((e.target as HTMLSelectElement).value)}
							>
									<option value="">custom upload</option>
									{#each imageAssets as asset}
										<option value={asset.id}>{asset.label}</option>
									{/each}
								</select>
							</div>
							{#if selectedImageAssetId}
								<span class="break-words text-white/30">
									{imageAssets.find((asset) => asset.id === selectedImageAssetId)?.description}
								</span>
							{/if}

							<fieldset class="flex gap-2">
								<legend class="mb-1 text-white/50">Algorithm</legend>
								<label class="flex items-center gap-1">
									<input type="radio" name="algo" value="rejection" checked={algorithm === 'rejection'} onchange={() => onAlgorithmChange('rejection')} />
									rejection
								</label>
								<label class="flex items-center gap-1">
									<input type="radio" name="algo" value="importance" checked={algorithm === 'importance'} onchange={() => onAlgorithmChange('importance')} />
									importance
								</label>
								<label class="flex items-center gap-1">
									<input type="radio" name="algo" value="weighted-voronoi" checked={algorithm === 'weighted-voronoi'} onchange={() => onAlgorithmChange('weighted-voronoi')} />
									voronoi
								</label>
							</fieldset>
							{#if algorithm === 'weighted-voronoi'}
								<p class="text-white/30">
									Weighted Voronoi is an experimental CVT-style mode. It aims for more even site placement than plain importance sampling, but high counts can get slow.
								</p>
							{/if}

							<label class="min-w-0 text-white/50">
								upload image
								<input
									type="file"
									accept="image/*"
									class="mt-1 block w-full min-w-0 overflow-hidden"
									onchange={handleImageFileInput}
								/>
							</label>
						</div>
					{/if}
				</div>

				<!-- ─── ML Preprocessing ───────────────────────────────── -->
				{#if hasImage}
					<div class="border-b border-white/10 pb-2 mb-2">
						<button class="mb-1 w-full text-left" onclick={() => (showMl = !showMl)}>
							<span class="text-white/40">{showMl ? '▾' : '▸'} ML Preprocessing</span>
						</button>
						{#if showMl}
							<div class="flex flex-col gap-2 pl-1">
								<span class="text-white/40">background removal</span>
								<div class="flex min-w-0 items-center gap-2">
									<span class="text-white/50">provider</span>
									<select
										class="min-w-0 flex-1 rounded bg-white/10 px-2 py-1 text-white/80"
										value={bgProvider}
										onchange={(e) => {
											bgProvider = (e.target as HTMLSelectElement).value as BgRemovalProvider;
											onBgProviderChange(bgProvider);
										}}
										disabled={!!processingStatus}
									>
										<option value="browser">Browser</option>
										<option value="server">Server</option>
									</select>
								</div>

								{#if bgProvider === 'browser'}
									<select
										class="min-w-0 rounded bg-white/10 px-2 py-1 text-white/80"
										value={bgModelIndex}
										onchange={(e) => {
											const idx = Number((e.target as HTMLSelectElement).value);
											if (!isBgModelSupported(bgModels[idx])) return;
											bgModelIndex = idx;
											if (removeBg) onBgModelChange(idx);
										}}
										disabled={!!processingStatus}
									>
										{#each bgModels as model, i}
											{@const supported = isBgModelSupported(model)}
											<option value={i} disabled={!supported}
												title={supported ? model.description : 'Requires WebGPU'}>
												{model.label} ({model.size}){supported ? '' : ' — WebGPU only'}
											</option>
										{/each}
									</select>
									<span class="break-words text-white/30">{bgModels[bgModelIndex]?.description}</span>
								{:else}
									<select
										class="min-w-0 rounded bg-white/10 px-2 py-1 text-white/80"
										value={serverBgModelId}
										onchange={(e) => {
											serverBgModelId = (e.target as HTMLSelectElement).value;
											if (removeBg) onServerBgModelChange(serverBgModelId);
										}}
										disabled={!!processingStatus}
									>
										{#each serverBgModels as model}
											<option value={model.id}>{model.label} ({model.size})</option>
										{/each}
									</select>
									<span class="break-words text-white/30">
										{serverBgModels.find((model) => model.id === serverBgModelId)?.description}
									</span>
								{/if}

								<button
									class="rounded px-2 py-1 text-left {removeBg ? 'bg-blue-600/30' : 'bg-white/10'} hover:bg-white/20"
									onclick={() => { removeBg = !removeBg; onRemoveBg(removeBg); }}
									disabled={!!processingStatus}
								>
									{removeBg ? '✓ ' : ''}remove background
								</button>

								<span class="mt-1 text-white/40">depth estimation</span>
								<select
									class="min-w-0 rounded bg-white/10 px-2 py-1 text-white/80"
									value={depthModelIndex}
									onchange={(e) => { depthModelIndex = Number((e.target as HTMLSelectElement).value); if (useDepthMap) onDepthModelChange(depthModelIndex); }}
									disabled={!!processingStatus}
								>
									{#each depthModels as model, i}
										<option value={i}>{model.label} ({model.size})</option>
									{/each}
								</select>
								<span class="break-words text-white/30">{depthModels[depthModelIndex]?.description}</span>

								<button
									class="rounded px-2 py-1 text-left {useDepthMap ? 'bg-blue-600/30' : 'bg-white/10'} hover:bg-white/20"
									onclick={() => { useDepthMap = !useDepthMap; onEstimateDepth(useDepthMap); }}
									disabled={!!processingStatus}
								>
									{useDepthMap ? '✓ ' : ''}estimate depth (3D)
								</button>
							</div>
						{/if}
					</div>
				{/if}

				<!-- ─── Sampling ───────────────────────────────────────── -->
				<div class="border-b border-white/10 pb-2 mb-2">
					<button class="mb-1 w-full text-left" onclick={() => (showSampling = !showSampling)}>
						<span class="text-white/40">{showSampling ? '▾' : '▸'} Sampling</span>
					</button>
					{#if showSampling}
						<div class="flex flex-col gap-2 pl-1">
							<label class="flex flex-col gap-1">
								<span class="text-white/50">
									{algorithm === 'weighted-voronoi'
										? `voronoi sites: ${effectiveImageSampleCount.toLocaleString()}`
										: `samples: ${sampleCount.toLocaleString()}`}
								</span>
								<input type="range" min="1000" max="300000" step="1000" value={sampleCount}
									oninput={(e) => onSampleCountChange(Number((e.target as HTMLInputElement).value))} />
							</label>
							{#if weightedVoronoiIsCapped}
								<p class="text-amber-300/70">
									Requested {sampleCount.toLocaleString()} samples, but weighted Voronoi is currently capped at {MAX_WEIGHTED_VORONOI_SAMPLES.toLocaleString()} sites for manual testing.
								</p>
							{/if}

							<label class="flex flex-col gap-1">
								<span class="text-white/50">depth scale: {depthScale.toFixed(2)}</span>
								<input type="range" min="0" max="0.5" step="0.01" bind:value={depthScale} />
							</label>

							{#if useDepthMap}
								<label class="flex flex-col gap-1">
									<span class="text-white/50">normal displacement: {normalDisplacement.toFixed(1)}</span>
									<input type="range" min="0" max="5" step="0.1" bind:value={normalDisplacement} />
								</label>
							{/if}

							<label class="flex flex-col gap-1">
								<span class="text-white/50">density contrast: {densityGamma.toFixed(1)}</span>
								<input type="range" min="0.5" max="3.0" step="0.1" bind:value={densityGamma} />
							</label>

							<label class="flex items-center gap-2">
								<input type="checkbox" bind:checked={radiusFromLuminance} />
								<span class="text-white/50">radius from luminance</span>
							</label>

							{#if radiusFromLuminance}
								<label class="flex flex-col gap-1">
									<span class="text-white/50">size variation: {sizeVariation.toFixed(2)}</span>
									<input type="range" min="0" max="1" step="0.05" bind:value={sizeVariation} />
								</label>
							{/if}

							<label class="flex flex-col gap-1">
								<span class="text-white/50">outlier suppression: {outlierRadius}px</span>
								<input type="range" min="0" max="8" step="1" bind:value={outlierRadius} />
							</label>

							<button class="rounded bg-white/10 px-2 py-1 hover:bg-white/20" onclick={onResample}>
								resample
							</button>
						</div>
					{/if}
				</div>

				<!-- ─── Frame ──────────────────────────────────────────── -->
				{#if hasImage}
					<div class="border-b border-white/10 pb-2 mb-2">
						<button class="mb-1 w-full text-left" onclick={() => (showFrame = !showFrame)}>
							<span class="text-white/40">{showFrame ? '▾' : '▸'} Frame</span>
						</button>
						{#if showFrame}
							<div class="flex flex-col gap-2 pl-1">
								<button
									class="rounded px-2 py-1 text-left {frameParams.enabled ? 'bg-blue-600/30' : 'bg-white/10'} hover:bg-white/20"
									onclick={() => updateFrame('enabled', !frameParams.enabled)}
								>
									{frameParams.enabled ? '✓ ' : ''}enable frame
								</button>

								{#if frameParams.enabled}
									<div class="flex min-w-0 items-center gap-2">
										<span class="text-white/50">style</span>
										<select
											class="min-w-0 flex-1 rounded bg-white/10 px-2 py-1 text-white/80"
											value={frameParams.style}
											onchange={(e) => updateFrame('style', (e.target as HTMLSelectElement).value as FrameStyle)}
										>
											{#each FRAME_STYLES as s}
												<option value={s.value}>{s.label}</option>
											{/each}
										</select>
									</div>

									<div class="flex items-center gap-2">
										<span class="text-white/50">color</span>
										<input
											type="color"
											value={frameParams.color}
											oninput={(e) => updateFrame('color', (e.target as HTMLInputElement).value)}
											class="h-6 w-8 cursor-pointer rounded border border-white/20 bg-transparent"
										/>
									</div>

									<label class="flex flex-col gap-1">
										<span class="text-white/50">width: {(frameParams.width * 100).toFixed(0)}%</span>
										<input type="range" min="0.01" max="0.2" step="0.005"
											value={frameParams.width}
											oninput={(e) => updateFrame('width', Number((e.target as HTMLInputElement).value))} />
									</label>

									<label class="flex flex-col gap-1">
										<span class="text-white/50">padding: {(frameParams.padding * 100).toFixed(0)}%</span>
										<input type="range" min="0" max="0.1" step="0.005"
											value={frameParams.padding}
											oninput={(e) => updateFrame('padding', Number((e.target as HTMLInputElement).value))} />
									</label>

									<label class="flex flex-col gap-1">
										<span class="text-white/50">density: {frameParams.densityMultiplier.toFixed(1)}x</span>
										<input type="range" min="0.2" max="3.0" step="0.1"
											value={frameParams.densityMultiplier}
											oninput={(e) => updateFrame('densityMultiplier', Number((e.target as HTMLInputElement).value))} />
									</label>
								{/if}
							</div>
						{/if}
					</div>
				{/if}

			{:else if mode === 'sequence'}
				<div class="border-b border-white/10 pb-2 mb-2">
					<button class="mb-1 w-full text-left" onclick={() => (showSequence = !showSequence)}>
						<span class="text-white/40">{showSequence ? '▾' : '▸'} Sequence</span>
					</button>
					{#if showSequence}
						<div class="flex flex-col gap-2 pl-1">
							<div class="flex min-w-0 items-center gap-2">
								<span class="text-white/50">preset</span>
								<select
									class="min-w-0 flex-1 rounded bg-white/10 px-2 py-1 text-white/80"
									value={selectedSequenceAssetId}
									onchange={(e) => onSequenceAssetChange((e.target as HTMLSelectElement).value)}
								>
									{#each sequenceAssets as asset}
										<option value={asset.id}>{asset.label}</option>
									{/each}
								</select>
							</div>
							<span class="break-words text-white/30">
								{sequenceAssets.find((asset) => asset.id === selectedSequenceAssetId)?.description}
							</span>

							{#if availableSequenceClipIds.length > 0}
								<div class="flex min-w-0 items-center gap-2">
									<span class="text-white/50">clip</span>
									<select
										class="min-w-0 flex-1 rounded bg-white/10 px-2 py-1 text-white/80"
										value={selectedSequenceClipId}
										onchange={(e) => onSequenceClipChange((e.target as HTMLSelectElement).value)}
									>
										{#each availableSequenceClipIds as clipId}
											<option value={clipId}>{clipId}</option>
										{/each}
									</select>
								</div>
							{/if}

							{#if selectedSequenceAssetKind === 'point-sequence'}
								<div class="flex min-w-0 items-center gap-2">
									<span class="text-white/50">look</span>
									<select
										class="min-w-0 flex-1 rounded bg-white/10 px-2 py-1 text-white/80"
										value={selectedSequenceLookPresetId}
										onchange={(e) => onSequenceLookPresetChange((e.target as HTMLSelectElement).value)}
									>
										{#each sequenceLookPresets as preset}
											<option value={preset.id}>{preset.label}</option>
										{/each}
									</select>
								</div>
								<span class="break-words text-white/30">
									{sequenceLookPresets.find((preset) => preset.id === selectedSequenceLookPresetId)?.description}
								</span>

								<div class="flex min-w-0 items-center gap-2">
									<span class="text-white/50">density</span>
									<select
										class="min-w-0 flex-1 rounded bg-white/10 px-2 py-1 text-white/80"
										value={sequenceMaxPointsPerFrame}
										onchange={(e) => onSequenceMaxPointsPerFrameChange(Number((e.target as HTMLSelectElement).value))}
									>
										{#each sequenceDensityOptions as density}
											<option value={density}>{formatSequenceDensity(density)}</option>
										{/each}
									</select>
								</div>
							{:else}
								{#if selectedSequenceAssetSource === 'derived-image'}
									<div class="rounded border border-white/10 bg-white/[0.03] p-2 text-white/35">
										This RGBD clip is derived live from a still image. Background removal and depth estimation are optional and use the same model stack as image mode.
									</div>

									<span class="text-white/40">ML preprocessing</span>
									<div class="flex min-w-0 items-center gap-2">
										<span class="text-white/50">provider</span>
										<select
											class="min-w-0 flex-1 rounded bg-white/10 px-2 py-1 text-white/80"
											value={bgProvider}
											onchange={(e) => {
												bgProvider = (e.target as HTMLSelectElement).value as BgRemovalProvider;
												onBgProviderChange(bgProvider);
											}}
											disabled={!!processingStatus}
										>
											<option value="browser">Browser</option>
											<option value="server">Server</option>
										</select>
									</div>

									{#if bgProvider === 'browser'}
										<select
											class="min-w-0 rounded bg-white/10 px-2 py-1 text-white/80"
											value={bgModelIndex}
											onchange={(e) => {
												const idx = Number((e.target as HTMLSelectElement).value);
												if (!isBgModelSupported(bgModels[idx])) return;
												bgModelIndex = idx;
												onBgModelChange(idx);
											}}
											disabled={!!processingStatus}
										>
											{#each bgModels as model, i}
												{@const supported = isBgModelSupported(model)}
												<option value={i} disabled={!supported}
													title={supported ? model.description : 'Requires WebGPU'}>
													{model.label} ({model.size}){supported ? '' : ' — WebGPU only'}
												</option>
											{/each}
										</select>
										<span class="break-words text-white/30">{bgModels[bgModelIndex]?.description}</span>
									{:else}
										<select
											class="min-w-0 rounded bg-white/10 px-2 py-1 text-white/80"
											value={serverBgModelId}
											onchange={(e) => {
												serverBgModelId = (e.target as HTMLSelectElement).value;
												onServerBgModelChange(serverBgModelId);
											}}
											disabled={!!processingStatus}
										>
											{#each serverBgModels as model}
												<option value={model.id}>{model.label} ({model.size})</option>
											{/each}
										</select>
										<span class="break-words text-white/30">
											{serverBgModels.find((model) => model.id === serverBgModelId)?.description}
										</span>
									{/if}

									<button
										class="rounded px-2 py-1 text-left {removeBg ? 'bg-blue-600/30' : 'bg-white/10'} hover:bg-white/20"
										onclick={() => { removeBg = !removeBg; onRemoveBg(removeBg); }}
										disabled={!!processingStatus}
									>
										{removeBg ? '✓ ' : ''}remove background
									</button>

									<select
										class="min-w-0 rounded bg-white/10 px-2 py-1 text-white/80"
										value={depthModelIndex}
										onchange={(e) => {
											depthModelIndex = Number((e.target as HTMLSelectElement).value);
											onDepthModelChange(depthModelIndex);
										}}
										disabled={!!processingStatus}
									>
										{#each depthModels as model, i}
											<option value={i}>{model.label} ({model.size})</option>
										{/each}
									</select>
									<span class="break-words text-white/30">{depthModels[depthModelIndex]?.description}</span>

									<button
										class="rounded px-2 py-1 text-left {useDepthMap ? 'bg-blue-600/30' : 'bg-white/10'} hover:bg-white/20"
										onclick={() => { useDepthMap = !useDepthMap; onEstimateDepth(useDepthMap); }}
										disabled={!!processingStatus}
									>
										{useDepthMap ? '✓ ' : ''}estimate depth (3D)
									</button>
								{:else if selectedSequenceAssetSource === 'uploaded-video'}
									<div class="rounded border border-white/10 bg-white/[0.03] p-2 text-white/35">
										This RGBD clip is built from a recorded video upload. Frames are sampled offline in the browser, depth is estimated per frame, and the result is routed through the same RGBD prep/playback path as manifest-backed clips.
									</div>

									<label class="min-w-0 text-white/50">
										upload video
										<input
											type="file"
											accept="video/*"
											class="mt-1 block w-full min-w-0 overflow-hidden"
											onchange={handleVideoFileInput}
										/>
									</label>
									<span class="break-words text-white/30">
										{uploadedSequenceVideoName ? `selected: ${uploadedSequenceVideoName}` : 'No video uploaded yet.'}
									</span>

									<div class="flex min-w-0 items-center gap-2">
										<span class="text-white/50">fps</span>
										<select
											class="min-w-0 flex-1 rounded bg-white/10 px-2 py-1 text-white/80"
											value={uploadedVideoTargetFps}
											onchange={(e) => onUploadedVideoTargetFpsChange(Number((e.target as HTMLSelectElement).value))}
											disabled={!!processingStatus}
										>
											{#each uploadedVideoFpsOptions as fps}
												<option value={fps}>{fps} fps</option>
											{/each}
										</select>
									</div>

									<div class="flex min-w-0 items-center gap-2">
										<span class="text-white/50">cap</span>
										<select
											class="min-w-0 flex-1 rounded bg-white/10 px-2 py-1 text-white/80"
											value={uploadedVideoMaxFrameCount}
											onchange={(e) => onUploadedVideoMaxFrameCountChange(Number((e.target as HTMLSelectElement).value))}
											disabled={!!processingStatus}
										>
											{#each uploadedVideoFrameCapOptions as frameCap}
												<option value={frameCap}>{frameCap} frames</option>
											{/each}
										</select>
									</div>
									<span class="break-words text-white/30">
										Current clip budget: up to {(uploadedVideoMaxFrameCount / uploadedVideoTargetFps).toFixed(1)} seconds before truncation.
									</span>

									<div class="rounded border border-white/10 bg-white/[0.03] p-2 text-white/35">
										First pass constraint: uploaded-video rehearsal currently uses per-frame depth estimation only. Background removal is still limited to still-image derived clips.
									</div>

									<select
										class="min-w-0 rounded bg-white/10 px-2 py-1 text-white/80"
										value={depthModelIndex}
										onchange={(e) => {
											depthModelIndex = Number((e.target as HTMLSelectElement).value);
											onDepthModelChange(depthModelIndex);
										}}
										disabled={!!processingStatus}
									>
										{#each depthModels as model, i}
											<option value={i}>{model.label} ({model.size})</option>
										{/each}
									</select>
									<span class="break-words text-white/30">{depthModels[depthModelIndex]?.description}</span>

									<button
										class="rounded px-2 py-1 text-left {useDepthMap ? 'bg-blue-600/30' : 'bg-white/10'} hover:bg-white/20"
										onclick={() => { useDepthMap = !useDepthMap; onEstimateDepth(useDepthMap); }}
										disabled={!!processingStatus}
									>
										{useDepthMap ? '✓ ' : ''}estimate depth (3D)
									</button>
								{:else if selectedSequenceAssetSource === 'manifest'}
									<div class="rounded border border-white/10 bg-white/[0.03] p-2 text-white/35">
										This RGBD clip is precomputed. Background removal and depth estimation are already baked into the source data.
									</div>
								{/if}

								<fieldset class="flex gap-2">
									<legend class="mb-1 text-white/50">Algorithm</legend>
									<label class="flex items-center gap-1">
										<input type="radio" name="sequence-algo" value="rejection" checked={algorithm === 'rejection'} onchange={() => onAlgorithmChange('rejection')} />
										rejection
									</label>
									<label class="flex items-center gap-1">
										<input type="radio" name="sequence-algo" value="importance" checked={algorithm === 'importance'} onchange={() => onAlgorithmChange('importance')} />
										importance
									</label>
									<label class="flex items-center gap-1">
										<input type="radio" name="sequence-algo" value="weighted-voronoi" checked={algorithm === 'weighted-voronoi'} onchange={() => onAlgorithmChange('weighted-voronoi')} />
										voronoi
									</label>
								</fieldset>

								<label class="flex flex-col gap-1">
									<span class="text-white/50">
										{algorithm === 'weighted-voronoi'
											? `voronoi sites/frame: ${effectiveImageSampleCount.toLocaleString()}`
											: `samples/frame: ${sampleCount.toLocaleString()}`}
									</span>
									<input type="range" min="1000" max="300000" step="1000" value={sampleCount}
										oninput={(e) => onSampleCountChange(Number((e.target as HTMLInputElement).value))} />
								</label>

								<label class="flex flex-col gap-1">
									<span class="text-white/50">depth scale: {depthScale.toFixed(2)}</span>
									<input type="range" min="0" max="0.5" step="0.01" bind:value={depthScale} />
								</label>

								<label class="flex flex-col gap-1">
									<span class="text-white/50">normal displacement: {normalDisplacement.toFixed(1)}</span>
									<input type="range" min="0" max="5" step="0.1" bind:value={normalDisplacement} />
								</label>

								<label class="flex flex-col gap-1">
									<span class="text-white/50">density contrast: {densityGamma.toFixed(1)}</span>
									<input type="range" min="0.5" max="3.0" step="0.1" bind:value={densityGamma} />
								</label>

								<label class="flex items-center gap-2">
									<input type="checkbox" bind:checked={radiusFromLuminance} />
									<span class="text-white/50">radius from luminance</span>
								</label>

								{#if radiusFromLuminance}
									<label class="flex flex-col gap-1">
										<span class="text-white/50">size variation: {sizeVariation.toFixed(2)}</span>
										<input type="range" min="0" max="1" step="0.05" bind:value={sizeVariation} />
									</label>
								{/if}

								<label class="flex flex-col gap-1">
									<span class="text-white/50">outlier suppression: {outlierRadius}px</span>
									<input type="range" min="0" max="8" step="1" bind:value={outlierRadius} />
								</label>

								<div class="rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-white/35">
									RGBD sequences reuse the image sampling path with real per-frame depth. Change controls, then reload.
								</div>
							{/if}

							<label class="flex items-center gap-2">
								<input
									type="checkbox"
									checked={sequenceAutoCenter}
									onchange={(e) => onSequenceAutoCenterChange((e.target as HTMLInputElement).checked)}
								/>
								<span class="text-white/50">auto-center sequence bounds</span>
							</label>

							<label class="flex items-center gap-2">
								<input
									type="checkbox"
									checked={sequenceFitHeightEnabled}
									onchange={(e) => onSequenceFitHeightEnabledChange((e.target as HTMLInputElement).checked)}
								/>
								<span class="text-white/50">fit clip height</span>
							</label>

							<label class="flex flex-col gap-1">
								<span class="text-white/50">fit height: {sequenceFitHeight.toFixed(1)}m</span>
								<input
									type="range"
									min="0.5"
									max="4"
									step="0.1"
									value={sequenceFitHeight}
									disabled={!sequenceFitHeightEnabled}
									oninput={(e) => onSequenceFitHeightChange(Number((e.target as HTMLInputElement).value))}
								/>
							</label>

							<label class="flex flex-col gap-1">
								<span class="text-white/50">manual scale: {sequenceScaleMultiplier.toFixed(2)}x</span>
								<input
									type="range"
									min="0.25"
									max="4"
									step="0.05"
									value={sequenceScaleMultiplier}
									oninput={(e) => onSequenceScaleMultiplierChange(Number((e.target as HTMLInputElement).value))}
								/>
							</label>

							<div class="flex gap-2">
								<button
									class="flex-1 rounded bg-white/10 px-2 py-1 hover:bg-white/20"
									onclick={onSequencePlaybackToggle}
								>
									{sequenceIsPlaying ? 'pause' : 'play'}
								</button>
								<button
									class="flex-1 rounded bg-white/10 px-2 py-1 hover:bg-white/20"
									onclick={onSequenceRestart}
								>
									restart
								</button>
								<button
									class="flex-1 rounded bg-white/10 px-2 py-1 hover:bg-white/20"
									onclick={onResample}
								>
									reload
								</button>
							</div>

							{#if sequenceStatus}
								<span class="break-words text-white/40">{sequenceStatus}</span>
							{/if}

							{#if sequenceReport}
								<div class="rounded border border-white/10 bg-white/[0.03] p-2 text-white/40">
									<div>startup: {sequenceReport.totalLoadMs.toFixed(0)} ms total</div>
									{#if sequenceReport.kind === 'rgbd'}
										<div>fetch / prep / build: {sequenceReport.fetchMs.toFixed(0)} / {sequenceReport.prepareMs.toFixed(0)} / {sequenceReport.buildMs.toFixed(0)} ms</div>
										<div>color payload / depth payload: {formatBytes(sequenceReport.totalColorBytes)} / {formatBytes(sequenceReport.totalDepthBytes)}</div>
										<div>prepared cpu / playback buffer: {formatBytes(sequenceReport.totalPreparedBytes)} / {formatBytes(sequenceReport.estimatedPlaybackBytes)}</div>
										<div>raster/frame: {sequenceReport.rasterSize[0]} x {sequenceReport.rasterSize[1]}, {sequenceReport.sampleCountPerFrame.toLocaleString()} samples/frame via {sequenceReport.algorithm}</div>
										<div>points/frame: {sequenceReport.preparedPointCountRange[0].toLocaleString()}-{sequenceReport.preparedPointCountRange[1].toLocaleString()} prepared</div>
									{:else}
										<div>fetch / parse / prep / build: {sequenceReport.fetchMs.toFixed(0)} / {sequenceReport.parseMs.toFixed(0)} / {sequenceReport.prepareMs.toFixed(0)} / {sequenceReport.buildMs.toFixed(0)} ms</div>
										<div>frame payload / prepared cpu / playback buffer: {formatBytes(sequenceReport.totalFrameBytes)} / {formatBytes(sequenceReport.totalPreparedBytes)} / {formatBytes(sequenceReport.estimatedPlaybackBytes)}</div>
										<div>points/frame: {sequenceReport.originalPointCountRange[0].toLocaleString()}-{sequenceReport.originalPointCountRange[1].toLocaleString()} original, {sequenceReport.preparedPointCountRange[0].toLocaleString()}-{sequenceReport.preparedPointCountRange[1].toLocaleString()} prepared</div>
									{/if}
									<div>total points: {sequenceReport.totalPreparedPoints.toLocaleString()} prepared across {sequenceReport.frameCount.toLocaleString()} frames</div>
									{#if sequenceBounds}
										<div>bounds: {sequenceBounds.size[0].toFixed(2)} x {sequenceBounds.size[1].toFixed(2)} x {sequenceBounds.size[2].toFixed(2)} m</div>
									{/if}
								</div>
							{/if}
						</div>
					{/if}
				</div>

			{:else}
				<!-- Mesh mode: just sample count + resample -->
				<div class="border-b border-white/10 pb-2 mb-2">
					<div class="flex flex-col gap-2">
						<div class="flex min-w-0 items-center gap-2">
							<span class="text-white/50">preset</span>
							<select
								class="min-w-0 flex-1 rounded bg-white/10 px-2 py-1 text-white/80"
								value={selectedMeshAssetId}
								onchange={(e) => onMeshAssetChange((e.target as HTMLSelectElement).value)}
							>
								<option value="procedural">Procedural Torus Knot</option>
								{#each meshAssets as asset}
									<option value={asset.id}>{asset.label}</option>
								{/each}
							</select>
						</div>
						{#if selectedMeshAssetId !== 'procedural'}
							<span class="break-words text-white/30">
								{meshAssets.find((asset) => asset.id === selectedMeshAssetId)?.description}
							</span>
						{/if}

						<label class="flex flex-col gap-1">
							<span class="text-white/50">samples: {sampleCount.toLocaleString()}</span>
							<input type="range" min="1000" max="300000" step="1000" value={sampleCount}
								oninput={(e) => onSampleCountChange(Number((e.target as HTMLInputElement).value))} />
						</label>
						<button class="rounded bg-white/10 px-2 py-1 hover:bg-white/20" onclick={onResample}>
							resample
						</button>
					</div>
				</div>
			{/if}

			<!-- ─── Rendering ─────────────────────────────────────── -->
			<div class="border-b border-white/10 pb-2 mb-2">
				<button class="mb-1 w-full text-left" onclick={() => (showRender = !showRender)}>
					<span class="text-white/40">{showRender ? '▾' : '▸'} Rendering</span>
				</button>
				{#if showRender}
					<div class="flex flex-col gap-2 pl-1">
						<label class="flex flex-col gap-1">
							<span class="text-white/50">point size: {renderParams.pointSize.toFixed(1)}px</span>
							<input type="range" min="0.3" max="6" step="0.1" value={renderParams.pointSize}
								oninput={(e) => updateRender('pointSize', Number((e.target as HTMLInputElement).value))} />
						</label>

						<label class="flex items-center gap-2">
							<input type="checkbox" checked={renderParams.sizeAttenuation}
								onchange={(e) => updateRender('sizeAttenuation', (e.target as HTMLInputElement).checked)} />
							<span class="text-white/50">perspective scaling</span>
						</label>

						<label class="flex flex-col gap-1">
							<span class="text-white/50">brightness: {renderParams.brightness.toFixed(2)}</span>
							<input type="range" min="0" max="3" step="0.05" value={renderParams.brightness}
								oninput={(e) => updateRender('brightness', Number((e.target as HTMLInputElement).value))} />
						</label>

						<label class="flex flex-col gap-1">
							<span class="text-white/50">saturation: {renderParams.saturation.toFixed(2)}</span>
							<input type="range" min="0" max="5" step="0.05" value={renderParams.saturation}
								oninput={(e) => updateRender('saturation', Number((e.target as HTMLInputElement).value))} />
						</label>

						<label class="flex flex-col gap-1">
							<span class="text-white/50">opacity: {renderParams.opacity.toFixed(2)}</span>
							<input type="range" min="0" max="1" step="0.05" value={renderParams.opacity}
								oninput={(e) => updateRender('opacity', Number((e.target as HTMLInputElement).value))} />
						</label>

						<label class="flex flex-col gap-1">
							<span class="text-white/50">depth fade: {renderParams.depthFade.toFixed(2)}</span>
							<input type="range" min="0" max="5" step="0.1" value={renderParams.depthFade}
								oninput={(e) => updateRender('depthFade', Number((e.target as HTMLInputElement).value))} />
						</label>

						<label class="flex flex-col gap-1">
							<span class="text-white/50">edge sharpness: {renderParams.edgeSharpness.toFixed(2)}</span>
							<input type="range" min="0" max="1" step="0.01" value={renderParams.edgeSharpness}
								oninput={(e) => updateRender('edgeSharpness', Number((e.target as HTMLInputElement).value))} />
						</label>

						<label class="flex flex-col gap-1">
							<span class="text-white/50">dark cutoff: {renderParams.darkCutoff.toFixed(2)}</span>
							<input type="range" min="0" max="1" step="0.01" value={renderParams.darkCutoff}
								oninput={(e) => updateRender('darkCutoff', Number((e.target as HTMLInputElement).value))} />
						</label>

						<label class="flex flex-col gap-1">
							<span class="text-white/50">color noise: {renderParams.colorNoise.toFixed(2)}</span>
							<input type="range" min="0" max="0.3" step="0.01" value={renderParams.colorNoise}
								oninput={(e) => updateRender('colorNoise', Number((e.target as HTMLInputElement).value))} />
						</label>

						<label class="flex flex-col gap-1">
							<span class="text-white/50">hue shift: {(renderParams.hueShift * 360).toFixed(0)}°</span>
							<input type="range" min="0" max="1" step="0.01" value={renderParams.hueShift}
								oninput={(e) => updateRender('hueShift', Number((e.target as HTMLInputElement).value))} />
						</label>

						<label class="flex flex-col gap-1">
							<span class="text-white/50">warmth: {renderParams.warmth.toFixed(2)}</span>
							<input type="range" min="-1" max="1" step="0.05" value={renderParams.warmth}
								oninput={(e) => updateRender('warmth', Number((e.target as HTMLInputElement).value))} />
						</label>

						<label class="flex items-center gap-2">
							<input type="checkbox" checked={renderParams.additiveBlending}
								onchange={(e) => updateRender('additiveBlending', (e.target as HTMLInputElement).checked)} />
							<span class="text-white/50">additive blending</span>
						</label>
					</div>
				{/if}
			</div>

			<!-- ─── Bloom ──────────────────────────────────────────── -->
			<div class="border-b border-white/10 pb-2 mb-2">
				<button class="mb-1 w-full text-left" onclick={() => (showBloom = !showBloom)}>
					<span class="text-white/40">{showBloom ? '▾' : '▸'} Bloom</span>
				</button>
				{#if showBloom}
					<div class="flex flex-col gap-2 pl-1">
						<label class="flex flex-col gap-1">
							<span class="text-white/50">strength: {bloomParams.strength.toFixed(2)}</span>
							<input type="range" min="0" max="3" step="0.05" value={bloomParams.strength}
								oninput={(e) => updateBloom('strength', Number((e.target as HTMLInputElement).value))} />
						</label>

						<label class="flex flex-col gap-1">
							<span class="text-white/50">radius: {bloomParams.radius.toFixed(2)}</span>
							<input type="range" min="0" max="1" step="0.01" value={bloomParams.radius}
								oninput={(e) => updateBloom('radius', Number((e.target as HTMLInputElement).value))} />
						</label>

						<label class="flex flex-col gap-1">
							<span class="text-white/50">threshold: {bloomParams.threshold.toFixed(2)}</span>
							<input type="range" min="0" max="1" step="0.01" value={bloomParams.threshold}
								oninput={(e) => updateBloom('threshold', Number((e.target as HTMLInputElement).value))} />
						</label>
					</div>
				{/if}
			</div>

			<!-- ─── Settings ──────────────────────────────────────── -->
			<div class="flex gap-2">
				<button
					class="flex-1 rounded bg-blue-600/30 px-2 py-1 hover:bg-blue-600/50"
					onclick={onSaveSettings}
				>
					save
				</button>
				<button
					class="flex-1 rounded bg-white/10 px-2 py-1 hover:bg-white/20"
					onclick={onResetSettings}
				>
					reset
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	:global(.controls-panel select) {
		color-scheme: dark;
	}

	:global(.controls-panel option) {
		background: rgb(10 10 10);
		color: rgb(229 231 235);
	}
	
	:global(.controls-panel optgroup) {
		background: rgb(10 10 10);
		color: rgb(229 231 235);
	}
</style>
