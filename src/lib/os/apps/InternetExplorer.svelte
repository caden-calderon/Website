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
	import './InternetExplorer.css';
	import { onMount } from 'svelte';
	import { windowManager } from '$lib/os/windowManager.svelte.js';
	import type { AppId } from '$lib/os/types.js';
	import { inspectFrameLocation } from './internetExplorerFrame.js';
	import {
		FAVORITES,
		ICO_BACK,
		ICO_CHANNELS,
		ICO_DROPDOWN,
		ICO_EDIT,
		ICO_FAVORITES,
		ICO_FORWARD,
		ICO_FULLSCREEN,
		ICO_GLOBE,
		ICO_HISTORY,
		ICO_HOME,
		ICO_IE_LOGO,
		ICO_MAIL,
		ICO_PAGE,
		ICO_PRINT,
		ICO_REFRESH,
		ICO_SEARCH,
		ICO_STOP,
		LINKS,
	} from './internetExplorerChrome.js';
	import {
		IE_HOME_URL,
		IE_SEARCH_URL,
		extractDomain,
		normalizeInternetExplorerUrl,
		proxyUrl,
		resolveInternetExplorerRoute,
		shortUrl,
	} from './internetExplorerNavigation.js';
	import InternetExplorerContent from './InternetExplorerContent.svelte';

	let {
		windowId = '',
		url: initialUrl = '',
	}: {
		windowId?: string;
		appId?: string;
		title?: string;
		url?: string;
	} = $props();

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
			<img src={ICO_IE_LOGO} alt="" width="32" height="32" draggable="false" />
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
				<img src={ICO_HOME} alt="" width="32" height="32" draggable="false" class="pixel" />
				<span class="ie-btn-label">Home</span>
			</button>
		</div>

		<!-- Search / Favorites / History / Channels -->
		<div class="ie-rebar">
			<div class="ie-gripper"></div>
			<button class="ie-cool-btn" onclick={openSearch} title="Search">
				<img src={ICO_SEARCH} alt="" width="32" height="32" draggable="false" class="pixel" />
				<span class="ie-btn-label">Search</span>
			</button>
			<div class="ie-btn-combo" class:open={favoritesOpen}>
				<button class="ie-cool-btn" onclick={toggleFavorites} title="Favorites">
					<img src={ICO_FAVORITES} alt="" width="32" height="32" draggable="false" class="pixel" />
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
				<img src={ICO_HISTORY} alt="" width="32" height="32" draggable="false" class="pixel" />
				<span class="ie-btn-label">History</span>
			</button>
			<button class="ie-cool-btn" onclick={openChannels} title="Channels">
				<img src={ICO_CHANNELS} alt="" width="32" height="32" draggable="false" class="pixel" />
				<span class="ie-btn-label">Channels</span>
			</button>
		</div>

		<!-- Fullscreen / Mail / Print / Edit -->
		<div class="ie-rebar">
			<div class="ie-gripper"></div>
			<button class="ie-cool-btn" onclick={toggleFullscreen} title="Fullscreen">
				<img src={ICO_FULLSCREEN} alt="" width="32" height="32" draggable="false" class="pixel" />
				<span class="ie-btn-label">Fullscreen</span>
			</button>
			<button class="ie-cool-btn" onclick={openMail} title="Mail">
				<img src={ICO_MAIL} alt="" width="32" height="32" draggable="false" class="pixel" />
				<span class="ie-btn-label">Mail</span>
			</button>
			<button class="ie-cool-btn" onclick={printPage} title="Print">
				<img src={ICO_PRINT} alt="" width="32" height="32" draggable="false" class="pixel" />
				<span class="ie-btn-label">Print</span>
			</button>
			<button class="ie-cool-btn" onclick={editPage} title="Edit">
				<img src={ICO_EDIT} alt="" width="32" height="32" draggable="false" class="pixel" />
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
		<InternetExplorerContent {route} {currentUrl} {navigate} {launchApp} />
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
