import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const TAU = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** @type {readonly {id: string, mode: 'loop' | 'once' | 'ping-pong'}[]} */
const CLIP_BLUEPRINTS = [
	{ id: 'breathing_idle', mode: 'loop' },
	{ id: 'arm_sweep', mode: 'once' },
	{ id: 'turntable_pose', mode: 'ping-pong' },
];

/**
 * @typedef {{
 *   frameCount?: number | string,
 *   pointCount?: number | string,
 *   fps?: number | string,
 *   radius?: number | string,
 *   pulseAmplitude?: number | string,
 * }} SyntheticSequenceOptions
 */

/**
 * @typedef {{
 *   x: number,
 *   y: number,
 *   z: number,
 *   r: number,
 *   g: number,
 *   b: number,
 * }} SyntheticPoint
 */

/**
 * @typedef {{
 *   output?: string,
 *   frames?: string,
 *   points?: string,
 *   fps?: string,
 *   radius?: string,
 *   pulseAmplitude?: string,
 * }} CliArgs
 */

/** @type {readonly (keyof CliArgs)[]} */
const CLI_ARG_KEYS = ['output', 'frames', 'points', 'fps', 'radius', 'pulseAmplitude'];

/**
 * @param {SyntheticSequenceOptions} [options]
 */
export function generateSyntheticPointSequence(options = {}) {
	const frameCount = parsePositiveInteger(options.frameCount, 48);
	const pointCount = parsePositiveInteger(options.pointCount, 480);
	const fps = parsePositiveNumber(options.fps, 18);
	const radius = parsePositiveNumber(options.radius, 0.85);
	const pulseAmplitude = parsePositiveNumber(options.pulseAmplitude, 0.16);
	const clipBlueprints = CLIP_BLUEPRINTS.slice(0, Math.min(CLIP_BLUEPRINTS.length, frameCount));
	const clipFrameCounts = partitionFrameCounts(frameCount, clipBlueprints.length);
	const clips = buildClipDefinitions(clipBlueprints, clipFrameCounts);

	const frameFiles = [];
	const frames = [];

	for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
		const clip = clips.find((entry) => frameIndex >= entry.startFrame && frameIndex <= entry.endFrame);
		if (!clip) {
			throw new Error(`Failed to resolve synthetic clip for frame ${frameIndex}.`);
		}

		const localFrameCount = clip.endFrame - clip.startFrame + 1;
		const localFrameIndex = frameIndex - clip.startFrame;
		const filename = `frame-${String(frameIndex).padStart(4, '0')}.ply`;
		const points = generateFigurePoints({
			clipId: clip.id,
			frameIndex: localFrameIndex,
			frameCount: localFrameCount,
			basePointCount: pointCount,
			scale: radius,
			motionAmplitude: pulseAmplitude,
		});

		frameFiles.push(filename);
		frames.push({
			filename,
			pointCount: points.length,
			buffer: encodeAsciiPly(points),
		});
	}

	const framePointCounts = frames.map((frame) => frame.pointCount);

	const manifest = {
		version: 1,
		fps,
		frameCount,
		frameTimestampsMs: Array.from({ length: frameCount }, (_, index) => (index * 1000) / fps),
		frameFiles,
		clips,
		coordinateSystem: {
			upAxis: 'y',
			forwardAxis: '-z',
			handedness: 'right',
			description: 'Synthetic figure-study point-cloud sequence with deterministic body motion.',
		},
		units: 'meters',
		processing: {
			generator: 'scripts/generate-test-ply.mjs',
			shape: 'figure-study',
			pointCount,
			basePointCount: pointCount,
			framePointCountRange: [Math.min(...framePointCounts), Math.max(...framePointCounts)],
			clipFrameCounts,
			clipIds: clips.map((clip) => clip.id),
			radius,
			motionAmplitude: pulseAmplitude,
		},
		capture: {
			sensor: 'synthetic',
			metadata: {
				purpose: 'browser-sequence-playback-regression-test',
			},
		},
	};

	return { manifest, frames };
}

/**
 * @param {string} outputDir
 * @param {SyntheticSequenceOptions} [options]
 */
export async function writeSyntheticPointSequence(outputDir, options = {}) {
	const { manifest, frames } = generateSyntheticPointSequence(options);
	await fs.mkdir(outputDir, { recursive: true });

	for (const frame of frames) {
		await fs.writeFile(path.join(outputDir, frame.filename), frame.buffer);
	}

	const manifestPath = path.join(outputDir, 'manifest.json');
	await fs.writeFile(`${manifestPath}`, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

	return {
		outputDir,
		manifestPath,
		framePaths: frames.map((frame) => path.join(outputDir, frame.filename)),
		manifest,
	};
}

/**
 * @param {{
 *   clipId: string,
 *   frameIndex: number,
 *   frameCount: number,
 *   basePointCount: number,
 *   scale: number,
 *   motionAmplitude: number,
 * }} options
 * @returns {SyntheticPoint[]}
 */
function generateFigurePoints(options) {
	const {
		clipId,
		frameIndex,
		frameCount,
		basePointCount,
		scale,
		motionAmplitude,
	} = options;

	/** @type {SyntheticPoint[]} */
	const points = [];
	const phase = frameCount === 1 ? 0 : frameIndex / (frameCount - 1);
	const cycle = phase * TAU;
	const breathe = 1 + motionAmplitude * 0.9 * Math.sin(cycle);
	const bob = scale * 0.05 * Math.sin(cycle * 2 + 0.3);
	const sway = scale * 0.06 * Math.sin(cycle + 0.4);

	let turnAngle = scale * 0;
	let rightHand = [0.78, 0.24, 0.02];
	let leftHand = [-0.76, 0.22, -0.04];
	let orbitCenter = [0, 0.46, 0];
	let orbitRadius = [0.18, 0.08];
	let totalPointCount = Math.max(96, Math.round(basePointCount * (0.82 + 0.1 * Math.sin(cycle) + 0.05 * Math.cos(cycle * 2))));

	if (clipId === 'arm_sweep') {
		rightHand = [
			0.45 + 0.25 * Math.sin(phase * Math.PI),
			0.12 + 0.72 * Math.sin(phase * Math.PI * 0.95),
			-0.3 + 0.68 * phase,
		];
		leftHand = [-0.72, 0.18 + 0.08 * Math.sin(cycle * 1.5), -0.08];
		orbitCenter = [0.18, 0.62, 0.16];
		orbitRadius = [0.1, 0.22];
		totalPointCount = Math.max(96, Math.round(basePointCount * (0.88 + 0.22 * Math.sin(phase * Math.PI))));
	} else if (clipId === 'turntable_pose') {
		turnAngle = phase * TAU;
		rightHand = [0.68, 0.3 + 0.04 * Math.sin(cycle), 0.12];
		leftHand = [-0.68, 0.3 + 0.04 * Math.sin(cycle + 0.9), -0.12];
		orbitCenter = [0, 0.18, 0];
		orbitRadius = [0.28, 0.14];
		totalPointCount = Math.max(96, Math.round(basePointCount * (0.92 + 0.1 * Math.cos(cycle * 1.5))));
	} else {
		turnAngle = 0.18 * Math.sin(cycle * 0.5);
		rightHand = [0.74, 0.22 + 0.05 * Math.sin(cycle), 0.04 + 0.04 * Math.cos(cycle)];
		leftHand = [-0.72, 0.24 + 0.04 * Math.sin(cycle + 1.2), -0.02];
	}

	const pelvis = [0, -0.18 + bob * 0.5, 0];
	const chest = [0, 0.32 + bob, 0];
	const head = [0, 0.83 + bob + (breathe - 1) * 0.08, 0];
	const leftShoulder = [-0.28, 0.52 + bob, -0.02];
	const rightShoulder = [0.28, 0.52 + bob, 0.02];
	const leftFoot = [-0.19, -0.95 + 0.05 * Math.sin(cycle), 0.04];
	const rightFoot = [0.19, -0.95 + 0.05 * Math.sin(cycle + Math.PI), -0.04];

	const primitiveWeights = [0.26, 0.12, 0.14, 0.1, 0.1, 0.11, 0.11, 0.06];
	const primitiveCounts = distributeCounts(totalPointCount, primitiveWeights);
	/** @param {number[]} position */
	const transform = (position) => {
		const rotated = rotateY(position, turnAngle);
		return [rotated[0] + sway, rotated[1], rotated[2]];
	};

	pushEllipsoidShellPoints(
		points,
		primitiveCounts[0],
		chest,
		[0.29 * scale, 0.46 * scale * breathe, 0.18 * scale],
		[236, 186, 92],
		cycle,
		transform,
	);
	pushEllipsoidShellPoints(
		points,
		primitiveCounts[1],
		pelvis,
		[0.24 * scale, 0.2 * scale, 0.18 * scale],
		[212, 110, 96],
		cycle + 0.7,
		transform,
	);
	pushEllipsoidShellPoints(
		points,
		primitiveCounts[2],
		head,
		[0.18 * scale, 0.22 * scale, 0.17 * scale],
		[248, 220, 188],
		cycle + 0.2,
		transform,
	);
	pushTubePoints(points, primitiveCounts[3], leftShoulder, leftHand, 0.075 * scale, [110, 210, 220], cycle, transform);
	pushTubePoints(points, primitiveCounts[4], rightShoulder, rightHand, 0.08 * scale, [252, 118, 132], cycle + 0.5, transform);
	pushTubePoints(points, primitiveCounts[5], [-0.14, -0.28 + bob * 0.4, 0], leftFoot, 0.09 * scale, [86, 128, 214], cycle + 0.25, transform);
	pushTubePoints(points, primitiveCounts[6], [0.14, -0.28 + bob * 0.4, 0], rightFoot, 0.09 * scale, [132, 156, 244], cycle + 0.8, transform);
	pushOrbitPoints(
		points,
		primitiveCounts[7],
		orbitCenter,
		orbitRadius[0] * scale,
		orbitRadius[1] * scale,
		[255, 244, 210],
		cycle,
		transform,
	);

	return points;
}

/**
 * @param {readonly {id: string, mode: 'loop' | 'once' | 'ping-pong'}[]} blueprints
 * @param {readonly number[]} clipFrameCounts
 */
function buildClipDefinitions(blueprints, clipFrameCounts) {
	let frameCursor = 0;

	return blueprints.map((blueprint, index) => {
		const count = clipFrameCounts[index];
		const startFrame = frameCursor;
		const endFrame = frameCursor + count - 1;
		frameCursor += count;

		return {
			id: blueprint.id,
			startFrame,
			endFrame,
			mode: blueprint.mode,
		};
	});
}

/**
 * @param {number} total
 * @param {number} segmentCount
 */
function partitionFrameCounts(total, segmentCount) {
	const base = Math.floor(total / segmentCount);
	const remainder = total % segmentCount;

	return Array.from({ length: segmentCount }, (_, index) => base + (index < remainder ? 1 : 0)).filter((count) => count > 0);
}

/**
 * @param {number} total
 * @param {readonly number[]} weights
 */
function distributeCounts(total, weights) {
	const normalizedTotal = weights.reduce((sum, weight) => sum + weight, 0);
	const counts = weights.map((weight) => Math.max(1, Math.floor((total * weight) / normalizedTotal)));
	let allocated = counts.reduce((sum, count) => sum + count, 0);
	let index = 0;

	while (allocated < total) {
		counts[index % counts.length] += 1;
		allocated += 1;
		index += 1;
	}

	index = counts.length - 1;
	while (allocated > total) {
		if (counts[index] > 1) {
			counts[index] -= 1;
			allocated -= 1;
		}
		index = index === 0 ? counts.length - 1 : index - 1;
	}

	return counts;
}

/**
 * @param {SyntheticPoint[]} points
 * @param {number} count
 * @param {number[]} center
 * @param {number[]} radii
 * @param {number[]} color
 * @param {number} phase
 * @param {(position: number[]) => number[]} transform
 */
function pushEllipsoidShellPoints(points, count, center, radii, color, phase, transform) {
	for (let i = 0; i < count; i++) {
		const t = count === 1 ? 0.5 : (i + 0.5) / count;
		const y = 1 - t * 2;
		const radial = Math.sqrt(Math.max(0, 1 - y * y));
		const theta = GOLDEN_ANGLE * i + phase * 0.35;
		const ripple = 1 + 0.05 * Math.sin(theta * 3 + phase);
		const local = [
			center[0] + Math.cos(theta) * radial * radii[0] * ripple,
			center[1] + y * radii[1],
			center[2] + Math.sin(theta) * radial * radii[2] * ripple,
		];
		appendPoint(points, transform(local), tintColor(color, 0.82 + 0.18 * t));
	}
}

/**
 * @param {SyntheticPoint[]} points
 * @param {number} count
 * @param {number[]} start
 * @param {number[]} end
 * @param {number} radius
 * @param {number[]} color
 * @param {number} phase
 * @param {(position: number[]) => number[]} transform
 */
function pushTubePoints(points, count, start, end, radius, color, phase, transform) {
	const axis = normalize(subtract(end, start));
	const reference = Math.abs(axis[1]) < 0.92 ? [0, 1, 0] : [1, 0, 0];
	const tangent = normalize(cross(axis, reference));
	const bitangent = normalize(cross(axis, tangent));

	for (let i = 0; i < count; i++) {
		const t = count === 1 ? 0.5 : (i + 0.5) / count;
		const theta = GOLDEN_ANGLE * i + phase * 0.8;
		const radial = radius * (0.7 + 0.3 * Math.sin(theta * 1.7 + phase));
		const center = lerp(start, end, t);
		const offset = add(
			scaleVector(tangent, Math.cos(theta) * radial),
			scaleVector(bitangent, Math.sin(theta) * radial),
		);
		appendPoint(points, transform(add(center, offset)), tintColor(color, 0.78 + 0.22 * t));
	}
}

/**
 * @param {SyntheticPoint[]} points
 * @param {number} count
 * @param {number[]} center
 * @param {number} radiusX
 * @param {number} radiusY
 * @param {number[]} color
 * @param {number} phase
 * @param {(position: number[]) => number[]} transform
 */
function pushOrbitPoints(points, count, center, radiusX, radiusY, color, phase, transform) {
	for (let i = 0; i < count; i++) {
		const t = count === 1 ? 0 : i / count;
		const theta = t * TAU + phase;
		const local = [
			center[0] + Math.cos(theta) * radiusX,
			center[1] + Math.sin(theta * 2) * radiusY,
			center[2] + Math.sin(theta) * radiusX * 0.7,
		];
		appendPoint(points, transform(local), tintColor(color, 0.86 + 0.14 * Math.sin(theta * 2)));
	}
}

/**
 * @param {SyntheticPoint[]} points
 * @param {number[]} position
 * @param {number[]} color
 */
function appendPoint(points, position, color) {
	points.push({
		x: round6(position[0]),
		y: round6(position[1]),
		z: round6(position[2]),
		r: clampByte(color[0]),
		g: clampByte(color[1]),
		b: clampByte(color[2]),
	});
}

/**
 * @param {number[]} color
 * @param {number} factor
 */
function tintColor(color, factor) {
	return color.map((channel) => clampByte(channel * factor));
}

/**
 * @param {number[]} a
 * @param {number[]} b
 */
function add(a, b) {
	return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/**
 * @param {number[]} a
 * @param {number[]} b
 */
function subtract(a, b) {
	return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

/**
 * @param {number[]} vector
 * @param {number} scalar
 */
function scaleVector(vector, scalar) {
	return [vector[0] * scalar, vector[1] * scalar, vector[2] * scalar];
}

/**
 * @param {number[]} a
 * @param {number[]} b
 * @param {number} t
 */
function lerp(a, b, t) {
	return [
		a[0] + (b[0] - a[0]) * t,
		a[1] + (b[1] - a[1]) * t,
		a[2] + (b[2] - a[2]) * t,
	];
}

/**
 * @param {number[]} a
 * @param {number[]} b
 */
function cross(a, b) {
	return [
		a[1] * b[2] - a[2] * b[1],
		a[2] * b[0] - a[0] * b[2],
		a[0] * b[1] - a[1] * b[0],
	];
}

/**
 * @param {number[]} vector
 */
function normalize(vector) {
	const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
	return [vector[0] / length, vector[1] / length, vector[2] / length];
}

/**
 * @param {number[]} position
 * @param {number} angle
 */
function rotateY(position, angle) {
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);
	return [
		position[0] * cos + position[2] * sin,
		position[1],
		-position[0] * sin + position[2] * cos,
	];
}

/**
 * @param {SyntheticPoint[]} points
 */
function encodeAsciiPly(points) {
	const header = [
		'ply',
		'format ascii 1.0',
		`element vertex ${points.length}`,
		'property float x',
		'property float y',
		'property float z',
		'property uchar red',
		'property uchar green',
		'property uchar blue',
		'end_header',
	];

	const body = points.map((point) => `${point.x} ${point.y} ${point.z} ${point.r} ${point.g} ${point.b}`);
	return new TextEncoder().encode([...header, ...body, ''].join('\n'));
}

/**
 * @param {number} value
 */
function round6(value) {
	return Number(value.toFixed(6));
}

/**
 * @param {number} value
 */
function clampByte(value) {
	return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * @param {number | string | undefined} value
 * @param {number} fallback
 */
function parsePositiveInteger(value, fallback) {
	if (value === undefined) return fallback;
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new Error(`Expected a positive integer, received ${value}.`);
	}
	return parsed;
}

/**
 * @param {number | string | undefined} value
 * @param {number} fallback
 */
function parsePositiveNumber(value, fallback) {
	if (value === undefined) return fallback;
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		throw new Error(`Expected a positive number, received ${value}.`);
	}
	return parsed;
}

/**
 * @param {string[]} argv
 * @returns {CliArgs}
 */
function parseArgs(argv) {
	/** @type {CliArgs} */
	const result = {};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '--') {
			continue;
		}
		if (!arg.startsWith('--')) {
			throw new Error(`Unexpected argument "${arg}".`);
		}

		const key = arg.slice(2);
		const value = argv[i + 1];
		if (!value || value.startsWith('--')) {
			throw new Error(`Missing value for --${key}.`);
		}
		if (!CLI_ARG_KEYS.includes(/** @type {keyof CliArgs} */ (key))) {
			throw new Error(`Unknown argument "--${key}".`);
		}
		const typedKey = /** @type {keyof CliArgs} */ (key);
		result[typedKey] = value;
		i++;
	}

	return result;
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const outputDir = args.output
		? path.resolve(process.cwd(), args.output)
		: path.join(repoRoot, 'tmp', 'synthetic-point-sequence');

	const result = await writeSyntheticPointSequence(outputDir, {
		frameCount: args.frames,
		pointCount: args.points,
		fps: args.fps,
		radius: args.radius,
		pulseAmplitude: args.pulseAmplitude,
	});

	console.log(
		JSON.stringify(
			{
				outputDir: result.outputDir,
				manifestPath: result.manifestPath,
				frameCount: result.manifest.frameCount,
				pointCount: result.manifest.processing.pointCount,
			},
			null,
			2,
		),
	);
}

if (process.argv[1] === __filename) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	});
}
