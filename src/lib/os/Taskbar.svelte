<script lang="ts">
	import { windowManager } from './windowManager.svelte.js';
	import { getIcon } from './icons.js';
	import { TASKBAR_HEIGHT } from './types.js';

	const windowsFlag = getIcon('windows-flag');

	let { onStartClick }: { onStartClick: () => void } = $props();

	let timeString = $state('');

	function updateClock() {
		const now = new Date();
		timeString = now.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
		});
	}

	$effect(() => {
		updateClock();
		const interval = setInterval(updateClock, 1000);
		return () => clearInterval(interval);
	});

	const entries = $derived(windowManager.taskbarEntries);
</script>

<div class="taskbar" style="height: {TASKBAR_HEIGHT}px;">
	<button class="start-button" onclick={onStartClick} type="button">
		<img src={windowsFlag} alt="" width="16" height="16" class="start-icon" draggable="false" />
		<span class="start-text">Start</span>
	</button>

	<div class="divider"></div>

	<div class="window-list">
		{#each entries as entry (entry.windowId)}
			<button
				class="window-entry"
				class:active={entry.focused}
				onclick={() => windowManager.taskbarClick(entry.windowId)}
				type="button"
				title={entry.title}
			>
				<img src={entry.icon} alt="" width="16" height="16" class="entry-icon" draggable="false" />
				<span class="entry-title">{entry.title}</span>
			</button>
		{/each}
	</div>

	<div class="system-tray">
		<span class="clock">{timeString}</span>
	</div>
</div>

<style>
	.taskbar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 2px 2px;
		background: #c0c0c0;
		border-top: 1px solid #ffffff;
		z-index: 99999;
		font-family: 'Pixelated MS Sans Serif', 'MS Sans Serif', 'Microsoft Sans Serif', Arial, sans-serif;
		font-size: 11px;
		color: #000000;
	}

	.start-button {
		display: flex;
		align-items: center;
		gap: 3px;
		padding: 2px 6px;
		height: 26px;
		font-weight: bold;
		font-size: 11px;
		font-family: inherit;
		color: #000000;
		cursor: default;
		flex-shrink: 0;
	}

	.start-icon {
		width: 16px;
		height: 16px;
		image-rendering: pixelated;
		flex-shrink: 0;
	}

	.start-text {
		line-height: 1;
	}

	.divider {
		width: 2px;
		height: 24px;
		border-left: 1px solid #808080;
		border-right: 1px solid white;
		flex-shrink: 0;
	}

	.window-list {
		display: flex;
		gap: 3px;
		flex: 1;
		overflow: hidden;
		min-width: 0;
	}

	.window-entry {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 2px 8px;
		height: 24px;
		max-width: 170px;
		min-width: 90px;
		font-size: 11px;
		font-family: inherit;
		cursor: default;
		overflow: hidden;
	}

	.window-entry.active {
		box-shadow: inset -1px -1px #dfdfdf, inset 1px 1px #0a0a0a,
			inset -2px -2px #fff, inset 2px 2px grey;
		background: repeating-conic-gradient(silver 0% 25%, white 0% 50%) 50% / 2px 2px;
		font-weight: bold;
	}

	.entry-icon {
		width: 16px;
		height: 16px;
		image-rendering: pixelated;
		flex-shrink: 0;
	}

	.entry-title {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.system-tray {
		display: flex;
		align-items: center;
		padding: 2px 8px;
		height: 24px;
		border: 1px solid;
		border-color: #808080 #dfdfdf #dfdfdf #808080;
		flex-shrink: 0;
	}

	.clock {
		font-size: 11px;
		white-space: nowrap;
	}
</style>
