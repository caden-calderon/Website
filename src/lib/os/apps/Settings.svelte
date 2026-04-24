<script lang="ts">
	import {
		desktopSettings,
		wallpaperPresets,
		type WallpaperMode,
		type WallpaperPresetId,
	} from '../desktopSettings.svelte.js';
	import { wallpaperStyle } from '../wallpaperStyle.js';

	const wallpaperModes: { value: WallpaperMode; label: string }[] = [
		{ value: 'fill', label: 'Fill' },
		{ value: 'fit', label: 'Fit' },
		{ value: 'centered', label: 'Center' },
		{ value: 'tiled', label: 'Tile' },
		{ value: 'stretched', label: 'Stretch' },
	];

	let customUrl = $state(desktopSettings.customUrl);
	let customColor = $state(desktopSettings.wallpaper.color ?? '#008080');
	const previewStyle = $derived(wallpaperStyle(desktopSettings.wallpaper));

	function choosePreset(id: WallpaperPresetId) {
		desktopSettings.setPreset(id);
		customUrl = desktopSettings.customUrl;
		customColor = desktopSettings.wallpaper.color ?? customColor;
	}

	function applyCustomImage() {
		desktopSettings.setCustomUrl(customUrl);
	}

	function applyColor() {
		desktopSettings.setColor(customColor);
	}
</script>

<div class="settings-app">
	<div class="tabs" role="tablist" aria-label="Control Panel sections">
		<button type="button" class="active">Background</button>
		<button type="button" disabled>Appearance</button>
		<button type="button" disabled>Screen Saver</button>
	</div>

	<div class="panel">
		<section class="preview-section">
			<div class="monitor">
				<div class="screen" style={previewStyle}>
					<div class="sample-window"></div>
					<div class="sample-icon"></div>
				</div>
			</div>
			<p>
				Use <b>Fill</b> for wide displays, <b>Fit</b> when the full image matters, or <b>Tile</b>
				for classic Win98 patterns.
			</p>
		</section>

		<section class="controls">
			<fieldset>
				<legend>Wallpaper</legend>
				<div class="preset-list">
					{#each wallpaperPresets as preset}
						<label>
							<input
								type="radio"
								name="wallpaper"
								checked={desktopSettings.presetId === preset.id}
								onchange={() => choosePreset(preset.id)}
							/>
							<span>{preset.name}</span>
						</label>
					{/each}
					<label>
						<input
							type="radio"
							name="wallpaper"
							checked={desktopSettings.presetId === 'custom'}
							onchange={() => desktopSettings.setCustomUrl(customUrl)}
						/>
						<span>Custom</span>
					</label>
				</div>
			</fieldset>

			<fieldset>
				<legend>Custom Image URL</legend>
				<div class="input-row">
					<input type="text" bind:value={customUrl} placeholder="/wallpapers/my-wallpaper.jpg" />
					<button type="button" onclick={applyCustomImage}>Apply</button>
				</div>
			</fieldset>

			<fieldset>
				<legend>Solid Color</legend>
				<div class="input-row color-row">
					<input type="color" bind:value={customColor} aria-label="Desktop color" />
					<input type="text" bind:value={customColor} aria-label="Desktop color hex" />
					<button type="button" onclick={applyColor}>Apply</button>
				</div>
			</fieldset>

			<fieldset>
				<legend>Image Display</legend>
				<div class="mode-grid">
					{#each wallpaperModes as mode}
						<label>
							<input
								type="radio"
								name="mode"
								checked={desktopSettings.wallpaper.type === mode.value}
								disabled={desktopSettings.wallpaper.type === 'solid'}
								onchange={() => desktopSettings.setMode(mode.value)}
							/>
							<span>{mode.label}</span>
						</label>
					{/each}
				</div>
			</fieldset>
		</section>
	</div>
</div>

<style>
	.settings-app {
		height: 100%;
		display: flex;
		flex-direction: column;
		padding: 8px;
		background: #c0c0c0;
		color: #000;
		font-family: 'Pixelated MS Sans Serif', 'MS Sans Serif', sans-serif;
		font-size: 11px;
	}

	.tabs {
		display: flex;
		align-items: flex-end;
		gap: 2px;
		padding-left: 6px;
	}

	.tabs button {
		min-width: 92px;
		border-bottom: 0;
		border-radius: 0;
	}

	.tabs .active {
		position: relative;
		top: 1px;
		padding-bottom: 4px;
		background: #c0c0c0;
	}

	.panel {
		min-height: 0;
		flex: 1;
		display: grid;
		grid-template-columns: 165px 1fr;
		gap: 12px;
		padding: 14px;
		border: 2px groove #fff;
		background: #c0c0c0;
	}

	.preview-section p {
		margin: 12px 0 0;
		line-height: 1.35;
	}

	.monitor {
		width: 146px;
		padding: 10px 10px 18px;
		border: 2px inset #fff;
		background: #808080;
	}

	.screen {
		position: relative;
		height: 92px;
		border: 2px inset #fff;
		overflow: hidden;
	}

	.sample-window {
		position: absolute;
		left: 30px;
		top: 26px;
		width: 72px;
		height: 42px;
		border: 2px outset #fff;
		background: #c0c0c0;
	}

	.sample-window::before {
		content: '';
		display: block;
		height: 10px;
		background: #000080;
	}

	.sample-icon {
		position: absolute;
		left: 9px;
		top: 10px;
		width: 12px;
		height: 14px;
		background: #f0f0f0;
		border: 1px solid #000;
	}

	.controls {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	fieldset {
		border: 2px groove #fff;
		padding: 8px;
	}

	legend {
		padding: 0 4px;
	}

	.preset-list,
	.mode-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 6px 12px;
	}

	label {
		display: flex;
		align-items: center;
		gap: 5px;
		min-width: 0;
	}

	.input-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 6px;
	}

	.color-row {
		grid-template-columns: 34px minmax(0, 1fr) auto;
	}

	input[type='text'] {
		min-width: 0;
	}

	input[type='color'] {
		width: 34px;
		height: 22px;
		padding: 0;
	}
</style>
