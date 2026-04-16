<!--
  IE4 "The page cannot be displayed" error page.
  Matches the real IE error page layout and copy.
-->
<script lang="ts">
	let { url = '' }: { url?: string } = $props();
</script>

<div class="error-page">
	<h1>The page cannot be displayed</h1>

	<p>The page you are looking for is currently unavailable. The Web site might be experiencing technical difficulties, or you may need to adjust your browser settings.</p>

	<hr />

	<p>Please try the following:</p>

	<ul>
		<li>Click the <img src="data:image/svg+xml,{encodeURIComponent('<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 16 16\'><path d=\'M8 2a6 6 0 1 0 6 6h-2a4 4 0 1 1-4-4V0l4 3-4 3V4\' fill=\'%233a6ea5\'/></svg>')}" alt="Refresh" width="14" height="14" style="vertical-align: text-bottom;" /> <b>Refresh</b> button, or try again later.</li>
		<li>If you typed the page address in the Address bar, make sure that it is spelled correctly.</li>
		<li>To check your connection settings, click the <b>Tools</b> menu, and then click <b>Internet Options</b>. On the <b>Connections</b> tab, click <b>Settings</b>.</li>
	</ul>

	{#if url}
		<hr />
		<p class="error-detail">Cannot find server or DNS Error<br /><span class="error-url">{url}</span></p>
	{/if}

	<hr />

	<p class="footer">Internet Explorer</p>
</div>

<style>
	.error-page {
		padding: 20px 28px;
		font-family: 'Pixelated MS Sans Serif', Arial, sans-serif;
		font-size: 11px;
		line-height: 1.6;
		color: #000;
	}

	h1 {
		font-size: 16px;
		font-weight: normal;
		color: #000;
		margin: 0 0 12px;
	}

	hr {
		border: none;
		border-top: 1px solid #c0c0c0;
		margin: 12px 0;
	}

	ul {
		margin: 4px 0 4px 24px;
		padding: 0;
	}

	li {
		margin-bottom: 4px;
	}

	.error-detail {
		color: #808080;
	}

	.error-url {
		word-break: break-all;
	}

	.footer {
		color: #808080;
		font-style: italic;
	}
</style>
