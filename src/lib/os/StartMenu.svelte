<script lang="ts">
	import { windowManager } from './windowManager.svelte.js';
	import { getIcon } from './icons.js';
	import type { AppId } from './types.js';

	let { onclose }: { onclose: () => void } = $props();

	let expandedSubmenu = $state<string | null>(null);
	let expandedNested = $state<string | null>(null);

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
				{
					label: 'Internet Explorer',
					icon: getIcon('internet-explorer'),
					children: [
						{ label: 'Internet Explorer', icon: getIcon('internet-explorer'), appId: 'internet-explorer' },
					],
				},
				{ separator: true, label: '' },
				{ label: 'Point Engine', icon: getIcon('point-engine'), appId: 'point-engine' },
				{ label: 'MS-DOS Prompt', icon: getIcon('my-computer'), disabled: true },
				{ label: 'Windows Explorer', icon: getIcon('file-explorer'), appId: 'file-explorer' },
			],
		},
		{
			label: 'Favorites',
			icon: getIcon('favorites'),
			children: [
				{ label: 'My Projects', icon: getIcon('file-explorer'), appId: 'file-explorer' },
			],
		},
		{
			label: 'Documents',
			icon: getIcon('documents'),
			children: [
				{ label: 'My Documents', icon: getIcon('my-documents'), appId: 'file-explorer' },
			],
		},
		{
			label: 'Settings',
			icon: getIcon('settings'),
			children: [
				{ label: 'Control Panel', icon: getIcon('settings'), disabled: true },
				{ label: 'Taskbar & Start Menu...', icon: getIcon('settings'), disabled: true },
			],
		},
		{
			label: 'Find',
			icon: getIcon('find'),
			children: [
				{ label: 'Files or Folders...', icon: getIcon('find'), disabled: true },
				{ label: 'On the Internet...', icon: getIcon('internet-explorer'), disabled: true },
			],
		},
		{ label: 'Help', icon: getIcon('help') },
		{ label: 'Run...', icon: getIcon('run-dialog'), appId: 'run-dialog' },
		{ separator: true, label: '' },
		{ label: 'Log Off...', icon: getIcon('shutdown'), disabled: true },
		{ separator: true, label: '' },
		{ label: 'Shut Down...', icon: getIcon('shutdown'), disabled: true },
	];

	function handleItemClick(item: MenuItem) {
		if (item.disabled || item.children) return;
		if (item.appId) {
			windowManager.open(item.appId);
		}
		onclose();
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
<div class="start-menu-backdrop" onclick={onclose}>
	<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
	<div class="start-menu window" onclick={(e) => e.stopPropagation()}>
		<!-- Vertical Windows 98 banner -->
		<div class="banner">
			<span class="banner-text">
				<span class="banner-windows">Windows</span><span class="banner-ver">98</span>
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
						onclick={() => handleItemClick(item)}
						onpointerenter={() => {
							if (item.children) expandedSubmenu = item.label;
							else expandedSubmenu = null;
							expandedNested = null;
						}}
					>
						<img src={item.icon} alt="" width="32" height="32" class="menu-icon" draggable="false" />
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
											class="menu-item sub-item"
											class:disabled={child.disabled}
											onclick={() => handleItemClick(child)}
											onpointerenter={() => {
												if (child.children) expandedNested = child.label;
												else expandedNested = null;
											}}
										>
											<img src={child.icon} alt="" width="16" height="16" class="menu-icon-sm" draggable="false" />
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
															class="menu-item sub-item"
															class:disabled={nested.disabled}
															onclick={() => handleItemClick(nested)}
														>
															<img src={nested.icon} alt="" width="16" height="16" class="menu-icon-sm" draggable="false" />
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
		/* Overlap the taskbar by 2px — matches Win98 where the menu sits on the taskbar */
		bottom: 30px;
		left: 0;
		display: flex;
		flex-direction: row;
		min-width: 180px;
		z-index: 100001;
		padding: 0;
		background: #c0c0c0;
	}

	/* Vertical banner */
	.banner {
		width: 24px;
		background: linear-gradient(to top, #000080, #1084d0);
		display: flex;
		align-items: flex-end;
		justify-content: center;
		padding-bottom: 6px;
		flex-shrink: 0;
	}

	.banner-text {
		writing-mode: vertical-rl;
		transform: rotate(180deg);
		font-family: Arial, Helvetica, sans-serif;
		font-size: 20px;
		font-weight: bold;
		letter-spacing: 0.5px;
	}

	.banner-windows {
		color: white;
	}

	.banner-ver {
		font-weight: 900;
		color: #c0c0c0;
	}

	/* Menu body */
	.menu-body {
		display: flex;
		flex-direction: column;
		flex: 1;
		padding: 2px 0;
	}

	/* Menu items — black text by default, white only when hovered */
	.menu-item {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 6px 4px 4px;
		font-size: 11px;
		font-family: 'Pixelated MS Sans Serif', 'MS Sans Serif', 'Microsoft Sans Serif', Tahoma, Arial, sans-serif;
		color: #000000;
		cursor: default;
		white-space: nowrap;
		position: relative;
	}

	.menu-item:hover:not(.disabled) {
		background: #000080;
		color: #ffffff;
	}

	.menu-item.disabled {
		color: #808080;
	}

	.menu-icon {
		width: 32px;
		height: 32px;
		image-rendering: pixelated;
		flex-shrink: 0;
	}

	/* Submenu items — 16x16 icons, shorter rows */
	.sub-item {
		padding: 3px 6px 3px 4px;
	}

	.menu-icon-sm {
		width: 16px;
		height: 16px;
		image-rendering: pixelated;
		flex-shrink: 0;
	}

	.menu-label {
		flex: 1;
	}

	.arrow {
		font-size: 8px;
		margin-left: 8px;
		/* Flush to the right edge */
		position: absolute;
		right: 6px;
	}

	.separator {
		height: 0;
		margin: 3px 2px;
		border-top: 1px solid #808080;
		border-bottom: 1px solid #ffffff;
	}

	/* Submenus overlap their parent by 2px, matching Win98 */
	.submenu {
		position: absolute;
		left: calc(100% - 2px);
		top: -3px;
		min-width: 170px;
		display: flex;
		flex-direction: column;
		padding: 2px 0;
		z-index: 100002;
		background: #c0c0c0;
	}
</style>
