<!--
  Internet Explorer 4 browser shell.

  Full IE4 chrome with real browsing capability: menu bar, toolbar with
  cool-button hover, address bar, animated throbber, Favorites dropdown,
  status bar. Internal chromatic.dev URLs render portfolio content;
  external URLs load in an iframe for real web browsing.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { windowManager } from '$lib/os/windowManager.svelte.js';
	import type { AppId } from '$lib/os/types.js';
	import { getProject } from '$lib/portfolio/projects.js';
	import HomePage from '$lib/portfolio/HomePage.svelte';
	import ProjectList from '$lib/portfolio/ProjectList.svelte';
	import ProjectDetail from '$lib/portfolio/ProjectDetail.svelte';
	import AboutPage from '$lib/portfolio/AboutPage.svelte';
	import ErrorPage from '$lib/portfolio/ErrorPage.svelte';

	let {
		windowId = '',
		url: initialUrl = '',
	}: {
		windowId?: string;
		appId?: string;
		title?: string;
		url?: string;
	} = $props();

	// ── Constants ─────────────────────────────────────────────────────────

	const HOME_URL = 'http://chromatic.dev/';
	const DOMAIN = 'chromatic.dev';
	// Intentional: capture initial prop value — the browser manages its own URL state after mount.
	const startUrl = initialUrl || HOME_URL; // eslint-disable-line

	// ── Favorites ─────────────────────────────────────────────────────────

	const FAVORITES = [
		{ label: 'Chromatic Home', url: 'http://chromatic.dev/' },
		{ sep: true },
		{ label: "Caden's GitHub", url: 'https://github.com/Caden-Calderon' },
		{ sep: true },
		{ label: 'Wikipedia', url: 'https://en.wikipedia.org/' },
		{ label: 'Hacker News', url: 'https://news.ycombinator.com/' },
		{ label: 'Wayback Machine', url: 'https://web.archive.org/' },
		{ label: 'CSS Zen Garden', url: 'http://www.csszengarden.com/' },
	] as const;

	// ── Browser state ─────────────────────────────────────────────────────

	let currentUrl = $state(startUrl);
	let historyStack = $state<string[]>([]);
	let forwardStack = $state<string[]>([]);
	let loading = $state(false);
	let addressValue = $state(startUrl);
	let statusText = $state('Done');
	let favoritesOpen = $state(false);
	let iframeRef = $state<HTMLIFrameElement | null>(null);
	let infoDismissed = $state(false);

	// ── Route resolution ──────────────────────────────────────────────────

	type PageKind = 'home' | 'projects' | 'project-detail' | 'about' | 'external' | 'error';

	interface ResolvedRoute {
		page: PageKind;
		title: string;
		params: Record<string, string>;
	}

	/** Check if a URL points to our internal site. */
	function isInternal(url: string): boolean {
		if (url.startsWith('/')) return true;
		try {
			const u = new URL(url);
			return u.hostname === DOMAIN || u.hostname === `www.${DOMAIN}`;
		} catch { /* fall through */ }
		try {
			const u = new URL(`http://${url}`);
			return u.hostname === DOMAIN || u.hostname === `www.${DOMAIN}`;
		} catch { /* fall through */ }
		return false;
	}

	function parsePath(url: string): string | null {
		if (url.startsWith('/')) return url;
		try {
			const u = new URL(url);
			if (u.hostname === DOMAIN || u.hostname === `www.${DOMAIN}`) return u.pathname;
		} catch {
			try {
				const u = new URL(`http://${url}`);
				if (u.hostname === DOMAIN || u.hostname === `www.${DOMAIN}`) return u.pathname;
			} catch { /* not valid */ }
		}
		return null;
	}

	/** Extract a readable domain name from a URL for the title bar. */
	function extractDomain(url: string): string {
		try {
			return new URL(url).hostname;
		} catch {
			return url;
		}
	}

	function resolveRoute(url: string): ResolvedRoute {
		// ── Internal chromatic.dev routes ──
		if (isInternal(url)) {
			const pathname = parsePath(url);
			if (pathname === null) {
				return { page: 'error', title: 'The page cannot be displayed', params: { url } };
			}
			const path = pathname === '/' ? '/' : pathname.replace(/\/$/, '');

			if (path === '/' || path === '') {
				return { page: 'home', title: 'Chromatic', params: {} };
			}
			if (path === '/projects') {
				return { page: 'projects', title: 'Projects - Chromatic', params: {} };
			}
			if (path.startsWith('/projects/')) {
				const slug = path.slice('/projects/'.length);
				if (getProject(slug)) {
					return {
						page: 'project-detail',
						title: `${getProject(slug)!.title} - Chromatic`,
						params: { slug },
					};
				}
			}
			if (path === '/about') {
				return { page: 'about', title: 'About - Chromatic', params: {} };
			}
			return { page: 'error', title: 'The page cannot be displayed', params: { url } };
		}

		// ── External URLs → iframe ──
		if (url.startsWith('http://') || url.startsWith('https://')) {
			return { page: 'external', title: extractDomain(url), params: { url } };
		}

		return { page: 'error', title: 'The page cannot be displayed', params: { url } };
	}

	const route = $derived(resolveRoute(currentUrl));
	const isInternalPage = $derived(route.page !== 'external' && route.page !== 'error');
	const canGoBack = $derived(historyStack.length > 0);
	const canGoForward = $derived(forwardStack.length > 0);

	// ── Navigation ────────────────────────────────────────────────────────

	function normalizeUrl(url: string): string {
		if (url.startsWith('/')) return `http://${DOMAIN}${url}`;
		if (url.startsWith(DOMAIN)) return `http://${url}`;
		if (!url.includes('://')) return `http://${url}`;
		return url;
	}

	let loadTimer: ReturnType<typeof setTimeout> | null = null;

	function simulateLoad(url: string, onDone: () => void) {
		if (loadTimer) clearTimeout(loadTimer);
		loading = true;
		addressValue = url;
		statusText = `Opening page ${url}...`;

		loadTimer = setTimeout(() => {
			onDone();
			loading = false;
			statusText = 'Done';
			loadTimer = null;
		}, 200 + Math.random() * 300);
	}

	function updateWindowTitle(url: string) {
		if (!windowId) return;
		const resolved = resolveRoute(url);
		windowManager.updateTitle(windowId, `${resolved.title} - Microsoft Internet Explorer`);
	}

	function navigate(url: string) {
		url = normalizeUrl(url);
		historyStack = [...historyStack, currentUrl];
		forwardStack = [];
		infoDismissed = false;
		simulateLoad(url, () => {
			currentUrl = url;
			updateWindowTitle(url);
		});
	}

	function goBack() {
		if (!canGoBack) return;
		const prev = historyStack.at(-1)!;
		historyStack = historyStack.slice(0, -1);
		forwardStack = [...forwardStack, currentUrl];
		simulateLoad(prev, () => {
			currentUrl = prev;
			updateWindowTitle(prev);
		});
	}

	function goForward() {
		if (!canGoForward) return;
		const next = forwardStack.at(-1)!;
		forwardStack = forwardStack.slice(0, -1);
		historyStack = [...historyStack, currentUrl];
		simulateLoad(next, () => {
			currentUrl = next;
			updateWindowTitle(next);
		});
	}

	function refresh() {
		if (route.page === 'external' && iframeRef) {
			// Force iframe reload by resetting src
			loading = true;
			statusText = `Opening page ${currentUrl}...`;
			const src = iframeRef.src;
			iframeRef.src = '';
			iframeRef.src = src;
		} else {
			simulateLoad(currentUrl, () => {});
		}
	}

	function stop() {
		if (loadTimer) {
			clearTimeout(loadTimer);
			loadTimer = null;
		}
		loading = false;
		statusText = 'Done';
	}

	function goHome() {
		navigate(HOME_URL);
	}

	function onAddressKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			navigate(addressValue);
		}
	}

	/** Intercept anchor clicks in the content area for internal navigation. */
	function handleContentClick(e: MouseEvent) {
		const anchor = (e.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null;
		if (!anchor) return;
		const href = anchor.getAttribute('href');
		if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
		e.preventDefault();
		navigate(href);
	}

	function launchApp(appId: AppId) {
		windowManager.open(appId);
	}

	function toggleFavorites() {
		favoritesOpen = !favoritesOpen;
	}

	function closeFavorites() {
		favoritesOpen = false;
	}

	function onFavoriteClick(url: string) {
		favoritesOpen = false;
		navigate(url);
	}

	function onIframeLoad() {
		loading = false;
		statusText = 'Done';
	}

	/** Open the current external URL in the user's real browser tab. */
	function openInNewTab() {
		if (route.page === 'external') {
			window.open(route.params.url, '_blank', 'noopener');
		}
	}

	/** Build the proxy URL for loading an external site through our server. */
	function proxyUrl(externalUrl: string): string {
		return `/api/proxy?url=${encodeURIComponent(externalUrl)}`;
	}

	/** Handle postMessage from proxied pages (address bar sync). */
	function onProxyMessage(e: MessageEvent) {
		if (e.data?.type === 'ie-nav' && typeof e.data.url === 'string') {
			const realUrl = e.data.url;
			if (realUrl !== currentUrl) {
				// In-iframe navigation: update address bar and title
				addressValue = realUrl;
				currentUrl = realUrl;
				updateWindowTitle(realUrl);
				loading = false;
				statusText = 'Done';
			}
		}
	}

	// ── Lifecycle ─────────────────────────────────────────────────────────

	onMount(() => {
		updateWindowTitle(currentUrl);
		window.addEventListener('message', onProxyMessage);
		return () => window.removeEventListener('message', onProxyMessage);
	});

	// ── Toolbar icons (20×20 SVG, pixel-art rendering) ────────────────────

	function tb(inner: string): string {
		return `data:image/svg+xml,${encodeURIComponent(
			`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" shape-rendering="crispEdges">${inner}</svg>`,
		)}`;
	}

	const ICO_BACK = tb(
		`<path d="M3 10l7-7v4h7v6h-7v4z" fill="#3a6ea5"/>`,
	);
	const ICO_FORWARD = tb(
		`<path d="M17 10l-7-7v4H3v6h7v4z" fill="#3a6ea5"/>`,
	);
	const ICO_STOP = tb(
		`<path d="M5 5l10 10M15 5L5 15" stroke="#cc0000" stroke-width="2.5" fill="none"/>`,
	);
	const ICO_REFRESH = tb(
		`<path d="M10 3a7 7 0 1 0 7 7h-2a5 5 0 1 1-5-5V1l5 4-5 4z" fill="#3a6ea5"/>`,
	);
	const ICO_HOME = tb(
		`<path d="M10 2L2 9h3v8h4v-5h2v5h4V9h3z" fill="#808000"/>` +
		`<rect x="5" y="9" width="10" height="8" fill="#c4a050"/>` +
		`<rect x="8" y="12" width="4" height="5" fill="#604020"/>` +
		`<path d="M10 2L2 9h3L10 4.5 15 9h3z" fill="#a00000"/>`,
	);
	const ICO_SEARCH = tb(
		`<circle cx="8" cy="8" r="5" fill="none" stroke="#3a6ea5" stroke-width="2"/>` +
		`<line x1="12" y1="12" x2="18" y2="18" stroke="#3a6ea5" stroke-width="2.5"/>`,
	);
	const ICO_FAVORITES = tb(
		`<path d="M10 2l2.4 5.2 5.6.7-4 4.1.9 5.7L10 15l-4.9 2.7.9-5.7-4-4.1 5.6-.7z" fill="#c0a000"/>`,
	);
	const ICO_HISTORY = tb(
		`<circle cx="10" cy="10" r="7" fill="#3a6ea5"/>` +
		`<circle cx="10" cy="10" r="5.5" fill="#5a8ec5"/>` +
		`<path d="M10 5v5l3 3" stroke="#fff" stroke-width="1.5" fill="none"/>`,
	);

	const ICO_PAGE = tb(
		`<rect x="4" y="2" width="10" height="14" fill="#fff" stroke="#808080" stroke-width="1"/>` +
		`<path d="M11 2v4h4" fill="#c0c0c0" stroke="#808080" stroke-width="1"/>` +
		`<line x1="6" y1="8" x2="12" y2="8" stroke="#000080" stroke-width="1"/>` +
		`<line x1="6" y1="10" x2="12" y2="10" stroke="#000080" stroke-width="1"/>` +
		`<line x1="6" y1="12" x2="10" y2="12" stroke="#000080" stroke-width="1"/>`,
	);

	const ICO_GLOBE = tb(
		`<circle cx="10" cy="10" r="8" fill="#3a6ea5"/>` +
		`<ellipse cx="10" cy="10" rx="4" ry="8" fill="none" stroke="#6aa0d0" stroke-width="0.8"/>` +
		`<line x1="2" y1="7" x2="18" y2="7" stroke="#6aa0d0" stroke-width="0.8"/>` +
		`<line x1="2" y1="13" x2="18" y2="13" stroke="#6aa0d0" stroke-width="0.8"/>` +
		`<line x1="10" y1="2" x2="10" y2="18" stroke="#6aa0d0" stroke-width="0.8"/>`,
	);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="ie-shell">
	<!-- ── Menu bar ─────────────────────────────────────────────────────── -->
	<div class="ie-menubar">
		{#each ['File', 'Edit', 'View', 'Go', 'Favorites', 'Help'] as item}
			<span class="ie-menu-item">{item}</span>
		{/each}
	</div>

	<!-- ── Toolbar + Throbber ───────────────────────────────────────────── -->
	<div class="ie-toolbar-row">
		<div class="ie-toolbar">
			<!-- Navigation group -->
			<button
				class="ie-cool-btn"
				disabled={!canGoBack}
				onclick={goBack}
				title="Back"
			>
				<img src={ICO_BACK} alt="" width="20" height="20" draggable="false" />
			</button>
			<button
				class="ie-cool-btn"
				disabled={!canGoForward}
				onclick={goForward}
				title="Forward"
			>
				<img src={ICO_FORWARD} alt="" width="20" height="20" draggable="false" />
			</button>
			<button class="ie-cool-btn" onclick={stop} title="Stop">
				<img src={ICO_STOP} alt="" width="20" height="20" draggable="false" />
			</button>
			<button class="ie-cool-btn" onclick={refresh} title="Refresh">
				<img src={ICO_REFRESH} alt="" width="20" height="20" draggable="false" />
			</button>
			<button class="ie-cool-btn" onclick={goHome} title="Home">
				<img src={ICO_HOME} alt="" width="20" height="20" draggable="false" />
			</button>

			<div class="ie-toolbar-sep"></div>

			<!-- Utility group -->
			<button class="ie-cool-btn" disabled title="Search">
				<img src={ICO_SEARCH} alt="" width="20" height="20" draggable="false" />
			</button>
			<div class="ie-btn-wrap">
				<button class="ie-cool-btn" onclick={toggleFavorites} title="Favorites">
					<img src={ICO_FAVORITES} alt="" width="20" height="20" draggable="false" />
				</button>
				{#if favoritesOpen}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="ie-dropdown-backdrop" onclick={closeFavorites}></div>
					<div class="ie-favorites-dropdown">
						<div class="ie-fav-header">Favorites</div>
						{#each FAVORITES as fav}
							{#if 'sep' in fav}
								<div class="ie-fav-sep"></div>
							{:else}
								<button class="ie-fav-item" onclick={() => onFavoriteClick(fav.url)}>
									<img src={ICO_GLOBE} alt="" width="14" height="14" draggable="false" />
									{fav.label}
								</button>
							{/if}
						{/each}
					</div>
				{/if}
			</div>
			<button class="ie-cool-btn" disabled title="History">
				<img src={ICO_HISTORY} alt="" width="20" height="20" draggable="false" />
			</button>
		</div>

		<!-- Throbber -->
		<div class="ie-throbber" class:active={loading}>
			<img src={ICO_GLOBE} alt="" width="24" height="24" draggable="false" class="ie-throbber-img" />
		</div>
	</div>

	<!-- ── Address bar ──────────────────────────────────────────────────── -->
	<div class="ie-addressbar">
		<span class="ie-address-label">Address</span>
		<div class="ie-address-field">
			<img src={ICO_PAGE} alt="" width="16" height="16" draggable="false" class="ie-address-icon" />
			<input
				type="text"
				class="ie-address-input"
				bind:value={addressValue}
				onkeydown={onAddressKeydown}
				spellcheck="false"
				autocomplete="off"
			/>
		</div>
	</div>

	<!-- ── Content area ─────────────────────────────────────────────────── -->
	{#if route.page === 'external'}
		<!-- External website loaded through server-side proxy -->
		{#if !infoDismissed}
			<div class="ie-external-info">
				<span>&#127760; <b>{extractDomain(route.params.url)}</b></span>
				<div class="ie-info-actions">
					<button class="ie-newtab-btn" onclick={openInNewTab}>Open in new tab &#8599;</button>
					<button class="ie-info-close" onclick={() => infoDismissed = true}>&times;</button>
				</div>
			</div>
		{/if}
		<iframe
			bind:this={iframeRef}
			src={proxyUrl(route.params.url)}
			class="ie-iframe"
			title="Web page"
			onload={onIframeLoad}
		></iframe>
	{:else}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="ie-content" onclick={handleContentClick}>
			<!-- Site navigation bar (part of the website, not IE chrome) -->
			{#if isInternalPage}
				<nav class="site-nav">
					<a href="/" class="nav-tab" class:active={route.page === 'home'}>Home</a>
					<a href="/projects" class="nav-tab" class:active={route.page === 'projects' || route.page === 'project-detail'}>Projects</a>
					<a href="/about" class="nav-tab" class:active={route.page === 'about'}>About</a>
				</nav>
			{/if}

			{#if route.page === 'home'}
				<HomePage {launchApp} />
			{:else if route.page === 'projects'}
				<ProjectList />
			{:else if route.page === 'project-detail'}
				<ProjectDetail slug={route.params.slug} {launchApp} />
			{:else if route.page === 'about'}
				<AboutPage />
			{:else}
				<ErrorPage url={route.params.url || currentUrl} />
			{/if}
		</div>
	{/if}

	<!-- ── Status bar ───────────────────────────────────────────────────── -->
	<div class="ie-statusbar">
		<div class="ie-status-text">{statusText}</div>
		<div class="ie-status-zone">
			<img src={ICO_GLOBE} alt="" width="12" height="12" draggable="false" />
			{route.page === 'external' ? 'Internet' : 'Local intranet'}
		</div>
	</div>
</div>

<style>
	/* ═══════════════════════════════════════════════════════════════════════
	   IE4 Shell — root layout
	   ═══════════════════════════════════════════════════════════════════ */

	.ie-shell {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: #c0c0c0;
		font-family: 'Pixelated MS Sans Serif', Arial, sans-serif;
		font-size: 11px;
		color: #000;
	}

	/* ═══════════════════════════════════════════════════════════════════════
	   Menu bar
	   ═══════════════════════════════════════════════════════════════════ */

	.ie-menubar {
		display: flex;
		align-items: center;
		padding: 1px 2px;
		border-bottom: 1px solid #808080;
		flex-shrink: 0;
	}

	.ie-menu-item {
		padding: 2px 6px;
		cursor: default;
		white-space: nowrap;
	}

	.ie-menu-item:hover {
		background: #000080;
		color: #fff;
	}

	/* ═══════════════════════════════════════════════════════════════════════
	   Toolbar row (buttons + throbber)
	   ═══════════════════════════════════════════════════════════════════ */

	.ie-toolbar-row {
		display: flex;
		align-items: center;
		border-bottom: 1px solid #808080;
		flex-shrink: 0;
	}

	.ie-toolbar {
		display: flex;
		align-items: center;
		padding: 2px 4px;
		gap: 1px;
		flex: 1;
	}

	/* ── Cool buttons (flat default, raised on hover) ──────────────────── */

	.ie-cool-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 24px;
		padding: 2px;
		background: transparent;
		border: none;
		box-shadow: none;
		cursor: default;
		color: #000;
		text-shadow: none;
		min-width: unset;
		min-height: unset;
	}

	.ie-cool-btn:not(:disabled):hover {
		box-shadow: inset -1px -1px #808080, inset 1px 1px #ffffff;
	}

	.ie-cool-btn:not(:disabled):active {
		box-shadow: inset 1px 1px #808080, inset -1px -1px #ffffff;
	}

	.ie-cool-btn:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.ie-cool-btn:disabled img {
		filter: grayscale(1);
	}

	.ie-cool-btn img {
		pointer-events: none;
	}

	/* ── Toolbar separator ─────────────────────────────────────────────── */

	.ie-toolbar-sep {
		width: 2px;
		height: 20px;
		margin: 0 3px;
		border-left: 1px solid #808080;
		border-right: 1px solid #ffffff;
	}

	/* ── Button wrapper (for dropdown positioning) ─────────────────────── */

	.ie-btn-wrap {
		position: relative;
	}

	/* ── Favorites dropdown ────────────────────────────────────────────── */

	.ie-dropdown-backdrop {
		position: fixed;
		inset: 0;
		z-index: 99;
	}

	.ie-favorites-dropdown {
		position: absolute;
		top: 100%;
		left: -2px;
		z-index: 100;
		background: #c0c0c0;
		border: 1px solid #000;
		box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
		min-width: 200px;
		padding: 1px;
	}

	.ie-fav-header {
		padding: 2px 6px;
		font-weight: bold;
		color: #000080;
		border-bottom: 1px solid #808080;
		margin-bottom: 1px;
	}

	.ie-fav-sep {
		height: 1px;
		background: #808080;
		margin: 2px 4px;
	}

	.ie-fav-item {
		display: flex;
		align-items: center;
		gap: 6px;
		width: 100%;
		padding: 3px 6px;
		text-align: left;
		background: transparent;
		border: none;
		box-shadow: none;
		min-width: unset;
		min-height: unset;
		color: #000;
		text-shadow: none;
		font-family: inherit;
		font-size: 11px;
		cursor: default;
		white-space: nowrap;
	}

	.ie-fav-item:hover {
		background: #000080;
		color: #fff;
	}

	.ie-fav-item img {
		flex-shrink: 0;
		pointer-events: none;
	}

	/* ── Throbber ───────────────────────────────────────────────────────── */

	.ie-throbber {
		width: 38px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		border-left: 1px solid #808080;
		margin-right: 2px;
	}

	.ie-throbber-img {
		transition: none;
	}

	.ie-throbber.active .ie-throbber-img {
		animation: throbber-pulse 0.6s ease-in-out infinite;
	}

	@keyframes throbber-pulse {
		0%, 100% { opacity: 1; transform: scale(1); }
		50% { opacity: 0.6; transform: scale(0.85); }
	}

	/* ═══════════════════════════════════════════════════════════════════════
	   Address bar
	   ═══════════════════════════════════════════════════════════════════ */

	.ie-addressbar {
		display: flex;
		align-items: center;
		padding: 2px 4px;
		gap: 4px;
		border-bottom: 1px solid #808080;
		flex-shrink: 0;
	}

	.ie-address-label {
		font-weight: bold;
		white-space: nowrap;
		padding: 0 2px;
	}

	.ie-address-field {
		flex: 1;
		display: flex;
		align-items: center;
		background: #fff;
		box-shadow: inset -1px -1px #fff, inset 1px 1px #808080,
		            inset -2px -2px #dfdfdf, inset 2px 2px #0a0a0a;
		padding: 1px 2px;
	}

	.ie-address-icon {
		flex-shrink: 0;
		margin-right: 2px;
	}

	.ie-address-input {
		flex: 1;
		border: none;
		background: transparent;
		outline: none;
		font-family: inherit;
		font-size: 11px;
		padding: 1px 2px;
		height: 18px;
		min-height: unset;
		box-shadow: none;
		color: #000;
	}

	/* ═══════════════════════════════════════════════════════════════════════
	   Content area (internal pages)
	   ═══════════════════════════════════════════════════════════════════ */

	.ie-content {
		flex: 1;
		overflow: auto;
		background: #fff;
		min-height: 0;
	}

	/* ── Site navigation (part of the website, not IE chrome) ──────────── */

	.site-nav {
		display: flex;
		background: linear-gradient(180deg, #6699cc 0%, #335f99 100%);
		border-bottom: 2px solid #1a3a66;
		padding: 0;
	}

	.nav-tab {
		display: block;
		padding: 4px 14px;
		color: #e8f0ff;
		text-decoration: none;
		font-weight: bold;
		font-size: 11px;
		border-right: 1px solid rgba(255, 255, 255, 0.2);
		font-family: 'Pixelated MS Sans Serif', Arial, sans-serif;
	}

	.nav-tab:hover {
		background: rgba(255, 255, 255, 0.15);
		color: #fff;
	}

	.nav-tab.active {
		background: #fff;
		color: #335f99;
	}

	/* ═══════════════════════════════════════════════════════════════════════
	   External page (iframe)
	   ═══════════════════════════════════════════════════════════════════ */

	.ie-external-info {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 2px 8px;
		background: linear-gradient(180deg, #fffff0 0%, #f0f0d8 100%);
		border-bottom: 1px solid #c0c0a0;
		font-size: 10px;
		color: #404020;
		flex-shrink: 0;
	}

	.ie-info-actions {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.ie-newtab-btn {
		background: linear-gradient(180deg, #e8e8d8 0%, #d0d0c0 100%);
		border: 1px solid #a0a080;
		border-radius: 2px;
		padding: 1px 8px;
		font-family: inherit;
		font-size: 10px;
		cursor: pointer;
		color: #000;
		text-shadow: none;
		min-width: unset;
		min-height: unset;
		box-shadow: none;
	}

	.ie-newtab-btn:hover {
		background: linear-gradient(180deg, #f0f0e0 0%, #e0e0cc 100%);
		border-color: #808060;
	}

	.ie-info-close {
		background: transparent;
		border: none;
		box-shadow: none;
		padding: 0 3px;
		font-size: 14px;
		line-height: 1;
		cursor: pointer;
		color: #808060;
		min-width: unset;
		min-height: unset;
		text-shadow: none;
	}

	.ie-info-close:hover {
		color: #000;
	}

	.ie-iframe {
		flex: 1;
		width: 100%;
		border: none;
		background: #fff;
		min-height: 0;
	}

	/* ═══════════════════════════════════════════════════════════════════════
	   Status bar
	   ═══════════════════════════════════════════════════════════════════ */

	.ie-statusbar {
		display: flex;
		align-items: center;
		flex-shrink: 0;
		gap: 1px;
		padding: 1px 2px;
	}

	.ie-status-text {
		flex: 1;
		padding: 1px 4px;
		box-shadow: inset -1px -1px #dfdfdf, inset 1px 1px #808080;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.ie-status-zone {
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 1px 6px;
		box-shadow: inset -1px -1px #dfdfdf, inset 1px 1px #808080;
		white-space: nowrap;
	}

	.ie-status-zone img {
		opacity: 0.7;
	}
</style>
