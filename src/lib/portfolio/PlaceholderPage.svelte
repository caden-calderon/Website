<script lang="ts">
	let {
		section,
		status,
	}: {
		section: string;
		status: string;
	} = $props();
</script>

<div class="page">
	<div class="page-header">
		<p class="eyebrow">Chromatic Internet Zone</p>
		<h1>{section}</h1>
		<p>{status}</p>
	</div>

	<div class="content">
		<div class="notice">
			<strong>Under construction</strong>
			<p>This route is reserved in the portfolio map so future content can land without changing the browser shell.</p>
			<a href="/">&larr; Back to Home</a>
		</div>
	</div>
</div>

<style>
	.page {
		min-height: 100%;
		font-family: 'Pixelated MS Sans Serif', Arial, sans-serif;
		font-size: 11px;
		line-height: 1.5;
		color: #000;
		background: #eef2f7;
	}

	.page-header {
		padding: 12px 16px;
		border-bottom: 1px solid #c0cdd8;
		background: #fff;
	}

	.eyebrow {
		margin: 0 0 3px;
		color: #606060;
		text-transform: uppercase;
		letter-spacing: 0;
	}

	h1 {
		margin: 0 0 2px;
		color: #1a3a66;
		font-size: 16px;
	}

	.page-header p {
		margin: 0;
	}

	.content {
		padding: 12px;
	}

	.notice {
		max-width: 360px;
		padding: 10px;
		border: 1px solid #a0b4cc;
		background: #fff;
	}

	.notice p {
		margin: 6px 0 10px;
	}

	a {
		color: #0044cc;
		text-decoration: none;
	}

	a:hover {
		color: #cc0000;
		text-decoration: underline;
	}
</style>
