import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const TAU = Math.PI * 2;

function parseArgs(argv) {
	const args = {
		output: path.join(repoRoot, 'tmp', 'rgbd-sequences', 'procedural-rgbd-portrait'),
		frames: 24,
		width: 96,
		height: 128,
		fps: 12,
	};

	for (let i = 0; i < argv.length; i++) {
		const value = argv[i];
		if (value === '--output') args.output = path.resolve(argv[++i]);
		else if (value === '--frames') args.frames = Number(argv[++i]);
		else if (value === '--width') args.width = Number(argv[++i]);
		else if (value === '--height') args.height = Number(argv[++i]);
		else if (value === '--fps') args.fps = Number(argv[++i]);
	}

	return args;
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	await fs.mkdir(args.output, { recursive: true });

	const frameFiles = [];
	const depthFiles = [];
	const frames = [];

	for (let frameIndex = 0; frameIndex < args.frames; frameIndex++) {
		const { colorBytes, depthValues } = generatePortraitFrame({
			frameIndex,
			frameCount: args.frames,
			width: args.width,
			height: args.height,
		});

		const colorFile = `color-${String(frameIndex).padStart(4, '0')}.json`;
		const depthFile = `depth-${String(frameIndex).padStart(4, '0')}.json`;
		frameFiles.push(colorFile);
		depthFiles.push(depthFile);

		await fs.writeFile(path.join(args.output, colorFile), JSON.stringify({
			width: args.width,
			height: args.height,
			encoding: 'rgba8-json-base64',
			data: Buffer.from(colorBytes).toString('base64'),
		}));

		await fs.writeFile(path.join(args.output, depthFile), JSON.stringify({
			width: args.width,
			height: args.height,
			encoding: 'float32-json-base64',
			semantics: '0-far-1-near',
			data: Buffer.from(depthValues.buffer).toString('base64'),
		}));

		frames.push({
			colorFile,
			depthFile,
		});
	}

	const manifest = {
		version: 1,
		fps: args.fps,
		frameCount: args.frames,
		frameTimestampsMs: Array.from({ length: args.frames }, (_, index) => (index * 1000) / args.fps),
		frames,
		clips: [
			{ id: 'portrait_turn', startFrame: 0, endFrame: args.frames - 1, mode: 'loop' },
		],
		raster: {
			width: args.width,
			height: args.height,
			colorEncoding: 'rgba8-json-base64',
			description: 'Procedural portrait RGB raster frames for RGBD sampling pipeline rehearsal.',
		},
		depth: {
			width: args.width,
			height: args.height,
			encoding: 'float32-json-base64',
			semantics: '0-far-1-near',
			description: 'Procedural normalized portrait depth with a slight head turn and cloth drift.',
		},
		coordinateSystem: {
			upAxis: 'y',
			forwardAxis: '-z',
			handedness: 'right',
			description: 'Stylized mock RGBD portrait sequence in normalized raster space.',
		},
		units: 'normalized-depth',
		processing: {
			generator: 'scripts/generate-test-rgbd-sequence.mjs',
			style: 'procedural-portrait',
			purpose: 'rgbd-sequence-playback-architecture-test',
		},
		capture: {
			sensor: 'synthetic-rgbd',
		},
	};

	await fs.writeFile(path.join(args.output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

function generatePortraitFrame({ frameIndex, frameCount, width, height }) {
	const colorBytes = new Uint8Array(width * height * 4);
	const depthValues = new Float32Array(width * height);
	const phase = frameCount <= 1 ? 0 : frameIndex / (frameCount - 1);
	const cycle = phase * TAU;
	const headShift = Math.sin(cycle) * 0.055;
	const clothShift = Math.cos(cycle * 0.85) * 0.035;
	const scarfLift = Math.sin(cycle * 1.5) * 0.03;

	for (let y = 0; y < height; y++) {
		const v = y / (height - 1);
		for (let x = 0; x < width; x++) {
			const u = x / (width - 1);
			const i = y * width + x;
			const i4 = i * 4;

			const px = (u - 0.5) * 2;
			const py = (v - 0.55) * 2;

			let alpha = 0;
			let depth = 0.05 + 0.05 * (1 - v);
			let color = [0, 0, 0];

			const shoulder = blob(px, py, 0.0 + clothShift, 0.58, 0.48, 0.42);
			const torso = blob(px, py, 0.02 + clothShift * 0.8, 0.22, 0.36, 0.55);
			const head = blob(px, py, 0.06 + headShift, -0.28, 0.23, 0.28);
			const headVolume = blob(px, py, 0.1 + headShift * 1.2, -0.22, 0.16, 0.19);
			const hair = blob(px, py, 0.08 + headShift, -0.42, 0.28, 0.2);
			const scarf = blob(px, py, 0.22 + headShift * 0.6, -0.34 - scarfLift, 0.11, 0.24);
			const collar = blob(px, py, 0.02 + headShift * 0.4, -0.03, 0.16, 0.08);
			const earring = blob(px, py, 0.22 + headShift * 1.1, -0.14, 0.03, 0.05);

			if (shoulder > 0.08) {
				alpha = Math.max(alpha, shoulder);
				color = mix(color, [0.84, 0.73, 0.38], shoulder);
				depth = Math.max(depth, 0.3 + shoulder * 0.18);
			}
			if (torso > 0.08) {
				alpha = Math.max(alpha, torso);
				color = mix(color, [0.18, 0.16, 0.12], torso * 0.9);
				depth = Math.max(depth, 0.34 + torso * 0.14);
			}
			if (head > 0.08) {
				alpha = Math.max(alpha, head);
				color = mix(color, [0.93, 0.84, 0.76], head);
				depth = Math.max(depth, 0.48 + head * 0.22);
			}
			if (headVolume > 0.08) {
				alpha = Math.max(alpha, headVolume);
				color = mix(color, [0.96, 0.9, 0.84], headVolume * 0.85);
				depth = Math.max(depth, 0.56 + headVolume * 0.22);
			}
			if (hair > 0.08) {
				alpha = Math.max(alpha, hair);
				color = mix(color, [0.22, 0.34, 0.92], hair);
				depth = Math.max(depth, 0.58 + hair * 0.16);
			}
			if (scarf > 0.08) {
				alpha = Math.max(alpha, scarf);
				color = mix(color, [0.9, 0.82, 0.55], scarf);
				depth = Math.max(depth, 0.52 + scarf * 0.18);
			}
			if (collar > 0.08) {
				alpha = Math.max(alpha, collar);
				color = mix(color, [0.97, 0.97, 0.97], collar);
				depth = Math.max(depth, 0.42 + collar * 0.08);
			}
			if (earring > 0.08) {
				alpha = Math.max(alpha, earring);
				color = mix(color, [0.98, 0.99, 1.0], earring);
				depth = Math.max(depth, 0.72 + earring * 0.16);
			}

			const leftBackgroundFade = smoothstep(-1.0, -0.1, px) * 0.22;
			const backgroundDust = px < -0.16 ? leftBackgroundFade * (0.45 + 0.55 * pseudoNoise(u * 7, v * 9, frameIndex)) : 0;
			if (backgroundDust > 0.08) {
				alpha = Math.max(alpha, backgroundDust * 0.6);
				color = mix(color, [0.75, 0.78, 0.92], backgroundDust * 0.4);
				depth = Math.max(depth, 0.12 + backgroundDust * 0.08);
			}

			colorBytes[i4] = Math.round(clamp01(color[0]) * 255);
			colorBytes[i4 + 1] = Math.round(clamp01(color[1]) * 255);
			colorBytes[i4 + 2] = Math.round(clamp01(color[2]) * 255);
			colorBytes[i4 + 3] = Math.round(clamp01(alpha) * 255);
			depthValues[i] = clamp01(alpha > 0.04 ? depth : 0.04);
		}
	}

	return { colorBytes, depthValues };
}

function blob(x, y, cx, cy, rx, ry) {
	const dx = (x - cx) / rx;
	const dy = (y - cy) / ry;
	const d = dx * dx + dy * dy;
	if (d >= 1) return 0;
	return 1 - d;
}

function mix(current, next, amount) {
	return [
		current[0] + (next[0] - current[0]) * amount,
		current[1] + (next[1] - current[1]) * amount,
		current[2] + (next[2] - current[2]) * amount,
	];
}

function smoothstep(edge0, edge1, x) {
	const t = clamp01((x - edge0) / (edge1 - edge0));
	return t * t * (3 - 2 * t);
}

function pseudoNoise(x, y, seed) {
	const value = Math.sin(x * 12.9898 + y * 78.233 + seed * 19.73) * 43758.5453;
	return value - Math.floor(value);
}

function clamp01(value) {
	return Math.min(1, Math.max(0, value));
}

main().catch((error) => {
	console.error('Failed to generate test RGBD sequence.', error);
	process.exitCode = 1;
});
