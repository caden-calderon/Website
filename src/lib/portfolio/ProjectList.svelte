<!--
  Project listing page for http://chromatic.dev/projects
  Table with gradient header, alternating rows, type badges.
-->
<script lang="ts">
	import { projects } from './projects.js';
</script>

<div class="page">
	<div class="page-header">
		<h1>Projects</h1>
		<p>Software I've built — from game engines to computer vision pipelines.</p>
	</div>

	<div class="table-wrap">
		<table>
			<thead>
				<tr>
					<th class="col-name">Name</th>
					<th class="col-desc">Description</th>
					<th class="col-stack">Stack</th>
					<th class="col-type">Type</th>
					<th class="col-year">Year</th>
				</tr>
			</thead>
			<tbody>
				{#each projects as project, i (project.id)}
					<tr class:alt={i % 2 === 1}>
						<td class="col-name">
							<a href="/projects/{project.id}">{project.title}</a>
						</td>
						<td class="col-desc">{project.tagline}</td>
						<td class="col-stack">
							<span class="stack-preview">{project.stack.slice(0, 2).join(', ')}</span>
						</td>
						<td class="col-type">
							{#if project.type === 'interactive'}
								<span class="badge badge-demo">&#9654; Demo</span>
							{:else}
								<span class="badge badge-writeup">&#9998; Write-up</span>
							{/if}
						</td>
						<td class="col-year">{project.year}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="nav-footer">
		<a href="/">&larr; Back to Home</a>
	</div>
</div>

<style>
	.page {
		font-family: 'Pixelated MS Sans Serif', Arial, sans-serif;
		font-size: 11px;
		line-height: 1.5;
		color: #000;
		background: #eef2f7;
	}

	/* ── Page header ───────────────────────────────────────────────────── */

	.page-header {
		padding: 12px 16px;
		border-bottom: 1px solid #c0cdd8;
		background: #fff;
	}

	h1 {
		font-size: 16px;
		color: #1a3a66;
		margin: 0 0 2px;
		font-weight: bold;
	}

	.page-header p {
		margin: 0;
		color: #505050;
	}

	/* ── Table ─────────────────────────────────────────────────────────── */

	.table-wrap {
		padding: 10px 12px;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 11px;
		background: #fff;
		border: 1px solid #a0b4cc;
		border-radius: 3px;
		overflow: hidden;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
	}

	thead tr {
		background: linear-gradient(180deg, #4a7db8 0%, #335d8e 100%);
	}

	th {
		text-align: left;
		padding: 4px 8px;
		font-weight: bold;
		color: #fff;
		border-right: 1px solid rgba(255, 255, 255, 0.15);
		white-space: nowrap;
	}

	th:last-child {
		border-right: none;
	}

	td {
		padding: 5px 8px;
		border-bottom: 1px solid #dde4ec;
		vertical-align: top;
	}

	.alt td {
		background: #f4f7fb;
	}

	tr:hover td {
		background: #e4ecf6;
	}

	.col-name { width: 90px; }
	.col-stack { width: 100px; }
	.col-type { width: 70px; text-align: center; }
	.col-year { width: 36px; text-align: center; }

	.stack-preview {
		color: #606060;
		font-size: 10px;
	}

	/* ── Links ─────────────────────────────────────────────────────────── */

	a {
		color: #0044cc;
		text-decoration: none;
	}

	a:hover {
		text-decoration: underline;
		color: #cc0000;
	}

	/* ── Badges ────────────────────────────────────────────────────────── */

	.badge {
		display: inline-block;
		padding: 1px 6px;
		font-size: 10px;
		font-weight: bold;
		border-radius: 2px;
		white-space: nowrap;
	}

	.badge-demo {
		background: linear-gradient(180deg, #5cb85c 0%, #3a8a3a 100%);
		color: #fff;
		border: 1px solid #2d6e2d;
		text-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
	}

	.badge-writeup {
		background: linear-gradient(180deg, #7799bb 0%, #557799 100%);
		color: #fff;
		border: 1px solid #446688;
		text-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
	}

	/* ── Footer nav ────────────────────────────────────────────────────── */

	.nav-footer {
		padding: 6px 16px 12px;
	}
</style>
