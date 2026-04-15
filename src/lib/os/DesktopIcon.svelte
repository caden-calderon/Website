<script lang="ts">
	import type { AppId } from './types.js';

	let {
		label,
		icon,
		appId,
		selected = false,
		onopen,
		onselect,
	}: {
		label: string;
		icon: string;
		appId: AppId;
		selected?: boolean;
		onopen: (appId: AppId) => void;
		onselect: (label: string) => void;
	} = $props();

	let lastClickTime = 0;
	const DOUBLE_CLICK_MS = 500;

	function handleClick() {
		const now = Date.now();
		if (now - lastClickTime < DOUBLE_CLICK_MS) {
			onopen(appId);
			lastClickTime = 0;
		} else {
			onselect(label);
			lastClickTime = now;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') onopen(appId);
	}
</script>

<button
	class="desktop-icon"
	class:selected
	onclick={handleClick}
	onkeydown={handleKeydown}
	type="button"
>
	<div class="icon-img-wrap" class:selected>
		<img
			src={icon}
			alt=""
			width="32"
			height="32"
			draggable="false"
			onerror={(e) => {
				const target = e.currentTarget as HTMLImageElement;
				target.style.display = 'none';
			}}
		/>
	</div>
	<span class="icon-label" class:selected>{label}</span>
</button>

<style>
	.desktop-icon {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		width: 75px;
		padding: 4px 2px;
		background: none;
		border: none;
		cursor: default;
		outline: none;
		/* Remove all button styling from 98.css */
		box-shadow: none;
		min-height: 0;
		min-width: 0;
	}

	.desktop-icon:active {
		box-shadow: none;
	}

	.icon-img-wrap {
		padding: 2px;
	}

	.icon-img-wrap.selected {
		/* Win98 icon selection: blue tint overlay */
		filter: brightness(0.7) sepia(1) saturate(5) hue-rotate(200deg);
	}

	.icon-label {
		color: white;
		font-size: 11px;
		font-family: 'Pixelated MS Sans Serif', 'MS Sans Serif', 'Microsoft Sans Serif', Tahoma, Arial, sans-serif;
		text-align: center;
		line-height: 1.2;
		word-break: break-word;
		max-width: 70px;
		padding: 1px 2px;
		text-shadow:
			1px 0 1px black,
			-1px 0 1px black,
			0 1px 1px black,
			0 -1px 1px black;
	}

	.icon-label.selected {
		background: #000080;
		text-shadow: none;
	}

	img {
		image-rendering: pixelated;
		pointer-events: none;
		width: 32px;
		height: 32px;
	}
</style>
