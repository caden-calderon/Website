<script lang="ts">
	import type { AppId } from '$lib/os/types.js';
	import AboutPage from '$lib/portfolio/AboutPage.svelte';
	import ErrorPage from '$lib/portfolio/ErrorPage.svelte';
	import HomePage from '$lib/portfolio/HomePage.svelte';
	import PlaceholderPage from '$lib/portfolio/PlaceholderPage.svelte';
	import ProjectDetail from '$lib/portfolio/ProjectDetail.svelte';
	import ProjectList from '$lib/portfolio/ProjectList.svelte';
	import SearchStartPage from '$lib/portfolio/SearchStartPage.svelte';
	import type { InternetExplorerRoute } from './internetExplorerNavigation.js';

	let {
		route,
		currentUrl,
		navigate,
		launchApp,
	}: {
		route: InternetExplorerRoute;
		currentUrl: string;
		navigate: (url: string) => void;
		launchApp?: (id: AppId) => void;
	} = $props();

	function handleContentClick(e: MouseEvent) {
		const anchor = (e.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null;
		if (!anchor) return;
		const href = anchor.getAttribute('href');
		if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
		e.preventDefault();
		navigate(href);
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
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
	{:else if route.page === 'placeholder'}
		<PlaceholderPage
			section={route.params.section ?? 'Coming Soon'}
			status={route.params.status ?? 'This portfolio route is reserved for future content'}
		/>
	{:else}
		<ErrorPage url={route.params.url || currentUrl} />
	{/if}
</div>
