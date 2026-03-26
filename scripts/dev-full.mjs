import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const DEFAULT_SERVICE_URL = 'http://127.0.0.1:9000';
const DEFAULT_HEALTH_TIMEOUT_MS = 30_000;
const DEFAULT_BG_COMMAND =
	'ai-env; exec uvicorn python.bg_remove_service.app:app --host {host} --port {port}';

async function main() {
	const args = new Set(process.argv.slice(2));
	if (args.has('--help')) {
		printHelp();
		return;
	}

	const fileEnv = loadDevelopmentEnv(repoRoot);
	const env = { ...fileEnv, ...process.env };
	const serviceUrl = env.BG_REMOVAL_SERVICE_URL || DEFAULT_SERVICE_URL;
	env.BG_REMOVAL_SERVICE_URL = serviceUrl;

	const serviceTarget = parseServiceUrl(serviceUrl);
	const healthTimeoutMs = parsePositiveInteger(
		env.BG_REMOVAL_SERVICE_START_TIMEOUT_MS,
		DEFAULT_HEALTH_TIMEOUT_MS,
	);

	if (args.has('--dry-run')) {
		console.log(
			JSON.stringify(
				{
					serviceUrl,
					manageLocalService: serviceTarget.isLocal,
					hasHfToken: Boolean(env.HF_TOKEN),
					backgroundServiceCommand: getBackgroundServiceCommand(env, serviceTarget),
				},
				null,
				2,
			),
		);
		return;
	}

	let managedBgProcess = null;
	try {
		managedBgProcess = await ensureBackgroundService({
			env,
			repoRoot,
			serviceTarget,
			healthTimeoutMs,
		});
		await runWebDevServer({ env, repoRoot, managedBgProcess });
	} finally {
		if (managedBgProcess?.exitCode === null) {
			managedBgProcess.kill('SIGTERM');
		}
	}
}

function printHelp() {
	console.log(`Usage: pnpm dev:full

Starts the local Python background-removal service if BG_REMOVAL_SERVICE_URL points
at a local address and then launches Vite in the same terminal.

Options:
  --dry-run   Print resolved config and exit
  --help      Show this message
`);
}

async function ensureBackgroundService({ env, repoRoot, serviceTarget, healthTimeoutMs }) {
	if (!serviceTarget.isLocal) {
		log('bg', `BG_REMOVAL_SERVICE_URL points to ${serviceTarget.url}. Skipping local service startup.`);
		return null;
	}

	if (await isServiceHealthy(serviceTarget.healthUrl)) {
		log('bg', `Reusing existing background service at ${serviceTarget.healthUrl}.`);
		return null;
	}

	if (await isPortOccupied(serviceTarget.connectHost, serviceTarget.port)) {
		throw new Error(
			`Port ${serviceTarget.port} is already in use, but ${serviceTarget.healthUrl} did not answer. ` +
				'Stop the stale process or change BG_REMOVAL_SERVICE_URL before running pnpm dev:full.',
		);
	}

	if (!env.HF_TOKEN) {
		log('bg', 'HF_TOKEN is not set. Gated models like BRIA RMBG 2.0 will fail until it is configured.');
	}

	const command = getBackgroundServiceCommand(env, serviceTarget);
	log('bg', `Starting background service at ${serviceTarget.url}...`);

	const bgProcess = spawn('fish', ['-lc', command], {
		cwd: repoRoot,
		env,
		stdio: ['inherit', 'pipe', 'pipe'],
	});
	pipeOutput(bgProcess.stdout, 'bg');
	pipeOutput(bgProcess.stderr, 'bg');

	await waitForServiceHealth(serviceTarget.healthUrl, bgProcess, healthTimeoutMs);
	log('bg', `Background service is ready at ${serviceTarget.healthUrl}.`);
	return bgProcess;
}

async function runWebDevServer({ env, repoRoot, managedBgProcess }) {
	log('web', 'Starting Vite dev server...');
	const webProcess = spawn('pnpm', ['dev'], {
		cwd: repoRoot,
		env,
		stdio: ['inherit', 'pipe', 'pipe'],
	});
	pipeOutput(webProcess.stdout, 'web');
	pipeOutput(webProcess.stderr, 'web');

	let shuttingDown = false;
	const shutdown = (signal) => {
		if (shuttingDown) return;
		shuttingDown = true;

		if (webProcess.exitCode === null) {
			webProcess.kill(signal);
		}
		if (managedBgProcess && managedBgProcess.exitCode === null) {
			managedBgProcess.kill(signal);
		}
	};

	process.on('SIGINT', () => shutdown('SIGINT'));
	process.on('SIGTERM', () => shutdown('SIGTERM'));

	await new Promise((resolve, reject) => {
		webProcess.once('exit', (code, signal) => {
			if (managedBgProcess && managedBgProcess.exitCode === null) {
				managedBgProcess.kill('SIGTERM');
			}
			if (signal || code === 0) {
				resolve();
				return;
			}
			reject(new Error(`Vite dev server exited with code ${code}.`));
		});

		webProcess.once('error', reject);
		if (managedBgProcess) {
			managedBgProcess.once('exit', (code, signal) => {
				if (shuttingDown) return;
				reject(
					new Error(
						`Background service exited unexpectedly (${signal ?? `code ${code}`}) while dev server was running.`,
					),
				);
				if (webProcess.exitCode === null) {
					webProcess.kill('SIGTERM');
				}
			});
			managedBgProcess.once('error', reject);
		}
	});
}

function getBackgroundServiceCommand(env, serviceTarget) {
	const template = env.BG_REMOVAL_SERVICE_COMMAND || DEFAULT_BG_COMMAND;
	return template
		.replaceAll('{host}', serviceTarget.host)
		.replaceAll('{port}', String(serviceTarget.port));
}

function parseServiceUrl(rawUrl) {
	const url = new URL(rawUrl);
	const host = url.hostname;
	const port = Number(url.port || (url.protocol === 'https:' ? 443 : 80));
	const connectHost = host === '0.0.0.0' ? '127.0.0.1' : host;
	const isLocal = ['127.0.0.1', 'localhost', '0.0.0.0', '::1'].includes(host);
	const healthUrl = new URL('/healthz', url);
	if (connectHost !== host) {
		healthUrl.hostname = connectHost;
	}

	return {
		url: rawUrl,
		host,
		port,
		connectHost,
		isLocal,
		healthUrl: healthUrl.toString(),
	};
}

async function waitForServiceHealth(healthUrl, bgProcess, timeoutMs) {
	const deadline = Date.now() + timeoutMs;

	while (Date.now() < deadline) {
		if (bgProcess.exitCode !== null) {
			throw new Error(`Background service exited before becoming ready (code ${bgProcess.exitCode}).`);
		}

		if (await isServiceHealthy(healthUrl)) {
			return;
		}

		await delay(500);
	}

	throw new Error(`Background service did not become healthy within ${timeoutMs}ms.`);
}

async function isServiceHealthy(healthUrl) {
	try {
		const response = await fetch(healthUrl, {
			signal: AbortSignal.timeout(1_000),
		});
		return response.ok;
	} catch {
		return false;
	}
}

function isPortOccupied(host, port) {
	return new Promise((resolve) => {
		const socket = net.connect({ host, port });
		socket.once('connect', () => {
			socket.destroy();
			resolve(true);
		});
		socket.once('error', () => {
			resolve(false);
		});
	});
}

function pipeOutput(stream, label) {
	const rl = readline.createInterface({ input: stream });
	rl.on('line', (line) => {
		log(label, line);
	});
}

function log(label, message) {
	console.log(`[${label}] ${message}`);
}

function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadDevelopmentEnv(root) {
	const env = {};
	for (const filename of ['.env', '.env.local', '.env.development', '.env.development.local']) {
		Object.assign(env, loadEnvFile(path.join(root, filename)));
	}
	return env;
}

function loadEnvFile(filename) {
	if (!fs.existsSync(filename)) {
		return {};
	}

	const env = {};
	const text = fs.readFileSync(filename, 'utf8');
	for (const line of text.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;

		const normalized = trimmed.startsWith('export ') ? trimmed.slice(7) : trimmed;
		const equalsIndex = normalized.indexOf('=');
		if (equalsIndex <= 0) continue;

		const key = normalized.slice(0, equalsIndex).trim();
		const rawValue = normalized.slice(equalsIndex + 1).trim();
		env[key] = parseEnvValue(rawValue);
	}

	return env;
}

function parseEnvValue(rawValue) {
	if (!rawValue) return '';

	const quote = rawValue[0];
	if ((quote === '"' || quote === "'") && rawValue.endsWith(quote)) {
		return rawValue.slice(1, -1);
	}

	const hashIndex = rawValue.indexOf(' #');
	return hashIndex >= 0 ? rawValue.slice(0, hashIndex).trim() : rawValue;
}

function parsePositiveInteger(rawValue, fallback) {
	if (!rawValue) return fallback;
	const parsed = Number(rawValue);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

main().catch((error) => {
	console.error(`[dev:full] ${error.message}`);
	process.exitCode = 1;
});
