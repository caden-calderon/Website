/**
 * Shared device selection for ML preprocessing modules.
 *
 * WebGPU preferred when available. Falls back to WASM.
 * The runtime fallback chain (webgpu → wasm → ISNet) handles
 * cases where WebGPU is available but model execution fails.
 */

export type OnnxDevice = 'webgpu' | 'wasm';

let cachedResult: OnnxDevice | null = null;

/**
 * Determine the best ONNX execution device.
 * Checks if a WebGPU adapter is available — if so, uses WebGPU.
 * Runtime failures are handled by the fallback chain in each module.
 */
export async function getPreferredDevice(): Promise<OnnxDevice> {
	if (cachedResult) return cachedResult;

	if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
		try {
			const adapter = await navigator.gpu.requestAdapter();
			if (adapter) {
				cachedResult = 'webgpu';
				return 'webgpu';
			}
		} catch {
			// WebGPU probe failed
		}
	}

	cachedResult = 'wasm';
	return 'wasm';
}

/**
 * Whether transformers.js BG removal models can run in this browser.
 * Needs WebGPU for BiRefNet/BEN2/BRIA, or falls back to ISNet on WASM.
 */
export async function canRunTransformersBgModels(): Promise<boolean> {
	if (typeof navigator === 'undefined') return false;
	if (/firefox/i.test(navigator.userAgent)) return false;
	const device = await getPreferredDevice();
	return device === 'webgpu';
}

/** Reset cached probe result (for testing). */
export function resetProbeCache(): void {
	cachedResult = null;
}

/**
 * Wrap an async operation with a timeout.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
		promise.then(
			(val) => { clearTimeout(timer); resolve(val); },
			(err) => { clearTimeout(timer); reject(err); },
		);
	});
}
