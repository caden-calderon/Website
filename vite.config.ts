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
			// Required for SharedArrayBuffer (onnxruntime-web WASM multi-threading)
			'Cross-Origin-Opener-Policy': 'same-origin',
			'Cross-Origin-Embedder-Policy': 'credentialless',
		},
	},
});
