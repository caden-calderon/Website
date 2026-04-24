<!--
  Internet Explorer 4 browser shell.

  Three-row chrome modelled 1:1 against the IE4 reference:
    1. Menu bar (File / Edit / View / Go / Favorites / Help) with a black
       corner panel on the right holding the animated "e" logo.
    2. Toolbar with rebar bands: Back · Forward/Stop/Refresh/Home ·
       Search/Favorites/History/Channels · Fullscreen/Mail/Print/Edit.
       Each band has a vertical gripper on the left and raised 3D edges.
       Icons render grayscale by default and return to full color on
       hover / active — a deliberate modern touch over pure 1997.
    3. Address bar rebar + Links rebar, side by side, same row.

  Internal chromatic.dev URLs render portfolio content; external URLs
  load through the server-side proxy in an iframe.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { windowManager } from '$lib/os/windowManager.svelte.js';
	import type { AppId } from '$lib/os/types.js';
	import { inspectFrameLocation } from './internetExplorerFrame.js';
	import {
		IE_HOME_URL,
		IE_SEARCH_URL,
		extractDomain,
		normalizeInternetExplorerUrl,
		proxyUrl,
		resolveInternetExplorerRoute,
		shortUrl,
	} from './internetExplorerNavigation.js';
	import HomePage from '$lib/portfolio/HomePage.svelte';
	import ProjectList from '$lib/portfolio/ProjectList.svelte';
	import ProjectDetail from '$lib/portfolio/ProjectDetail.svelte';
	import AboutPage from '$lib/portfolio/AboutPage.svelte';
	import ErrorPage from '$lib/portfolio/ErrorPage.svelte';
	import SearchStartPage from '$lib/portfolio/SearchStartPage.svelte';

	// ── Constants ─────────────────────────────────────────────────────────

	const ICON_BASE = '/os-assets/icons/ie4';

	let {
		windowId = '',
		url: initialUrl = '',
	}: {
		windowId?: string;
		appId?: string;
		title?: string;
		url?: string;
	} = $props();

	// ── Favorites & Links ─────────────────────────────────────────────────

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

	const LINKS = [
		{ label: 'Best of the Web', url: 'https://en.wikipedia.org/' },
		{ label: 'Channel Guide', url: 'http://chromatic.dev/projects' },
		{ label: 'Customize Links', url: 'http://chromatic.dev/about' },
		{ label: 'Internet Start', url: 'http://chromatic.dev/search' },
		{ label: 'Microsoft', url: 'https://en.wikipedia.org/wiki/Microsoft' },
	] as const;

	// ── Browser state ─────────────────────────────────────────────────────

	let currentUrl = $state(IE_HOME_URL);
	let historyStack = $state<string[]>([]);
	let forwardStack = $state<string[]>([]);
	let loading = $state(false);
	let addressValue = $state(IE_HOME_URL);
	let statusText = $state('Done');
	let favoritesOpen = $state(false);
	let backDropdownOpen = $state(false);
	let forwardDropdownOpen = $state(false);
	let linksOpen = $state(false);
	let fullscreen = $state(false);
	let iframeRef = $state<HTMLIFrameElement | null>(null);
	let infoDismissed = $state(false);
	let proxyRecoveryNotice = $state<string | null>(null);
	let recoveryInFlight = $state(false);
	/** Separate from currentUrl — only changes on explicit user navigation, not in-iframe clicks. */
	let iframeSrc = $state('');

	$effect.pre(() => {
		const url = initialUrl || IE_HOME_URL;
		if (
			historyStack.length === 0 &&
			forwardStack.length === 0 &&
			currentUrl === IE_HOME_URL &&
			addressValue === IE_HOME_URL
		) {
			const normalized = normalizeInternetExplorerUrl(url);
			currentUrl = normalized;
			addressValue = normalized;
			if (resolveInternetExplorerRoute(normalized).page === 'external') {
				iframeSrc = proxyUrl(normalized);
			}
		}
	});

	// ── Route resolution ──────────────────────────────────────────────────

	const route = $derived(resolveInternetExplorerRoute(currentUrl));
	const canGoBack = $derived(historyStack.length > 0);
	const canGoForward = $derived(forwardStack.length > 0);

	// ── Navigation ────────────────────────────────────────────────────────

	let loadTimer: ReturnType<typeof setTimeout> | null = null;
	let statusTimer: ReturnType<typeof setTimeout> | null = null;

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
		const resolved = resolveInternetExplorerRoute(url);
		windowManager.updateTitle(windowId, `${resolved.title} - Microsoft Internet Explorer`);
	}

	function closeAllDropdowns() {
		favoritesOpen = false;
		backDropdownOpen = false;
		forwardDropdownOpen = false;
		linksOpen = false;
	}

	function navigate(url: string) {
		url = normalizeInternetExplorerUrl(url);
		historyStack = [...historyStack, currentUrl];
		forwardStack = [];
		infoDismissed = false;
		proxyRecoveryNotice = null;
		recoveryInFlight = false;
		closeAllDropdowns();
		if (resolveInternetExplorerRoute(url).page === 'external') {
			iframeSrc = proxyUrl(url);
		}
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
		proxyRecoveryNotice = null;
		recoveryInFlight = false;
		closeAllDropdowns();
		if (resolveInternetExplorerRoute(prev).page === 'external') {
			iframeSrc = proxyUrl(prev);
		}
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
		proxyRecoveryNotice = null;
		recoveryInFlight = false;
		closeAllDropdowns();
		if (resolveInternetExplorerRoute(next).page === 'external') {
			iframeSrc = proxyUrl(next);
		}
		simulateLoad(next, () => {
			currentUrl = next;
			updateWindowTitle(next);
		});
	}

	function jumpBackTo(index: number) {
		if (index < 0 || index >= historyStack.length) return;
		const target = historyStack[index];
		const skipped = historyStack.slice(index + 1).reverse();
		forwardStack = [...forwardStack, currentUrl, ...skipped];
		historyStack = historyStack.slice(0, index);
		proxyRecoveryNotice = null;
		recoveryInFlight = false;
		closeAllDropdowns();
		if (resolveInternetExplorerRoute(target).page === 'external') {
			iframeSrc = proxyUrl(target);
		}
		simulateLoad(target, () => {
			currentUrl = target;
			updateWindowTitle(target);
		});
	}

	function jumpForwardTo(index: number) {
		if (index < 0 || index >= forwardStack.length) return;
		const target = forwardStack[index];
		const skipped = forwardStack.slice(index + 1).reverse();
		historyStack = [...historyStack, currentUrl, ...skipped];
		forwardStack = forwardStack.slice(0, index);
		proxyRecoveryNotice = null;
		recoveryInFlight = false;
		closeAllDropdowns();
		if (resolveInternetExplorerRoute(target).page === 'external') {
			iframeSrc = proxyUrl(target);
		}
		simulateLoad(target, () => {
			currentUrl = target;
			updateWindowTitle(target);
		});
	}

	function refresh() {
		if (route.page === 'external' && iframeRef) {
			loading = true;
			statusText = `Opening page ${currentUrl}...`;
			proxyRecoveryNotice = null;
			recoveryInFlight = false;
			iframeSrc = '';
			requestAnimationFrame(() => {
				iframeSrc = proxyUrl(currentUrl);
			});
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
		navigate(IE_HOME_URL);
	}

	function onAddressKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			navigate(addressValue);
		}
	}

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

	// ── Toolbar button behaviors ──────────────────────────────────────────

	function toggleFavorites() {
		const next = !favoritesOpen;
		closeAllDropdowns();
		favoritesOpen = next;
	}

	function toggleBackDropdown() {
		if (!canGoBack) return;
		const next = !backDropdownOpen;
		closeAllDropdowns();
		backDropdownOpen = next;
	}

	function toggleForwardDropdown() {
		if (!canGoForward) return;
		const next = !forwardDropdownOpen;
		closeAllDropdowns();
		forwardDropdownOpen = next;
	}

	function toggleLinks() {
		const next = !linksOpen;
		closeAllDropdowns();
		linksOpen = next;
	}

	/** Search opens a new IE window pointed at the MSN start page. */
	function openSearch() {
		windowManager.open('internet-explorer', { url: IE_SEARCH_URL });
	}

	function openChannels() {
		if (statusTimer) clearTimeout(statusTimer);
		statusText = 'Channel Guide unavailable in this build.';
		statusTimer = setTimeout(() => {
			if (statusText.startsWith('Channel Guide')) statusText = 'Done';
			statusTimer = null;
		}, 2500);
	}

	function toggleFullscreen() {
		fullscreen = !fullscreen;
	}

	function openMail() {
		window.open('mailto:caden.calderon03@gmail.com', '_blank', 'noopener');
	}

	function printPage() {
		if (route.page === 'external' && iframeRef?.contentWindow) {
			try {
				iframeRef.contentWindow.focus();
				iframeRef.contentWindow.print();
				return;
			} catch { /* cross-origin — fall back to window.print */ }
		}
		window.print();
	}

	/** Edit button: in IE4 this opened FrontPage Express. We launch Notepad on current URL. */
	function editPage() {
		windowManager.open('notepad', { url: currentUrl });
	}

	function onFavoriteClick(url: string) {
		favoritesOpen = false;
		navigate(url);
	}

	function onLinkClick(url: string) {
		linksOpen = false;
		navigate(url);
	}

	function onIframeLoad() {
		if (route.page === 'external' && iframeRef) {
			const frame = iframeRef;
			const frameState = inspectFrameLocation(
				() => frame.contentWindow?.location.href ?? '',
				window.location.origin,
			);

			if (frameState.kind === 'escaped') {
				recoverEscapedIframe(frameState.reason);
				return;
			}
		}

		recoveryInFlight = false;
		loading = false;
		statusText = 'Done';
	}

	function recoverEscapedIframe(reason: 'cross-origin' | 'same-origin-non-proxy' | 'empty' | 'invalid') {
		if (recoveryInFlight) return;
		recoveryInFlight = true;
		loading = true;
		statusText = 'Recovering escaped navigation...';
		proxyRecoveryNotice =
			reason === 'same-origin-non-proxy'
				? 'This page tried to navigate outside /api/proxy. Restored the last proxied page.'
				: 'This page triggered a direct browser navigation the proxy cannot safely keep embedded. Restored the last proxied page.';

		const recoveryUrl = proxyUrl(currentUrl);
		iframeSrc = '';
		requestAnimationFrame(() => {
			iframeSrc = recoveryUrl;
		});
	}

	function openInNewTab() {
		if (route.page === 'external') {
			window.open(route.params.url, '_blank', 'noopener');
		}
	}

	function onProxyMessage(e: MessageEvent) {
		if (iframeRef && e.source !== iframeRef.contentWindow) return;
		if (e.data?.type === 'ie-nav' && typeof e.data.url === 'string') {
			const realUrl = e.data.url;
			if (!realUrl.startsWith('http://') && !realUrl.startsWith('https://')) return;
			if (realUrl !== currentUrl) {
				historyStack = [...historyStack, currentUrl];
				forwardStack = [];
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
		return () => {
			if (loadTimer) clearTimeout(loadTimer);
			if (statusTimer) clearTimeout(statusTimer);
			window.removeEventListener('message', onProxyMessage);
		};
	});

	// ── Toolbar arrow icons (SVG — not in Win98 icon pack) ────────────────
	//
	// Flat, chunky, IE4-faithful: single solid fill with a thin black outline.
	// No gradients, no highlights — the reference icons are that simple.

	function svg(body: string, size = 32): string {
		return `data:image/svg+xml,${encodeURIComponent(
			`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">${body}</svg>`,
		)}`;
	}

	const ICO_BACK = svg(`
		<path d="M3 16 L13 7 L13 12 L27 12 L27 20 L13 20 L13 25 Z"
		      fill="#3063b8" stroke="#0a2050" stroke-width="1" stroke-linejoin="miter"/>
	`);
	const ICO_FORWARD = svg(`
		<path d="M29 16 L19 7 L19 12 L5 12 L5 20 L19 20 L19 25 Z"
		      fill="#3063b8" stroke="#0a2050" stroke-width="1" stroke-linejoin="miter"/>
	`);

	const ICO_STOP = svg(`
		<circle cx="16" cy="16" r="12" fill="#d81020" stroke="#500000" stroke-width="1"/>
		<path d="M10 10 L22 22 M22 10 L10 22" stroke="#ffffff" stroke-width="3" stroke-linecap="square"/>
	`);

	// Simple clockwise circular refresh arrow, blue to match Back/Forward.
	// Body: arc sweeping ~270°. Head: triangle flag pointing down-right at top end.
	const ICO_REFRESH = svg(`
		<path d="M 16 4 A 12 12 0 1 1 4 16" fill="none" stroke="#3063b8" stroke-width="4" stroke-linecap="butt"/>
		<path d="M 12 1 L 20 4 L 16 11 Z" fill="#3063b8" stroke="#0a2050" stroke-width="1" stroke-linejoin="miter"/>
	`);

	const ICO_DROPDOWN = svg(`<path d="M1 3 L9 3 L5 8 Z" fill="#000"/>`, 10);

	const ICO_PAGE = svg(`
		<rect x="4" y="2" width="10" height="14" fill="#fff" stroke="#808080" stroke-width="1"/>
		<path d="M11 2v4h4" fill="#c0c0c0" stroke="#808080" stroke-width="1"/>
		<line x1="6" y1="8" x2="12" y2="8" stroke="#000080" stroke-width="1"/>
		<line x1="6" y1="10" x2="12" y2="10" stroke="#000080" stroke-width="1"/>
		<line x1="6" y1="12" x2="10" y2="12" stroke="#000080" stroke-width="1"/>
	`);
	const ICO_GLOBE = svg(`
		<circle cx="10" cy="10" r="8" fill="#3a6ea5"/>
		<ellipse cx="10" cy="10" rx="4" ry="8" fill="none" stroke="#6aa0d0" stroke-width="0.8"/>
		<line x1="2" y1="7" x2="18" y2="7" stroke="#6aa0d0" stroke-width="0.8"/>
		<line x1="2" y1="13" x2="18" y2="13" stroke="#6aa0d0" stroke-width="0.8"/>
		<line x1="10" y1="2" x2="10" y2="18" stroke="#6aa0d0" stroke-width="0.8"/>
	`, 20);

	const backHistoryList = $derived(historyStack.slice().reverse().slice(0, 10));
	const forwardHistoryList = $derived(forwardStack.slice().reverse().slice(0, 10));
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="ie-shell" class:fullscreen>
	<!-- ── Row 1: Menu bar + black corner with "e" logo ─────────────────── -->
	<div class="ie-menubar-row">
		<div class="ie-rebar ie-rebar-menu">
			<div class="ie-gripper"></div>
			<div class="ie-menubar">
				<span class="ie-menu-item"><span class="ie-acc">F</span>ile</span>
				<span class="ie-menu-item"><span class="ie-acc">E</span>dit</span>
				<span class="ie-menu-item"><span class="ie-acc">V</span>iew</span>
				<span class="ie-menu-item"><span class="ie-acc">G</span>o</span>
				<span class="ie-menu-item">F<span class="ie-acc">a</span>vorites</span>
				<span class="ie-menu-item"><span class="ie-acc">H</span>elp</span>
			</div>
		</div>
		<div class="ie-corner-logo" class:spin={loading} aria-hidden="true">
			<img src="{ICON_BASE}/ie-logo.png" alt="" width="32" height="32" draggable="false" />
		</div>
	</div>

	<!-- ── Row 2: Toolbar — rebar bands, icon-above-label ─────────────── -->
	<div class="ie-toolbar-row">
		<!-- Back (standalone band, with dropdown) -->
		<div class="ie-rebar">
			<div class="ie-gripper"></div>
			<div class="ie-btn-combo" class:open={backDropdownOpen}>
				<button
					class="ie-cool-btn"
					disabled={!canGoBack}
					onclick={goBack}
					title={canGoBack ? `Back (${shortUrl(historyStack.at(-1)!)})` : 'Back'}
				>
					<img src={ICO_BACK} alt="" width="32" height="32" draggable="false" />
					<span class="ie-btn-label">Back</span>
				</button>
				<button
					class="ie-cool-btn-arrow"
					disabled={!canGoBack}
					onclick={toggleBackDropdown}
					aria-label="Back history"
				>
					<img src={ICO_DROPDOWN} alt="" width="10" height="10" draggable="false" />
				</button>
				{#if backDropdownOpen && canGoBack}
					<button
						class="ie-dropdown-backdrop"
						onclick={() => (backDropdownOpen = false)}
						aria-label="Close back history"
					></button>
					<div class="ie-history-dropdown">
						{#each backHistoryList as u, i}
							<button class="ie-history-item" onclick={() => jumpBackTo(historyStack.length - 1 - i)}>
								<img src={ICO_PAGE} alt="" width="14" height="14" draggable="false" />
								<span>{shortUrl(u)}</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Forward / Stop / Refresh / Home -->
		<div class="ie-rebar">
			<div class="ie-gripper"></div>
			<div class="ie-btn-combo" class:open={forwardDropdownOpen}>
				<button
					class="ie-cool-btn"
					disabled={!canGoForward}
					onclick={goForward}
					title="Forward"
				>
					<img src={ICO_FORWARD} alt="" width="32" height="32" draggable="false" />
					<span class="ie-btn-label">Forward</span>
				</button>
				<button
					class="ie-cool-btn-arrow"
					disabled={!canGoForward}
					onclick={toggleForwardDropdown}
					aria-label="Forward history"
				>
					<img src={ICO_DROPDOWN} alt="" width="10" height="10" draggable="false" />
				</button>
				{#if forwardDropdownOpen && canGoForward}
					<button
						class="ie-dropdown-backdrop"
						onclick={() => (forwardDropdownOpen = false)}
						aria-label="Close forward history"
					></button>
					<div class="ie-history-dropdown">
						{#each forwardHistoryList as u, i}
							<button class="ie-history-item" onclick={() => jumpForwardTo(forwardStack.length - 1 - i)}>
								<img src={ICO_PAGE} alt="" width="14" height="14" draggable="false" />
								<span>{shortUrl(u)}</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>
			<button class="ie-cool-btn" onclick={stop} disabled={!loading} title="Stop">
				<img src={ICO_STOP} alt="" width="32" height="32" draggable="false" />
				<span class="ie-btn-label">Stop</span>
			</button>
			<button class="ie-cool-btn" onclick={refresh} title="Refresh">
				<img src={ICO_REFRESH} alt="" width="32" height="32" draggable="false" />
				<span class="ie-btn-label">Refresh</span>
			</button>
			<button class="ie-cool-btn" onclick={goHome} title="Home">
				<img src="{ICON_BASE}/home.png" alt="" width="32" height="32" draggable="false" class="pixel" />
				<span class="ie-btn-label">Home</span>
			</button>
		</div>

		<!-- Search / Favorites / History / Channels -->
		<div class="ie-rebar">
			<div class="ie-gripper"></div>
			<button class="ie-cool-btn" onclick={openSearch} title="Search">
				<img src="{ICON_BASE}/search.png" alt="" width="32" height="32" draggable="false" class="pixel" />
				<span class="ie-btn-label">Search</span>
			</button>
			<div class="ie-btn-combo" class:open={favoritesOpen}>
				<button class="ie-cool-btn" onclick={toggleFavorites} title="Favorites">
					<img src="{ICON_BASE}/favorites.png" alt="" width="32" height="32" draggable="false" class="pixel" />
					<span class="ie-btn-label">Favorites</span>
				</button>
				{#if favoritesOpen}
					<button
						class="ie-dropdown-backdrop"
						onclick={() => (favoritesOpen = false)}
						aria-label="Close favorites"
					></button>
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
			<button
				class="ie-cool-btn"
				disabled={historyStack.length === 0 && forwardStack.length === 0}
				onclick={toggleBackDropdown}
				title="History"
			>
				<img src="{ICON_BASE}/history.png" alt="" width="32" height="32" draggable="false" class="pixel" />
				<span class="ie-btn-label">History</span>
			</button>
			<button class="ie-cool-btn" onclick={openChannels} title="Channels">
				<img src="{ICON_BASE}/channels.png" alt="" width="32" height="32" draggable="false" class="pixel" />
				<span class="ie-btn-label">Channels</span>
			</button>
		</div>

		<!-- Fullscreen / Mail / Print / Edit -->
		<div class="ie-rebar">
			<div class="ie-gripper"></div>
			<button class="ie-cool-btn" onclick={toggleFullscreen} title="Fullscreen">
				<img src="{ICON_BASE}/fullscreen.png" alt="" width="32" height="32" draggable="false" class="pixel" />
				<span class="ie-btn-label">Fullscreen</span>
			</button>
			<button class="ie-cool-btn" onclick={openMail} title="Mail">
				<img src="{ICON_BASE}/mail.png" alt="" width="32" height="32" draggable="false" class="pixel" />
				<span class="ie-btn-label">Mail</span>
			</button>
			<button class="ie-cool-btn" onclick={printPage} title="Print">
				<img src="{ICON_BASE}/print.png" alt="" width="32" height="32" draggable="false" class="pixel" />
				<span class="ie-btn-label">Print</span>
			</button>
			<button class="ie-cool-btn" onclick={editPage} title="Edit">
				<img src="{ICON_BASE}/edit.png" alt="" width="32" height="32" draggable="false" class="pixel" />
				<span class="ie-btn-label">Edit</span>
			</button>
		</div>
	</div>

	<!-- ── Row 3: Address bar rebar + Links rebar (same row) ───────────── -->
	<div class="ie-addressbar-row">
		<div class="ie-rebar ie-rebar-address">
			<div class="ie-gripper"></div>
			<span class="ie-address-label"><span class="ie-acc">A</span>ddress</span>
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
				<button class="ie-address-dropdown" aria-label="Address history" disabled>
					<img src={ICO_DROPDOWN} alt="" width="10" height="10" draggable="false" />
				</button>
			</div>
		</div>
		<div class="ie-rebar ie-rebar-links">
			<div class="ie-gripper"></div>
			<button class="ie-links-tab" onclick={toggleLinks} title="Links">Links</button>
			{#if linksOpen}
				<button
					class="ie-dropdown-backdrop"
					onclick={() => (linksOpen = false)}
					aria-label="Close links"
				></button>
				<div class="ie-links-dropdown">
					{#each LINKS as link}
						<button class="ie-fav-item" onclick={() => onLinkClick(link.url)}>
							<img src={ICO_GLOBE} alt="" width="14" height="14" draggable="false" />
							{link.label}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- ── Content area ────────────────────────────────────────────────── -->
	{#if route.page === 'external'}
		{#if proxyRecoveryNotice}
			<div class="ie-recovery-info">
				<span>{proxyRecoveryNotice}</span>
				<button class="ie-info-close" onclick={() => (proxyRecoveryNotice = null)}>&times;</button>
			</div>
		{/if}
		{#if !infoDismissed}
			<div class="ie-external-info">
				<span>&#127760; <b>{extractDomain(route.params.url)}</b></span>
				<div class="ie-info-actions">
					<button class="ie-newtab-btn" onclick={openInNewTab}>Open in new tab &#8599;</button>
					<button class="ie-info-close" onclick={() => (infoDismissed = true)}>&times;</button>
				</div>
			</div>
		{/if}
		<iframe
			bind:this={iframeRef}
			src={iframeSrc}
			class="ie-iframe"
			title="Web page"
			onload={onIframeLoad}
		></iframe>
	{:else}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="ie-content" onclick={handleContentClick}>
			{#if route.page === 'home'}
				<HomePage {launchApp} />
			{:else if route.page === 'projects'}
				<ProjectList />
			{:else if route.page === 'project-detail'}
				<ProjectDetail slug={route.params.slug} {launchApp} />
			{:else if route.page === 'about'}
				<AboutPage />
			{:else if route.page === 'search'}
				<SearchStartPage onNavigate={navigate} />
			{:else}
				<ErrorPage url={route.params.url || currentUrl} />
			{/if}
		</div>
	{/if}

	<!-- ── Status bar ──────────────────────────────────────────────────── -->
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
		font-family: 'Pixelated MS Sans Serif', 'MS Sans Serif', 'Microsoft Sans Serif', Arial, sans-serif;
		font-size: 11px;
		color: #000;
	}

	/* Pixelated PNG rendering — keep Win98 icons crisp */
	img.pixel {
		image-rendering: pixelated;
		image-rendering: -moz-crisp-edges;
		image-rendering: crisp-edges;
	}

	/* ═══════════════════════════════════════════════════════════════════════
	   Rebar bands — raised 3D panels with a dotted "gripper" on the left.
	   Every toolbar section sits in one of these. Real IE4 lets the user
	   drag them around; we just render the static visual.
	   ═══════════════════════════════════════════════════════════════════ */

	.ie-rebar {
		position: relative;
		display: flex;
		align-items: stretch;
		padding: 0;
		background: #c0c0c0;
		/* Raised 3D look: white highlight on top+left, gray shadow on bottom+right. */
		box-shadow:
			inset 1px 1px 0 #ffffff,
			inset -1px -1px 0 #808080;
		flex-shrink: 0;
	}

	/* Vertical dotted gripper on the left edge of every rebar band. */
	.ie-gripper {
		flex-shrink: 0;
		width: 4px;
		margin: 2px 3px 2px 2px;
		background:
			linear-gradient(to bottom,
				#ffffff 0, #ffffff 1px,
				transparent 1px, transparent 2px,
				#808080 2px, #808080 3px,
				transparent 3px, transparent 4px) 0 0 / 4px 4px;
		box-shadow: inset 1px 0 0 #ffffff;
	}

	/* ═══════════════════════════════════════════════════════════════════════
	   Row 1: Menu bar + black corner logo
	   ═══════════════════════════════════════════════════════════════════ */

	.ie-menubar-row {
		display: flex;
		align-items: stretch;
		flex-shrink: 0;
		background: #c0c0c0;
	}

	.ie-rebar-menu {
		flex: 1;
		min-width: 0;
	}

	.ie-menubar {
		display: flex;
		align-items: center;
		padding: 1px 2px;
		flex: 1;
		min-width: 0;
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

	.ie-menu-item:hover .ie-acc {
		color: #fff;
	}

	.ie-acc {
		text-decoration: underline;
	}

	/* Black corner box with the "e" logo — fills the right side of the menu row. */
	.ie-corner-logo {
		width: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		background: #000000;
		box-shadow:
			inset 1px 1px 0 #808080,
			inset -1px -1px 0 #000000;
	}

	.ie-corner-logo img {
		image-rendering: pixelated;
		image-rendering: -moz-crisp-edges;
		image-rendering: crisp-edges;
		filter: grayscale(0.3);
	}

	.ie-corner-logo.spin img {
		animation: ie-spin 1.2s linear infinite;
		filter: none;
	}

	@keyframes ie-spin {
		0%   { transform: rotate(0deg) scale(1); }
		50%  { transform: rotate(12deg) scale(0.92); }
		100% { transform: rotate(0deg) scale(1); }
	}

	/* ═══════════════════════════════════════════════════════════════════════
	   Row 2: Toolbar
	   ═══════════════════════════════════════════════════════════════════ */

	.ie-toolbar-row {
		display: flex;
		align-items: stretch;
		flex-shrink: 0;
		background: #c0c0c0;
		min-height: 46px;
	}

	/* ── Cool buttons (icon above label) ──────────────────────────────── */

	.ie-cool-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1px;
		min-width: 54px;
		padding: 2px 4px 1px;
		background: transparent;
		border: 1px solid transparent;
		box-shadow: none;
		cursor: default;
		color: #000;
		text-shadow: none;
		min-height: unset;
		font-family: inherit;
		font-size: 11px;
		line-height: 1;
	}

	.ie-cool-btn img {
		pointer-events: none;
		flex-shrink: 0;
		/* Grayscale by default — full color on hover. Applied to both PNG
		   and SVG icons so the styling is uniform. */
		filter: grayscale(1) contrast(0.85) opacity(0.95);
		transition: filter 80ms linear;
	}

	.ie-cool-btn:not(:disabled):hover img,
	.ie-cool-btn:not(:disabled):active img,
	.ie-btn-combo.open .ie-cool-btn img {
		filter: none;
	}

	.ie-btn-label {
		font-size: 11px;
		white-space: nowrap;
		margin-top: 1px;
	}

	.ie-cool-btn:not(:disabled):hover {
		border: 1px solid;
		border-color: #ffffff #808080 #808080 #ffffff;
	}

	.ie-cool-btn:not(:disabled):active {
		border: 1px solid;
		border-color: #808080 #ffffff #ffffff #808080;
		padding: 3px 3px 0 5px;
	}

	.ie-cool-btn:disabled {
		color: #808080;
		text-shadow: 1px 1px 0 #ffffff;
	}

	.ie-cool-btn:disabled img {
		opacity: 0.45;
	}

	/* ── Combo button: main button + dropdown arrow ───────────────────── */

	.ie-btn-combo {
		position: relative;
		display: flex;
		align-items: stretch;
	}

	.ie-cool-btn-arrow {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 12px;
		padding: 0;
		margin-left: -2px;
		background: transparent;
		border: 1px solid transparent;
		box-shadow: none;
		cursor: default;
		min-width: unset;
		min-height: unset;
	}

	.ie-cool-btn-arrow:not(:disabled):hover,
	.ie-btn-combo.open .ie-cool-btn-arrow {
		border: 1px solid;
		border-color: #ffffff #808080 #808080 #ffffff;
	}

	.ie-btn-combo.open .ie-cool-btn-arrow {
		border-color: #808080 #ffffff #ffffff #808080;
	}

	.ie-cool-btn-arrow:disabled {
		opacity: 0.4;
	}

	.ie-cool-btn-arrow img {
		pointer-events: none;
	}

	/* ── Dropdown backdrop / list ─────────────────────────────────────── */

	.ie-dropdown-backdrop {
		position: fixed;
		inset: 0;
		z-index: 99;
		background: transparent;
		border: none;
		box-shadow: none;
		padding: 0;
		margin: 0;
		min-width: 0;
		min-height: 0;
		appearance: none;
		outline: none;
	}

	.ie-history-dropdown,
	.ie-favorites-dropdown,
	.ie-links-dropdown {
		position: absolute;
		top: 100%;
		left: -2px;
		z-index: 100;
		background: #c0c0c0;
		border: 1px solid #000;
		box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
		min-width: 220px;
		padding: 1px;
	}

	.ie-links-dropdown {
		right: 0;
		left: auto;
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

	.ie-fav-item,
	.ie-history-item {
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

	.ie-fav-item:hover,
	.ie-history-item:hover {
		background: #000080;
		color: #fff;
	}

	.ie-fav-item img,
	.ie-history-item img {
		flex-shrink: 0;
		pointer-events: none;
	}

	.ie-history-item span {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* ═══════════════════════════════════════════════════════════════════════
	   Row 3: Address bar + Links — same row, two rebar bands
	   ═══════════════════════════════════════════════════════════════════ */

	.ie-addressbar-row {
		display: flex;
		align-items: stretch;
		flex-shrink: 0;
	}

	.ie-rebar-address {
		flex: 1;
		min-width: 0;
		align-items: center;
		padding: 2px 4px 2px 0;
		gap: 4px;
	}

	.ie-address-label {
		font-weight: bold;
		white-space: nowrap;
		padding: 0 4px 0 0;
	}

	.ie-address-field {
		flex: 1;
		display: flex;
		align-items: center;
		background: #fff;
		box-shadow: inset -1px -1px #fff, inset 1px 1px #808080,
		            inset -2px -2px #dfdfdf, inset 2px 2px #0a0a0a;
		padding: 1px 0 1px 2px;
	}

	.ie-address-icon {
		flex-shrink: 0;
		margin-right: 2px;
	}

	.ie-address-input {
		flex: 1;
		min-width: 0;
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

	.ie-address-dropdown {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 17px;
		height: 18px;
		margin: 0;
		padding: 0;
		background: #c0c0c0;
		border: 1px solid;
		border-color: #ffffff #808080 #808080 #ffffff;
		box-shadow: inset -1px -1px #808080, inset 1px 1px #ffffff;
		cursor: default;
		min-width: unset;
		min-height: unset;
	}

	.ie-address-dropdown img {
		pointer-events: none;
	}

	/* Links rebar sits to the right, sized to match the Address label. */
	.ie-rebar-links {
		flex-shrink: 0;
		align-items: center;
		padding: 2px 4px 2px 0;
	}

	.ie-links-tab {
		padding: 0 12px;
		background: transparent;
		border: none;
		box-shadow: none;
		font-family: inherit;
		font-size: 11px;
		font-weight: bold;
		cursor: default;
		color: #000;
		text-shadow: none;
		min-width: unset;
		min-height: unset;
		height: 18px;
	}

	.ie-links-tab:hover {
		background: rgba(0, 0, 0, 0.05);
	}

	/* ═══════════════════════════════════════════════════════════════════════
	   Fullscreen mode — hide menu + address
	   ═══════════════════════════════════════════════════════════════════ */

	.ie-shell.fullscreen .ie-menubar-row,
	.ie-shell.fullscreen .ie-addressbar-row {
		display: none;
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

	.ie-recovery-info {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 2px 8px;
		background: linear-gradient(180deg, #fff4d8 0%, #ebddba 100%);
		border-bottom: 1px solid #b9a97e;
		font-size: 10px;
		color: #4a3f1f;
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
