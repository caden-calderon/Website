import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const APP_URL = process.env.CHROMATIC_MEASURE_URL ?? 'http://127.0.0.1:4173/';
const CHROMIUM_BIN = process.env.CHROMIUM_BIN ?? 'chromium';
const DEBUG_PORT = Number.parseInt(process.env.CHROMIUM_DEBUG_PORT ?? '9222', 10);
const ASSET_IDS = ['itop-side-test-short', 'itop-side-test-medium', 'itop-side-test-long'];
const PAGE_LOAD_TIMEOUT_MS = 120_000;
const CDP_STARTUP_TIMEOUT_MS = 15_000;

async function main() {
	const browser = await launchChromium();
	try {
		const versionInfo = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
		const pageTarget = await waitForPageTarget();
		const cdp = new CdpClient(pageTarget.webSocketDebuggerUrl);
		await cdp.connect();

		try {
			await cdp.send('Page.enable');
			await cdp.send('Runtime.enable');
			await cdp.send('Performance.enable');
			await cdp.send('HeapProfiler.enable');

			const results = [];
			for (const assetId of ASSET_IDS) {
				const measurement = await measureAsset(cdp, assetId);
				results.push(measurement);
			}

			console.log(JSON.stringify({
				appUrl: APP_URL,
				chromium: versionInfo.Browser,
				userAgent: versionInfo['User-Agent'],
				measuredAt: new Date().toISOString(),
				results,
			}, null, 2));
		} finally {
			await cdp.close();
		}
	} finally {
		await shutdownChromium(browser);
	}
}

async function measureAsset(cdp, assetId) {
	await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
		source: buildSettingsInjectionScript(assetId),
	});
	await cdp.send('Page.navigate', { url: APP_URL });
	await cdp.waitForEvent('Page.loadEventFired', PAGE_LOAD_TIMEOUT_MS);
	await waitForDemoApi(cdp);
	await selectSequenceAsset(cdp, assetId);
	const state = await waitForSequenceReport(cdp, assetId);
	await forceGarbageCollection(cdp);
	const memory = await measureMemory(cdp);
	const cdpMetrics = await collectCdpMetrics(cdp);

	return {
		assetId,
		report: state.sequenceReport,
		status: state.sequenceStatus,
		memory,
		cdpMetrics,
	};
}

function buildSettingsInjectionScript(assetId) {
	return `
		try {
			localStorage.setItem('chromatic-settings', JSON.stringify({
				mode: 'sequence',
				selectedSequenceAssetId: ${JSON.stringify(assetId)},
				selectedSequenceClipId: '',
				selectedSequenceLookPresetId: 'painted-figure',
				sequenceMaxPointsPerFrame: 12000,
				sequenceAutoCenter: true,
				sequenceFitHeightEnabled: true,
				sequenceFitHeight: 2.2,
				sequenceScaleMultiplier: 1
			}));
		} catch {}
	`;
}

async function waitForDemoApi(cdp) {
	await evaluate(cdp, async () => {
		const deadline = performance.now() + 60_000;
		while (performance.now() < deadline) {
			if (window.__chromaticDemo?.getState) {
				return true;
			}
			await new Promise((resolve) => setTimeout(resolve, 50));
		}
		throw new Error('Timed out waiting for __chromaticDemo debug API.');
	});
}

async function selectSequenceAsset(cdp, assetId) {
	await evaluate(cdp, async (requestedAssetId) => {
		const demo = window.__chromaticDemo;
		if (!demo) {
			throw new Error('__chromaticDemo debug API is unavailable.');
		}
		demo.setMode('sequence');
		demo.selectSequenceAsset(requestedAssetId);
		return true;
	}, [assetId]);
}

async function waitForSequenceReport(cdp, assetId) {
	return evaluate(cdp, async (requestedAssetId) => {
		const deadline = performance.now() + 120_000;
		while (performance.now() < deadline) {
			const state = window.__chromaticDemo?.getState();
			if (
				state &&
				state.mode === 'sequence' &&
				state.selectedSequenceAssetId === requestedAssetId &&
				state.sequenceReport &&
				state.sequenceReport.kind === 'point-sequence'
			) {
				return state;
			}
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
		throw new Error(`Timed out waiting for sequence report for "${requestedAssetId}".`);
	}, [assetId]);
}

async function forceGarbageCollection(cdp) {
	await cdp.send('HeapProfiler.collectGarbage');
	await evaluate(cdp, async () => {
		globalThis.gc?.();
		await new Promise((resolve) => setTimeout(resolve, 250));
		return true;
	});
}

async function measureMemory(cdp) {
	return evaluate(cdp, async () => {
		const performanceMemory = 'memory' in performance
			? {
				jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
				totalJSHeapSize: performance.memory.totalJSHeapSize,
				usedJSHeapSize: performance.memory.usedJSHeapSize,
			}
			: null;

		let userAgentSpecificMemory = null;
		if ('measureUserAgentSpecificMemory' in performance) {
			try {
				const measurement = await performance.measureUserAgentSpecificMemory();
				userAgentSpecificMemory = {
					bytes: measurement.bytes,
					breakdown: measurement.breakdown.map((entry) => ({
						bytes: entry.bytes,
						attribution: entry.attribution.map((item) => item.scope),
						types: entry.types,
					})),
				};
			} catch (error) {
				userAgentSpecificMemory = {
					error: error instanceof Error ? error.message : String(error),
				};
			}
		}

		return {
			performanceMemory,
			userAgentSpecificMemory,
		};
	});
}

async function collectCdpMetrics(cdp) {
	const response = await cdp.send('Performance.getMetrics');
	const metrics = Object.fromEntries(response.metrics.map((entry) => [entry.name, entry.value]));
	return {
		jsHeapUsedSize: metrics.JSHeapUsedSize ?? null,
		jsHeapTotalSize: metrics.JSHeapTotalSize ?? null,
		nodes: metrics.Nodes ?? null,
		documents: metrics.Documents ?? null,
		resources: metrics.Resources ?? null,
		layoutCount: metrics.LayoutCount ?? null,
		recalcStyleCount: metrics.RecalcStyleCount ?? null,
	};
}

async function evaluate(cdp, fn, args = []) {
	const expression = `(${fn.toString()})(...${JSON.stringify(args)})`;
	const response = await cdp.send('Runtime.evaluate', {
		expression,
		awaitPromise: true,
		returnByValue: true,
	});

	if (response.exceptionDetails) {
		const description = response.exceptionDetails.exception?.description;
		throw new Error(description ?? response.exceptionDetails.text ?? 'Runtime evaluation failed.');
	}

	return response.result.value;
}

async function launchChromium() {
	const userDataDir = mkdtempSync(path.join(os.tmpdir(), 'chromatic-itop-measure-'));
	const child = spawn(CHROMIUM_BIN, [
		'--headless=new',
		`--remote-debugging-port=${DEBUG_PORT}`,
		'--no-first-run',
		'--no-default-browser-check',
		'--disable-background-networking',
		'--disable-component-update',
		'--disable-sync',
		'--disable-extensions',
		'--enable-webgl',
		'--ignore-gpu-blocklist',
		'--use-angle=swiftshader-webgl',
		'--js-flags=--expose-gc',
		`--user-data-dir=${userDataDir}`,
		'about:blank',
	], {
		stdio: ['ignore', 'pipe', 'pipe'],
	});

	let stderr = '';
	child.stderr.on('data', (chunk) => {
		stderr += chunk.toString();
	});

	const start = Date.now();
	while (Date.now() - start < CDP_STARTUP_TIMEOUT_MS) {
		if (child.exitCode != null) {
			throw new Error(`Chromium exited early while starting remote debugging.\n${stderr}`);
		}

		try {
			await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
			return { child, userDataDir };
		} catch {
			await delay(100);
		}
	}

	child.kill('SIGTERM');
	throw new Error(`Timed out waiting for Chromium remote debugging.\n${stderr}`);
}

async function shutdownChromium(browser) {
	if (!browser) return;
	if (browser.child.exitCode == null) {
		browser.child.kill('SIGTERM');
		await delay(250);
		if (browser.child.exitCode == null) {
			browser.child.kill('SIGKILL');
		}
	}
	rmSync(browser.userDataDir, { recursive: true, force: true });
}

async function waitForPageTarget() {
	const start = Date.now();
	while (Date.now() - start < CDP_STARTUP_TIMEOUT_MS) {
		const targets = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
		const pageTarget = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
		if (pageTarget) {
			return pageTarget;
		}
		await delay(100);
	}
	throw new Error('Timed out waiting for a Chromium page target.');
}

async function fetchJson(url) {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Request failed for ${url}: ${response.status} ${response.statusText}`);
	}
	return response.json();
}

class CdpClient {
	constructor(wsUrl) {
		this.wsUrl = wsUrl;
		this.nextId = 1;
		this.pending = new Map();
		this.eventWaiters = new Map();
	}

	async connect() {
		this.socket = new WebSocket(this.wsUrl);
		await new Promise((resolve, reject) => {
			this.socket.addEventListener('open', resolve, { once: true });
			this.socket.addEventListener('error', reject, { once: true });
		});
		this.socket.addEventListener('message', (event) => {
			const message = JSON.parse(event.data);
			if (message.id) {
				const pending = this.pending.get(message.id);
				if (!pending) return;
				this.pending.delete(message.id);
				if (message.error) {
					pending.reject(new Error(message.error.message));
					return;
				}
				pending.resolve(message.result ?? {});
				return;
			}

			const waiters = this.eventWaiters.get(message.method);
			if (!waiters) return;
			this.eventWaiters.delete(message.method);
			for (const waiter of waiters) {
				waiter.resolve(message.params ?? {});
			}
		});
	}

	send(method, params = {}) {
		const id = this.nextId++;
		this.socket.send(JSON.stringify({ id, method, params }));
		return new Promise((resolve, reject) => {
			this.pending.set(id, { resolve, reject });
		});
	}

	waitForEvent(method, timeoutMs) {
		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				const waiters = this.eventWaiters.get(method) ?? [];
				this.eventWaiters.set(method, waiters.filter((entry) => entry.resolve !== resolve));
				reject(new Error(`Timed out waiting for CDP event ${method}.`));
			}, timeoutMs);

			const waiters = this.eventWaiters.get(method) ?? [];
			waiters.push({
				resolve: (params) => {
					clearTimeout(timeout);
					resolve(params);
				},
			});
			this.eventWaiters.set(method, waiters);
		});
	}

	async close() {
		if (!this.socket) return;
		if (this.socket.readyState === WebSocket.OPEN) {
			this.socket.close();
			await delay(50);
		}
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.stack ?? error.message : String(error));
	process.exitCode = 1;
});
