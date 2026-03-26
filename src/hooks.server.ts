import type { Handle } from '@sveltejs/kit';

/**
 * Set COOP/COEP headers on all responses to enable SharedArrayBuffer.
 * Required for onnxruntime-web WASM multi-threading (ML models).
 *
 * credentialless is used instead of require-corp — it enables
 * crossOriginIsolated without requiring all cross-origin resources
 * to have explicit CORP headers (which HuggingFace CDN models may lack).
 */
export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
	response.headers.set('Cross-Origin-Embedder-Policy', 'credentialless');
	return response;
};
