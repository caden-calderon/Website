<!--
  MSN-era start page rendered when Search opens a new IE window, or at
  chromatic.dev/search. Visual tone: late-90s home.microsoft.com — blue
  header band, big search field, category chips, day-one link directory.
-->
<script lang="ts">
	import { onMount } from 'svelte';

	let {
		onNavigate,
	}: {
		onNavigate?: (url: string) => void;
	} = $props();

	let q = $state('');
	let today = $state('');

	onMount(() => {
		today = new Intl.DateTimeFormat(undefined, {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			year: 'numeric',
		}).format(new Date());
	});

	function submit(e: Event) {
		e.preventDefault();
		const term = q.trim();
		if (!term) return;
		const url = `https://www.google.com/search?q=${encodeURIComponent(term)}`;
		onNavigate?.(url);
	}
</script>

<div class="msn">
	<div class="msn-top">
		<div class="msn-logo">
			<span class="msn-m">m</span><span class="msn-s">s</span><span class="msn-n">n</span>
			<span class="msn-sub">Microsoft Network</span>
		</div>
		{#if today}
			<div class="msn-date">{today}</div>
		{/if}
	</div>

	<form class="msn-search" onsubmit={submit}>
		<label for="msn-q" class="msn-search-label">Search the web:</label>
		<input
			id="msn-q"
			type="text"
			class="msn-search-input"
			bind:value={q}
			autocomplete="off"
			spellcheck="false"
			placeholder="Type a word or phrase"
		/>
		<button type="submit" class="msn-search-btn">Search</button>
	</form>

	<div class="msn-grid">
		<section class="msn-col">
			<h3>News &amp; Weather</h3>
			<ul>
				<li><a href="https://en.wikipedia.org/wiki/Portal:Current_events">Headlines</a></li>
				<li><a href="https://en.wikipedia.org/wiki/Weather">Weather</a></li>
				<li><a href="https://en.wikipedia.org/wiki/Sports">Sports</a></li>
			</ul>
		</section>

		<section class="msn-col">
			<h3>Shopping</h3>
			<ul>
				<li><a href="/projects">Featured Projects</a></li>
				<li><a href="/projects/axial">Axial</a></li>
				<li><a href="/projects/chess">Chess</a></li>
			</ul>
		</section>

		<section class="msn-col">
			<h3>Directory</h3>
			<ul>
				<li><a href="https://en.wikipedia.org/">Wikipedia</a></li>
				<li><a href="https://news.ycombinator.com/">Hacker News</a></li>
				<li><a href="https://web.archive.org/">Wayback Machine</a></li>
				<li><a href="http://www.csszengarden.com/">CSS Zen Garden</a></li>
			</ul>
		</section>

		<section class="msn-col">
			<h3>Channels</h3>
			<ul>
				<li><a href="/projects/aperture">Aperture</a></li>
				<li><a href="/projects/argus">Argus</a></li>
				<li><a href="/projects/chromatic">Chromatic</a></li>
				<li><a href="/about">About</a></li>
			</ul>
		</section>
	</div>

	<div class="msn-foot">
		<a href="/">Customize this page</a>
		&nbsp;·&nbsp;
		<a href="/about">About MSN</a>
		&nbsp;·&nbsp;
		<a href="/">Make MSN my home page</a>
	</div>
</div>

<style>
	.msn {
		font-family: 'Pixelated MS Sans Serif', 'MS Sans Serif', Arial, sans-serif;
		font-size: 12px;
		color: #000;
		background: #ffffff;
		min-height: 100%;
		padding: 0;
	}

	.msn-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 18px 10px;
		background: linear-gradient(180deg, #4e79be 0%, #2e4e99 100%);
		color: #fff;
		border-bottom: 2px solid #1a3978;
	}

	.msn-logo {
		display: flex;
		align-items: baseline;
		gap: 6px;
		font-family: 'Trebuchet MS', Verdana, Arial, sans-serif;
		font-weight: bold;
	}

	.msn-m { color: #ffdd44; font-size: 32px; }
	.msn-s { color: #ff8040; font-size: 32px; }
	.msn-n { color: #66aaff; font-size: 32px; }

	.msn-sub {
		font-family: Arial, sans-serif;
		font-weight: normal;
		font-size: 11px;
		color: #e8e8ff;
		margin-left: 8px;
	}

	.msn-date {
		font-family: Arial, sans-serif;
		font-size: 11px;
		color: #ddeeff;
	}

	.msn-search {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 14px 18px;
		background: #e8ecf2;
		border-bottom: 1px solid #b8c4d4;
	}

	.msn-search-label {
		font-weight: bold;
		color: #1a3978;
	}

	.msn-search-input {
		flex: 1;
		max-width: 420px;
		background: #fff;
		box-shadow: inset -1px -1px #fff, inset 1px 1px #808080,
		            inset -2px -2px #dfdfdf, inset 2px 2px #0a0a0a;
		border: none;
		padding: 3px 5px;
		font-family: inherit;
		font-size: 12px;
		height: 20px;
	}

	.msn-search-btn {
		background: linear-gradient(180deg, #f0f0f0 0%, #c8c8c8 100%);
		border: 1px solid #1a3978;
		color: #000;
		padding: 3px 16px;
		font-family: inherit;
		font-size: 11px;
		font-weight: bold;
		cursor: pointer;
		min-width: unset;
		min-height: unset;
		box-shadow: none;
		text-shadow: none;
	}

	.msn-search-btn:hover {
		background: linear-gradient(180deg, #ffffff 0%, #d8d8d8 100%);
	}

	.msn-search-btn:active {
		background: linear-gradient(180deg, #b8b8b8 0%, #d8d8d8 100%);
	}

	.msn-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 12px;
		padding: 16px 18px;
	}

	.msn-col h3 {
		font-family: Arial, sans-serif;
		font-size: 12px;
		font-weight: bold;
		color: #1a3978;
		margin: 0 0 4px;
		padding-bottom: 2px;
		border-bottom: 1px solid #b8c4d4;
	}

	.msn-col ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.msn-col li {
		margin: 2px 0;
	}

	.msn-col a {
		color: #1a3978;
		text-decoration: none;
		font-size: 11px;
	}

	.msn-col a:hover {
		text-decoration: underline;
		color: #d01010;
	}

	.msn-foot {
		padding: 10px 18px;
		background: #e8ecf2;
		border-top: 1px solid #b8c4d4;
		font-size: 11px;
		color: #1a3978;
		text-align: center;
	}

	.msn-foot a {
		color: #1a3978;
		text-decoration: none;
	}

	.msn-foot a:hover {
		text-decoration: underline;
	}
</style>
