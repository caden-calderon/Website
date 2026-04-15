<script lang="ts">
	import { windowManager } from './windowManager.svelte.js';
	import { getIcon } from './icons.js';
	import type { AppId } from './types.js';

	let { onclose }: { onclose: () => void } = $props();

	// Which submenu is currently expanded (by item label)
	let expandedSubmenu = $state<string | null>(null);

	interface MenuItem {
		label: string;
		icon?: string;
		appId?: AppId;
		disabled?: boolean;
		separator?: boolean;
		children?: MenuItem[];
	}

	const menuItems: MenuItem[] = [
		{
			label: 'Programs',
			icon: getIcon('file-explorer'),
			children: [
				{
					label: 'Accessories',
					icon: getIcon('file-explorer'),
					children: [
						{ label: 'Calculator', icon: getIcon('calculator'), appId: 'calculator' },
						{ label: 'Notepad', icon: getIcon('notepad'), appId: 'notepad' },
					],
				},
				{
					label: 'Games',
					icon: getIcon('file-explorer'),
					children: [
						{ label: 'Chess', icon: getIcon('chess'), appId: 'chess' },
						{ label: 'Axial', icon: getIcon('axial'), appId: 'axial' },
						{ label: 'Solitaire', icon: getIcon('solitaire'), appId: 'solitaire' },
						{ label: 'Minesweeper', icon: getIcon('minesweeper'), appId: 'minesweeper' },
					],
				},
				{ separator: true, label: '' },
				{ label: 'Internet Explorer', icon: getIcon('internet-explorer'), appId: 'internet-explorer' },
				{ label: 'My Projects', icon: getIcon('file-explorer'), appId: 'file-explorer' },
				{ label: 'Point Engine', icon: getIcon('point-engine'), appId: 'point-engine' },
			],
		},
		{ label: 'Settings', icon: getIcon('my-computer'), disabled: true },
		{ label: 'Find', icon: getIcon('file-explorer'), disabled: true },
		{ label: 'Help', icon: getIcon('notepad'), disabled: true },
		{ label: 'Run...', icon: getIcon('run-dialog'), appId: 'run-dialog' },
		{ separator: true, label: '' },
		{ label: 'Shut Down...', icon: getIcon('my-computer'), disabled: true },
	];

	function handleItemClick(item: MenuItem) {
		if (item.disabled || item.children) return;
		if (item.appId) {
			windowManager.open(item.appId);
		}
		onclose();
	}

	function handleSubmenuEnter(label: string) {
		expandedSubmenu = label;
	}

	function handleSubmenuLeave() {
		// Delay so user can move to submenu
		setTimeout(() => {
			// Only clear if not hovering a child submenu
		}, 100);
	}

	// Track nested submenu expansion
	let expandedNested = $state<string | null>(null);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="start-menu-backdrop" onclick={onclose}>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="start-menu window" onclick={(e) => e.stopPropagation()}>
		<!-- Vertical Windows 95 banner -->
		<div class="banner">
			<span class="banner-text">
				Windows<span class="banner-95">95</span>
			</span>
		</div>

		<!-- Menu items -->
		<div class="menu-body">
			{#each menuItems as item}
				{#if item.separator}
					<div class="separator"></div>
				{:else}
					<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
					<div
						class="menu-item"
						class:disabled={item.disabled}
						class:has-children={!!item.children}
						onclick={() => handleItemClick(item)}
						onpointerenter={() => {
							if (item.children) expandedSubmenu = item.label;
							else expandedSubmenu = null;
						}}
					>
						<img
							src={item.icon}
							alt=""
							width="16"
							height="16"
							class="menu-icon"
							draggable="false"
						/>
						<span class="menu-label">{item.label}</span>
						{#if item.children}
							<span class="arrow">▸</span>
						{/if}

						<!-- Submenu flyout -->
						{#if item.children && expandedSubmenu === item.label}
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
											class:has-children={!!child.children}
											onclick={() => handleItemClick(child)}
											onpointerenter={() => {
												if (child.children) expandedNested = child.label;
												else expandedNested = null;
											}}
										>
											<img
												src={child.icon}
												alt=""
												width="16"
												height="16"
												class="menu-icon"
												draggable="false"
											/>
											<span class="menu-label">{child.label}</span>
											{#if child.children}
												<span class="arrow">▸</span>
											{/if}

											<!-- Nested submenu -->
											{#if child.children && expandedNested === child.label}
												<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
												<div class="submenu window" onclick={(e) => e.stopPropagation()}>
													{#each child.children as nested}
														<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
														<div
															class="menu-item"
															class:disabled={nested.disabled}
															onclick={() => handleItemClick(nested)}
														>
															<img
																src={nested.icon}
																alt=""
																width="16"
																height="16"
																class="menu-icon"
																draggable="false"
															/>
															<span class="menu-label">{nested.label}</span>
														</div>
													{/each}
												</div>
											{/if}
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
</div>

<style>
	.start-menu-backdrop {
		position: fixed;
		inset: 0;
		z-index: 100000;
	}

	.start-menu {
		position: fixed;
		bottom: 30px;
		left: 0;
		display: flex;
		flex-direction: row;
		min-width: 200px;
		z-index: 100001;
		padding: 0;
	}

	.banner {
		width: 22px;
		background: linear-gradient(to top, #000080, #1084d0);
		display: flex;
		align-items: flex-end;
		justify-content: center;
		padding-bottom: 6px;
		flex-shrink: 0;
	}

	.banner-text {
		color: white;
		font-weight: bold;
		font-size: 18px;
		writing-mode: vertical-rl;
		transform: rotate(180deg);
		letter-spacing: 0.5px;
		font-family: Arial, Helvetica, sans-serif;
	}

	.banner-95 {
		font-weight: 900;
		color: #c0c0c0;
	}

	.menu-body {
		display: flex;
		flex-direction: column;
		flex: 1;
		padding: 2px 0;
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 20px 4px 6px;
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

	.menu-icon {
		width: 16px;
		height: 16px;
		image-rendering: pixelated;
		flex-shrink: 0;
	}

	.menu-label {
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
		min-width: 160px;
		display: flex;
		flex-direction: column;
		padding: 2px 0;
		z-index: 100002;
	}
</style>
