<script lang="ts">
	let { appId = '', title = '' }: { appId?: string; title?: string } = $props();
</script>

<div class="placeholder">
	<p style="font-weight: bold;">{title || appId}</p>
	<p>This application is not yet implemented.</p>
</div>

<style>
	.placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		gap: 8px;
		padding: 16px;
		text-align: center;
	}
</style>
