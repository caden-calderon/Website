<!--
  About page for http://chromatic.dev/about
  Gradient section containers, styled skills, sidebar widget boxes.
-->
<script lang="ts">
</script>

<div class="page">
	<!-- ── Header ───────────────────────────────────────────────────────── -->
	<div class="page-header">
		<h1>About</h1>
	</div>

	<div class="body">
		<!-- ── Main column ──────────────────────────────────────────────── -->
		<div class="main-col">
			<div class="section">
				<div class="section-header">Caden Calderon</div>
				<div class="section-body">
					<p class="role">Software Engineer &middot; CS &amp; AI/ML</p>

					<p>
						I build things at the intersection of graphics, machine learning, and interactive
						systems. Most of my work involves making complex technology feel immediate —
						real-time 3D rendering, AI that plays along, interfaces that surprise you.
					</p>

					<p>
						This website is a portfolio that doubles as a playground. The Windows 98 desktop
						you're using right now is a fully functional OS shell built from scratch with
						Svelte 5. The 3D scene behind it runs on a custom point cloud engine.
					</p>
				</div>
			</div>

			<div class="section">
				<div class="section-header section-header-green">Skills</div>
				<div class="section-body">
					<table>
						<tbody>
							<tr>
								<td class="skill-cat">Languages</td>
								<td>
									<div class="tag-row">
										{#each ['TypeScript', 'Python', 'Rust', 'C/C++', 'C#', 'GLSL'] as s}
											<span class="skill-tag">{s}</span>
										{/each}
									</div>
								</td>
							</tr>
							<tr>
								<td class="skill-cat">Frontend</td>
								<td>
									<div class="tag-row">
										{#each ['Svelte/SvelteKit', 'Three.js', 'WebGL', 'WebGPU', 'CSS'] as s}
											<span class="skill-tag">{s}</span>
										{/each}
									</div>
								</td>
							</tr>
							<tr>
								<td class="skill-cat">ML / Vision</td>
								<td>
									<div class="tag-row">
										{#each ['PyTorch', 'ONNX Runtime', 'OpenCV', 'Depth Sensing'] as s}
											<span class="skill-tag">{s}</span>
										{/each}
									</div>
								</td>
							</tr>
							<tr>
								<td class="skill-cat">Systems</td>
								<td>
									<div class="tag-row">
										{#each ['WASM', 'Real-time Pipelines', 'Sensor Fusion', 'Game Engines'] as s}
											<span class="skill-tag">{s}</span>
										{/each}
									</div>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>

		<!-- ── Sidebar ──────────────────────────────────────────────────── -->
		<div class="sidebar">
			<!-- Mii avatar -->
			<div class="widget mii-widget">
				<img src="/os-assets/icons/mii-head.png" alt="Caden's Mii" class="mii-avatar" />
			</div>

			<div class="widget">
				<div class="widget-header">Contact</div>
				<div class="widget-body">
					<ul>
						<li><b>GitHub</b><br /><a href="https://github.com/Caden-Calderon">Caden-Calderon</a></li>
						<li><b>Email</b><br />hello@chromatic.dev</li>
					</ul>
				</div>
			</div>

			<div class="widget">
				<div class="widget-header widget-header-teal">Currently</div>
				<div class="widget-body">
					<ul>
						<li>&#9658; Building Chromatic</li>
						<li>&#9658; Real-time point clouds</li>
						<li>&#9658; AI character systems</li>
					</ul>
				</div>
			</div>
		</div>
	</div>

	<div class="nav-footer">
		<a href="/">&larr; Back to Home</a>
		&middot;
		<a href="/projects">View Projects</a>
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

	/* ── Header ────────────────────────────────────────────────────────── */

	.page-header {
		padding: 10px 16px;
		background: #fff;
		border-bottom: 1px solid #c0cdd8;
	}

	h1 {
		font-size: 16px;
		color: #1a3a66;
		margin: 0;
	}

	/* ── Body layout ───────────────────────────────────────────────────── */

	.body {
		display: flex;
		gap: 0;
	}

	.main-col {
		flex: 1;
		padding: 10px 12px;
		min-width: 0;
	}

	.role {
		color: #505050;
		margin: 0 0 8px;
		font-style: italic;
	}

	p {
		margin: 6px 0;
	}

	/* ── Sections ──────────────────────────────────────────────────────── */

	.section {
		margin-bottom: 10px;
		border: 1px solid #a0b4cc;
		border-radius: 4px;
		overflow: hidden;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
	}

	.section-header {
		background: linear-gradient(180deg, #4a7db8 0%, #335d8e 100%);
		color: #fff;
		padding: 4px 10px;
		font-weight: bold;
		font-size: 11px;
	}

	.section-header-green {
		background: linear-gradient(180deg, #5eaa5e 0%, #3d7040 100%);
	}

	.section-body {
		background: #fff;
		padding: 10px 12px;
	}

	/* ── Skills table ──────────────────────────────────────────────────── */

	table {
		border-collapse: collapse;
		width: 100%;
		font-size: 11px;
		background: transparent;
	}

	td {
		padding: 4px 6px 4px 0;
		vertical-align: top;
		border-bottom: 1px solid #e8ecf0;
	}

	.skill-cat {
		font-weight: bold;
		color: #1a3a66;
		width: 70px;
		white-space: nowrap;
	}

	.tag-row {
		display: flex;
		flex-wrap: wrap;
		gap: 3px;
	}

	.skill-tag {
		display: inline-block;
		padding: 1px 6px;
		background: linear-gradient(180deg, #e8eef4 0%, #d0d8e4 100%);
		border: 1px solid #a8b8cc;
		border-radius: 3px;
		font-size: 10px;
		color: #1a3a66;
	}

	/* ── Sidebar ───────────────────────────────────────────────────────── */

	.sidebar {
		width: 150px;
		flex-shrink: 0;
		padding: 10px 10px 10px 0;
	}

	.widget {
		border: 1px solid #a0b4cc;
		border-radius: 4px;
		overflow: hidden;
		margin-bottom: 8px;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
	}

	.widget-header {
		background: linear-gradient(180deg, #5588bb 0%, #3d6d99 100%);
		color: #fff;
		padding: 3px 8px;
		font-weight: bold;
		font-size: 11px;
	}

	.widget-header-teal {
		background: linear-gradient(180deg, #4a9999 0%, #357070 100%);
	}

	/* ── Mii avatar ────────────────────────────────────────────────────── */

	.mii-widget {
		background: linear-gradient(180deg, #d8e8f8 0%, #b8d0e8 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 10px;
	}

	.mii-avatar {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		border: 2px solid #fff;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
		background: #e8f0f8;
		object-fit: cover;
	}

	.widget-body {
		background: #fff;
		padding: 6px 8px;
	}

	.widget-body ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.widget-body li {
		padding: 2px 0;
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

	.nav-footer {
		text-align: center;
		padding: 4px 16px 12px;
	}
</style>
