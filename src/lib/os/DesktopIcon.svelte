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
		gap: 3px;
		/* Viewport-relative width so icons scale with screen */
		width: clamp(70px, 6vw, 90px);
		padding: 4px 2px;
		background: none;
		border: none;
		cursor: default;
		outline: none;
		/* Remove all 98.css button chrome */
		box-shadow: none;
		min-height: 0;
		min-width: 0;
	}

	.desktop-icon:active {
		box-shadow: none;
	}

	.icon-img-wrap {
		padding: 2px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.icon-img-wrap.selected {
		/* Win98 selection: blue tint overlay on the icon */
		filter: brightness(0.7) sepia(1) saturate(5) hue-rotate(200deg);
	}

	.icon-label {
		color: #ffffff;
		/* Regular weight, NOT bold — this is correct for Win98 */
		font-weight: 400;
		font-size: 11px;
		font-family: 'Pixelated MS Sans Serif', 'MS Sans Serif', 'Microsoft Sans Serif', Arial, sans-serif;
		text-align: center;
		line-height: 1.2;
		word-break: break-word;
		max-width: clamp(64px, 5.5vw, 84px);
		padding: 1px 2px;
		/* Win98 does NOT have text shadows on desktop icons */
	}

	.icon-label.selected {
		background: #000080;
		color: #ffffff;
	}

	img {
		image-rendering: pixelated;
		pointer-events: none;
		/* Viewport-relative icon size */
		width: clamp(32px, 3vw, 48px);
		height: clamp(32px, 3vw, 48px);
	}
</style>
