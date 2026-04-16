import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import glsl from 'vite-plugin-glsl';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit(), tailwindcss(), glsl()],
	test: {
		include: ['tests/**/*.test.ts'],
	},
	ssr: {
		noExternal: ['three', '@threlte/core', '@threlte/extras'],
	},
	optimizeDeps: {
		exclude: ['@huggingface/transformers'],
	},
	server: {
		headers: {
			// Match hooks.server.ts — consistent COEP across all routes.
			// The IE4 browser uses a same-origin proxy for external sites,
			// so credentialless doesn't block the iframe.
			'Cross-Origin-Opener-Policy': 'same-origin',
			'Cross-Origin-Embedder-Policy': 'credentialless',
		},
	},
});
