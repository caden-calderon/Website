<!--
  Contact page for http://chromatic.dev/contact
  Dense IE portfolio contact surface with dashboard-style affordances.
-->
<script lang="ts">
	import { availabilityRows, collaborationInterests, contactLinks } from './profileData.js';
</script>

<div class="contact-page">
	<header class="contact-hero">
		<div class="hero-meta">
			<span>// Contact Channel</span>
			<span>Issue 04<br /><b>Online</b></span>
		</div>
		<div class="hero-lockup">
			<h1><span>Contact</span><span>Caden</span></h1>
			<div class="signal-box" aria-hidden="true">
				<div class="signal-dots">
					{#each Array.from({ length: 25 }) as _, index}
						<span class:hot={index === 18 || index === 24}></span>
					{/each}
				</div>
				<p>ONLINE</p>
			</div>
		</div>
		<p class="lede">
			Best channel is a direct note with context: what you are building, where the hard part is,
			and what kind of help would make the next version real.
		</p>
	</header>

	<main class="contact-grid">
		<section class="main-column">
			<div class="section-block">
				<h2>// Direct Links</h2>
				<div class="link-table">
					{#each contactLinks as link}
						<a href={link.href}>
							<span>{link.label}</span>
							<b>{link.value}</b>
							<i>-&gt;</i>
						</a>
					{/each}
				</div>
			</div>

			<div class="section-block">
				<h2>// Collaboration Interests</h2>
				<ol class="interest-list">
					{#each collaborationInterests as item, index}
						<li><span>{String(index + 1).padStart(2, '0')}</span><p>{item}</p></li>
					{/each}
				</ol>
			</div>

			<div class="thread-module">
				<div class="thread-copy">
					<h2>// Send A Thread / Report</h2>
					<p>
						Placeholder for a future structured intake: bug report, build log, collaboration
						brief, or strange interface idea. Same spirit as the visitor-counter star: a small
						live object that makes the page feel connected without pretending to be a form yet.
					</p>
					<button type="button" title="Thread intake placeholder is not wired yet">QUEUE THREAD</button>
				</div>
				<div class="thread-counter" aria-label="Thread queue placeholder">
					{#each ['S', 'E', 'N', 'D', '*', '0', '0', '1'] as glyph}
						<span class:star={glyph === '*'}>{glyph}</span>
					{/each}
				</div>
			</div>
		</section>

		<aside class="side-column">
			<section class="side-section">
				<h2>// Availability</h2>
				<dl class="fact-list">
					{#each availabilityRows as row}
						<div>
							<dt>{row.label}</dt>
							<dd>{row.value}</dd>
						</div>
					{/each}
				</dl>
			</section>

			<section class="side-section response-section">
				<h2>// Signal Quality</h2>
				<div class="meter-row"><span>Specificity</span><i style="--value: 10"></i></div>
				<div class="meter-row"><span>Prototype</span><i style="--value: 8"></i></div>
				<div class="meter-row"><span>Timeline</span><i style="--value: 7"></i></div>
				<p>Strong notes include constraints, existing demos, and the decision you are trying to make.</p>
			</section>

			<section class="side-section packet-section">
				<h2>// Packet Template</h2>
				<ul>
					<li>What exists now?</li>
					<li>What needs to work?</li>
					<li>What is weird or risky?</li>
					<li>What should happen next?</li>
				</ul>
			</section>

			<section class="side-section link-section">
				<h2>// Navigation</h2>
				<a href="/about">Read about file -&gt;</a>
				<a href="/projects">Open project archive -&gt;</a>
			</section>
		</aside>
	</main>
</div>

<style>
	.contact-page {
		--blue: #1238f2;
		--cyan: #27b6d6;
		--orange: #e86f22;
		--paper: #eeeeec;
		--ink: #111111;
		--line: #8e8e8a;
		--soft-line: #c7c7c1;
		min-width: 980px;
		min-height: 100%;
		padding: 18px 22px 20px;
		background:
			linear-gradient(rgba(18, 56, 242, 0.055) 1px, transparent 1px),
			linear-gradient(90deg, rgba(18, 56, 242, 0.045) 1px, transparent 1px),
			var(--paper);
		background-size: 12px 12px, 12px 12px, auto;
		color: var(--ink);
		font-family: 'Pixelated MS Sans Serif', 'MS Sans Serif', monospace;
		font-size: 11px;
		line-height: 1.35;
	}

	.contact-hero {
		padding-bottom: 16px;
		border-bottom: 1px solid var(--line);
	}

	.hero-meta {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		color: var(--blue);
		text-transform: uppercase;
		font-size: 13px;
		font-weight: 700;
	}

	.hero-meta b,
	.interest-list span,
	dt {
		color: var(--orange);
	}

	.hero-lockup {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 170px;
		gap: 24px;
		align-items: end;
	}

	h1 {
		margin: 19px 0 0;
		overflow: hidden;
		font-family: Impact, Haettenschweiler, 'Arial Narrow Bold', 'Arial Black', sans-serif;
		font-size: 126px;
		font-weight: 900;
		line-height: 0.8;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	h1 span {
		display: block;
		width: 144%;
		transform: scaleX(0.69);
		transform-origin: left center;
	}

	h1 span:first-child {
		color: #090909;
	}

	h1 span:last-child {
		color: var(--blue);
	}

	.signal-box {
		border-left: 1px dotted var(--line);
		padding-left: 18px;
	}

	.signal-dots {
		display: grid;
		grid-template-columns: repeat(5, 13px);
		gap: 6px;
		margin-bottom: 14px;
	}

	.signal-dots span {
		width: 4px;
		height: 4px;
		background: #9f9f99;
	}

	.signal-dots .hot {
		width: 17px;
		height: 17px;
		background: var(--blue);
	}

	.signal-box p {
		display: inline-block;
		margin: 0;
		padding: 5px 9px;
		background: #080808;
		color: #00f03a;
		font-size: 16px;
		font-weight: 700;
	}

	.lede {
		max-width: 760px;
		margin: 14px 0 0;
		font-size: 14px;
		line-height: 1.22;
		font-weight: 700;
		text-transform: uppercase;
	}

	.contact-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 300px;
		gap: 22px;
		padding-top: 16px;
	}

	.section-block,
	.side-section {
		border-bottom: 1px solid var(--line);
		padding-bottom: 15px;
		margin-bottom: 15px;
	}

	h2 {
		margin: 0 0 10px;
		color: var(--blue);
		font-size: 11px;
		text-transform: uppercase;
	}

	.link-table {
		border-top: 1px dotted var(--soft-line);
	}

	.link-table a {
		display: grid;
		grid-template-columns: 94px minmax(0, 1fr) 22px;
		gap: 12px;
		align-items: center;
		padding: 10px 0;
		border-bottom: 1px dotted var(--soft-line);
		text-decoration: none;
	}

	.link-table span {
		color: var(--orange);
		text-transform: uppercase;
		font-weight: 700;
	}

	.link-table b {
		color: #111;
		font-size: 13px;
	}

	.link-table i {
		color: var(--blue);
		font-style: normal;
		font-weight: 700;
	}

	.link-table a:hover,
	.link-table a:focus-visible {
		outline: 1px dotted var(--orange);
		outline-offset: -2px;
	}

	.link-table a:hover b,
	.link-table a:focus-visible b,
	a:hover,
	a:focus-visible {
		color: var(--orange);
	}

	.interest-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.interest-list li {
		display: grid;
		grid-template-columns: 42px minmax(0, 1fr);
		gap: 10px;
		padding: 7px 0;
		border-bottom: 1px dotted var(--soft-line);
	}

	.interest-list p {
		margin: 0;
	}

	.thread-module {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 220px;
		gap: 18px;
		padding: 14px;
		border: 1px solid var(--line);
		background: rgba(255, 255, 255, 0.34);
	}

	.thread-copy p {
		max-width: 520px;
		margin: 0 0 12px;
	}

	button {
		min-width: 112px;
		min-height: 24px;
		padding: 2px 10px;
		color: #000;
		background: #c0c0c0;
		font-family: inherit;
		font-size: 10px;
		font-weight: 700;
	}

	button:hover,
	button:focus-visible {
		color: var(--orange);
		outline: 1px dotted currentColor;
		outline-offset: -4px;
	}

	.thread-counter {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 4px;
		align-self: center;
	}

	.thread-counter span {
		display: grid;
		place-items: center;
		height: 42px;
		border: 1px solid #777;
		background: #101010;
		color: #f0f0ec;
		font-size: 23px;
		font-weight: 700;
	}

	.thread-counter .star {
		color: #ffd51d;
	}

	.side-column {
		border-left: 1px dotted var(--line);
		padding-left: 18px;
	}

	.fact-list,
	.fact-list div,
	.fact-list dt,
	.fact-list dd {
		margin: 0;
	}

	.fact-list div {
		display: grid;
		grid-template-columns: 68px minmax(0, 1fr);
		gap: 9px;
		padding: 7px 0;
		border-bottom: 1px dotted var(--soft-line);
	}

	dt {
		text-transform: uppercase;
		font-weight: 700;
	}

	.meter-row {
		display: grid;
		grid-template-columns: 82px 1fr;
		align-items: center;
		gap: 8px;
		margin: 7px 0;
	}

	.meter-row i {
		--value: 8;
		position: relative;
		display: block;
		height: 9px;
		background: repeating-linear-gradient(90deg, #d2d2cd 0 7px, transparent 7px 10px);
		border: 1px solid #d7d7d2;
	}

	.meter-row i::before {
		content: '';
		position: absolute;
		inset: 0 auto 0 0;
		width: calc(var(--value) * 10%);
		background: repeating-linear-gradient(90deg, var(--blue) 0 7px, transparent 7px 10px);
	}

	.response-section p {
		margin: 10px 0 0;
	}

	.packet-section ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.packet-section li {
		padding: 6px 0;
		border-bottom: 1px dotted var(--soft-line);
	}

	a {
		color: var(--blue);
		text-decoration: none;
		text-transform: uppercase;
		font-weight: 700;
	}

	a:hover,
	a:focus-visible {
		text-decoration: underline;
		outline: 1px dotted currentColor;
		outline-offset: 2px;
	}

	.link-section {
		display: grid;
		gap: 8px;
		border-bottom: 0;
	}
</style>
