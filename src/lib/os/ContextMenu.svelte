<script lang="ts">
	import type { ContextMenuItem } from './types.js';

	let {
		x,
		y,
		items,
		onclose,
	}: {
		x: number;
		y: number;
		items: ContextMenuItem[];
		onclose: () => void;
	} = $props();

	let expandedChild = $state<string | null>(null);

	function handleClick(item: ContextMenuItem) {
		if (item.disabled || item.children) return;
		item.action?.();
		onclose();
	}

	// Clamp position so menu doesn't go off-screen
	const menuWidth = 160;
	const menuHeight = items.length * 22 + 8;
	const clampedX = $derived(
		typeof window !== 'undefined'
			? Math.min(x, window.innerWidth - menuWidth)
			: x,
	);
	const clampedY = $derived(
		typeof window !== 'undefined'
			? Math.min(y, window.innerHeight - menuHeight)
			: y,
	);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
<div class="context-backdrop" onclick={onclose}>
	<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
	<div
		class="context-menu window"
		style="left: {clampedX}px; top: {clampedY}px;"
		onclick={(e) => e.stopPropagation()}
	>
		{#each items as item}
			{#if item.separator}
				<div class="separator"></div>
			{:else}
				<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
				<div
					class="menu-item"
					class:disabled={item.disabled}
					onclick={() => handleClick(item)}
					onpointerenter={() => {
						if (item.children) expandedChild = item.label;
						else expandedChild = null;
					}}
				>
					<span class="item-icon">
						{#if item.icon}
							<img src={item.icon} alt="" width="16" height="16" draggable="false" />
						{/if}
					</span>
					<span class="item-label">{item.label}</span>
					{#if item.children}
						<span class="arrow">▸</span>
					{/if}

					{#if item.children && expandedChild === item.label}
						<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
						<div class="submenu window" onclick={(e) => e.stopPropagation()}>
							{#each item.children as child}
								{#if child.separator}
									<div class="separator"></div>
								{:else}
									<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
									<div
										class="menu-item"
										class:disabled={child.disabled}
										onclick={() => handleClick(child)}
									>
										<span class="item-icon">
											{#if child.icon}
												<img src={child.icon} alt="" width="16" height="16" draggable="false" />
											{/if}
										</span>
										<span class="item-label">{child.label}</span>
									</div>
								{/if}
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		{/each}
	</div>
</div>

<style>
	.context-backdrop {
		position: fixed;
		inset: 0;
		z-index: 110000;
	}

	.context-menu {
		position: fixed;
		min-width: 160px;
		padding: 2px 0;
		z-index: 110001;
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 3px 20px 3px 4px;
		font-size: 11px;
		font-family: 'Pixelated MS Sans Serif', Arial, sans-serif;
		cursor: default;
		white-space: nowrap;
		position: relative;
	}

	.menu-item:hover:not(.disabled) {
		background: #000080;
		color: white;
	}

	.menu-item.disabled {
		color: #808080;
	}

	.item-icon {
		width: 16px;
		height: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.item-icon img {
		width: 16px;
		height: 16px;
		image-rendering: pixelated;
	}

	.item-label {
		flex: 1;
	}

	.arrow {
		margin-left: auto;
		font-size: 10px;
	}

	.separator {
		height: 0;
		margin: 3px 4px;
		border-top: 1px solid #808080;
		border-bottom: 1px solid white;
	}

	.submenu {
		position: absolute;
		left: 100%;
		top: -3px;
		min-width: 140px;
		padding: 2px 0;
		z-index: 110002;
	}
</style>
