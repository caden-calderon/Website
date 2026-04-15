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
	<img
		src={icon}
		alt=""
		width="32"
		height="32"
		draggable="false"
		onerror={(e) => {
			// Fallback to a simple colored square if icon fails to load
			const target = e.currentTarget as HTMLImageElement;
			target.style.display = 'none';
		}}
	/>
	<span class="icon-label">{label}</span>
</button>

<style>
	.desktop-icon {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		width: 75px;
		padding: 6px 4px 4px;
		border: 1px solid transparent;
		background: transparent;
		cursor: default;
		outline: none;
	}

	.desktop-icon.selected {
		background: rgba(0, 0, 128, 0.3);
		border: 1px dotted white;
	}

	.desktop-icon:focus-visible {
		border: 1px dotted white;
	}

	.icon-label {
		color: white;
		font-size: 11px;
		font-family: 'Pixelated MS Sans Serif', 'MS Sans Serif', 'Microsoft Sans Serif', Tahoma, Arial, sans-serif;
		text-align: center;
		line-height: 1.3;
		word-break: break-word;
		max-width: 68px;
		text-shadow:
			1px 0 1px black,
			-1px 0 1px black,
			0 1px 1px black,
			0 -1px 1px black;
	}

	img {
		image-rendering: pixelated;
		pointer-events: none;
	}
</style>
