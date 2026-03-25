<script lang="ts">
	import type { RenderParams, BloomParams } from '$lib/engine/render/types.js';
	import type { DepthModelInfo } from '$lib/engine/preprocessing/DepthEstimation.js';
	import type { BgRemovalModelInfo } from '$lib/engine/preprocessing/BackgroundRemoval.js';

	interface Props {
		renderParams: RenderParams;
		bloomParams: BloomParams;
		mode: 'mesh' | 'image';
		algorithm: 'rejection' | 'importance';
		sampleCount: number;
		depthScale: number;
		densityGamma: number;
		radiusFromLuminance: boolean;
		outlierRadius: number;
		normalDisplacement: number;
		removeBg: boolean;
		bgModelIndex: number;
		useDepthMap: boolean;
		depthModelIndex: number;
		bgModels: BgRemovalModelInfo[];
		depthModels: DepthModelInfo[];
		processingStatus: string;
		hasImage: boolean;
		onRenderParamsChange: (params: RenderParams) => void;
		onModeChange: (mode: 'mesh' | 'image') => void;
		onAlgorithmChange: (algorithm: 'rejection' | 'importance') => void;
		onSampleCountChange: (count: number) => void;
		onImageUpload: (file: File) => void;
		onResample: () => void;
		onRemoveBg: (enabled: boolean) => void;
		onBgModelChange: (index: number) => void;
		onEstimateDepth: (enabled: boolean) => void;
		onDepthModelChange: (index: number) => void;
	}

	let {
		renderParams = $bindable(),
		bloomParams = $bindable(),
		mode = $bindable(),
		algorithm = $bindable(),
		sampleCount = $bindable(),
		depthScale = $bindable(),
		densityGamma = $bindable(),
		radiusFromLuminance = $bindable(),
		outlierRadius = $bindable(),
		normalDisplacement = $bindable(),
		removeBg = $bindable(),
		bgModelIndex = $bindable(),
		useDepthMap = $bindable(),
		depthModelIndex = $bindable(),
		bgModels,
		depthModels,
		processingStatus,
		hasImage,
		onRenderParamsChange,
		onModeChange,
		onAlgorithmChange,
		onSampleCountChange,
		onImageUpload,
		onResample,
		onRemoveBg,
		onBgModelChange,
		onEstimateDepth,
		onDepthModelChange,
	}: Props = $props();

	let collapsed = $state(false);

	const isChromium =
		typeof navigator !== 'undefined' &&
		/chrome|chromium|edg|brave|opr|opera/i.test(navigator.userAgent) &&
		!/firefox/i.test(navigator.userAgent);

	function handleFileInput(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) onImageUpload(file);
	}

	function updateRender<K extends keyof RenderParams>(key: K, value: RenderParams[K]) {
		renderParams = { ...renderParams, [key]: value };
		onRenderParamsChange(renderParams);
	}

	function updateBloom<K extends keyof BloomParams>(key: K, value: BloomParams[K]) {
		bloomParams = { ...bloomParams, [key]: value };
	}

	function isBgModelSupported(model: BgRemovalModelInfo): boolean {
		if (model.backend === 'imgly') return true;
		return isChromium;
	}
</script>

<div
	class="fixed top-4 right-4 z-50 max-h-[95vh] overflow-y-auto font-mono text-xs select-none"
	class:w-64={!collapsed}
	class:w-auto={collapsed}
>
	<button
		class="mb-2 rounded bg-white/10 px-3 py-1 text-white/60 backdrop-blur hover:bg-white/20"
		onclick={() => (collapsed = !collapsed)}
	>
		{collapsed ? '◀ controls' : '▶ hide'}
	</button>

	{#if !collapsed}
		<div class="flex flex-col gap-3 rounded-lg bg-black/80 p-4 text-white/80 backdrop-blur">

			{#if !isChromium}
				<div class="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-amber-300/80">
					For best ML model compatibility, use a Chromium-based browser (Chrome, Edge, Brave, Opera).
				</div>
			{/if}

			<!-- Source mode -->
			<fieldset class="flex gap-2 border-b border-white/10 pb-3">
				<legend class="mb-1 text-white/50">Source</legend>
				<label class="flex items-center gap-1">
					<input type="radio" name="mode" value="mesh" checked={mode === 'mesh'} onchange={() => onModeChange('mesh')} />
					mesh
				</label>
				<label class="flex items-center gap-1">
					<input type="radio" name="mode" value="image" checked={mode === 'image'} onchange={() => onModeChange('image')} />
					image
				</label>
			</fieldset>

			{#if mode === 'image'}
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
				</fieldset>

				<label class="text-white/50">
					upload image
					<input type="file" accept="image/*" class="mt-1 block w-full" onchange={handleFileInput} />
				</label>

				<!-- ML Preprocessing -->
				{#if hasImage}
					<div class="flex flex-col gap-2 border-b border-white/10 pb-3">
						<span class="text-white/40">ML preprocessing</span>
						<button
							class="rounded px-2 py-1 text-left {removeBg ? 'bg-blue-600/30' : 'bg-white/10'} hover:bg-white/20"
							onclick={() => {
								const next = !removeBg;
								removeBg = next;
								onRemoveBg(next);
							}}
							disabled={!!processingStatus}
						>
							{removeBg ? '✓ ' : ''}remove background
						</button>

						{#if removeBg}
							<select
								class="rounded bg-white/10 px-2 py-1 text-white/80"
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
									<option
										value={i}
										disabled={!supported}
										title={supported ? model.description : 'Requires a Chromium-based browser (Chrome, Edge, Brave, Opera)'}
									>
										{model.label} ({model.size}){supported ? '' : ' — Chromium only'}
									</option>
								{/each}
							</select>
							<span class="text-white/30">{bgModels[bgModelIndex]?.description}</span>
						{/if}

						<button
							class="rounded px-2 py-1 text-left {useDepthMap ? 'bg-blue-600/30' : 'bg-white/10'} hover:bg-white/20"
							onclick={() => {
								const next = !useDepthMap;
								useDepthMap = next;
								onEstimateDepth(next);
							}}
							disabled={!!processingStatus}
						>
							{useDepthMap ? '✓ ' : ''}estimate depth (3D)
						</button>

						{#if useDepthMap}
							<select
								class="rounded bg-white/10 px-2 py-1 text-white/80"
								value={depthModelIndex}
								onchange={(e) => {
									const idx = Number((e.target as HTMLSelectElement).value);
									depthModelIndex = idx;
									onDepthModelChange(idx);
								}}
								disabled={!!processingStatus}
							>
								{#each depthModels as model, i}
									<option value={i}>{model.label} ({model.size})</option>
								{/each}
							</select>
							<span class="text-white/30">{depthModels[depthModelIndex]?.description}</span>
						{/if}
					</div>
				{/if}

				<!-- Image controls -->
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

				<label class="flex flex-col gap-1">
					<span class="text-white/50">outlier suppression: {outlierRadius}px</span>
					<input type="range" min="0" max="8" step="1" bind:value={outlierRadius} />
				</label>
			{/if}

			<!-- Sample count -->
			<label class="flex flex-col gap-1">
				<span class="text-white/50">samples: {sampleCount.toLocaleString()}</span>
				<input type="range" min="1000" max="300000" step="1000" value={sampleCount}
					oninput={(e) => onSampleCountChange(Number((e.target as HTMLInputElement).value))} />
			</label>

			<button class="rounded bg-white/10 px-2 py-1 hover:bg-white/20" onclick={onResample}>
				resample
			</button>

			<hr class="border-white/10" />

			<!-- Render params -->
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

			<hr class="border-white/10" />

			<!-- Bloom -->
			<label class="flex flex-col gap-1">
				<span class="text-white/50">bloom strength: {bloomParams.strength.toFixed(2)}</span>
				<input type="range" min="0" max="3" step="0.05" value={bloomParams.strength}
					oninput={(e) => updateBloom('strength', Number((e.target as HTMLInputElement).value))} />
			</label>

			<label class="flex flex-col gap-1">
				<span class="text-white/50">bloom radius: {bloomParams.radius.toFixed(2)}</span>
				<input type="range" min="0" max="1" step="0.01" value={bloomParams.radius}
					oninput={(e) => updateBloom('radius', Number((e.target as HTMLInputElement).value))} />
			</label>

			<label class="flex flex-col gap-1">
				<span class="text-white/50">bloom threshold: {bloomParams.threshold.toFixed(2)}</span>
				<input type="range" min="0" max="1" step="0.01" value={bloomParams.threshold}
					oninput={(e) => updateBloom('threshold', Number((e.target as HTMLInputElement).value))} />
			</label>
		</div>
	{/if}
</div>
