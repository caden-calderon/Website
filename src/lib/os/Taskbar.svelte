<script lang="ts">
	import { windowManager } from './windowManager.svelte.js';
	import { TASKBAR_HEIGHT } from './types.js';

	let { onStartClick }: { onStartClick: () => void } = $props();

	// Live clock
	let timeString = $state('');

	function updateClock() {
		const now = new Date();
		timeString = now.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
		});
	}

	// Update clock every second
	$effect(() => {
		updateClock();
		const interval = setInterval(updateClock, 1000);
		return () => clearInterval(interval);
	});

	const entries = $derived(windowManager.taskbarEntries);
</script>

<div class="taskbar" style="height: {TASKBAR_HEIGHT}px;">
	<!-- Start button -->
	<button class="start-button" onclick={onStartClick} type="button">
		<span class="start-icon">🪟</span>
		<span class="start-text">Start</span>
	</button>

	<!-- Divider -->
	<div class="divider"></div>

	<!-- Running windows -->
	<div class="window-list">
		{#each entries as entry (entry.windowId)}
			<button
				class="window-entry"
				class:active={entry.focused}
				onclick={() => windowManager.taskbarClick(entry.windowId)}
				type="button"
				title={entry.title}
			>
				<span class="entry-title">{entry.title}</span>
			</button>
		{/each}
	</div>

	<!-- System tray -->
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
		background: silver;
		border-top: 1px solid #dfdfdf;
		box-shadow: inset 0 1px 0 white;
		z-index: 99999;
		font-family: 'Pixelated MS Sans Serif', Arial, sans-serif;
		font-size: 11px;
	}

	.start-button {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 2px 6px;
		height: 22px;
		font-weight: bold;
		font-size: 11px;
		font-family: inherit;
		cursor: default;
		flex-shrink: 0;
		min-width: 54px;
	}

	.start-icon {
		font-size: 14px;
		line-height: 1;
	}

	.start-text {
		line-height: 1;
	}

	.divider {
		width: 2px;
		height: 22px;
		border-left: 1px solid #808080;
		border-right: 1px solid white;
		flex-shrink: 0;
	}

	.window-list {
		display: flex;
		gap: 2px;
		flex: 1;
		overflow: hidden;
		min-width: 0;
	}

	.window-entry {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 2px 8px;
		height: 22px;
		max-width: 160px;
		min-width: 80px;
		font-size: 11px;
		font-family: inherit;
		cursor: default;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.window-entry.active {
		/* 98.css pressed/active button style */
		box-shadow: inset -1px -1px #dfdfdf, inset 1px 1px #0a0a0a,
			inset -2px -2px #fff, inset 2px 2px grey;
		background: repeating-conic-gradient(silver 0% 25%, white 0% 50%) 50% / 2px 2px;
		font-weight: bold;
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
		height: 22px;
		border: 1px solid;
		border-color: #808080 white white #808080;
		flex-shrink: 0;
	}

	.clock {
		font-size: 11px;
		white-space: nowrap;
	}
</style>
