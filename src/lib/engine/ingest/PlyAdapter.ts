import type { SampleSet } from '../core/types.js';
import { createSampleSet } from '../core/SampleSet.js';
import type { IngestAdapter, PlyAdapterOptions } from './types.js';

type PlyFormat = 'ascii' | 'binary_little_endian';
type PlyScalarType =
	| 'int8'
	| 'uint8'
	| 'int16'
	| 'uint16'
	| 'int32'
	| 'uint32'
	| 'float32'
	| 'float64';

type VertexSemantic =
	| 'x'
	| 'y'
	| 'z'
	| 'red'
	| 'green'
	| 'blue'
	| 'alpha'
	| 'nx'
	| 'ny'
	| 'nz'
	| 'u'
	| 'v'
	| 'radius'
	| 'skip';

interface PlyProperty {
	name: string;
	kind: 'scalar' | 'list';
	type?: PlyScalarType;
	listCountType?: PlyScalarType;
	listValueType?: PlyScalarType;
}

interface PlyElement {
	name: string;
	count: number;
	properties: PlyProperty[];
}

interface ParsedHeader {
	format: PlyFormat;
	elements: PlyElement[];
	vertexElementIndex: number;
	dataOffset: number;
}

interface ScalarTypeInfo {
	size: number;
	integer: boolean;
	unsigned: boolean;
	maxValue?: number;
	read(view: DataView, offset: number, littleEndian: boolean): number;
}

const HEADER_END_LINE = 'end_header';

const TYPE_INFO: Record<PlyScalarType, ScalarTypeInfo> = {
	int8: {
		size: 1,
		integer: true,
		unsigned: false,
		maxValue: 127,
		read: (view, offset) => view.getInt8(offset),
	},
	uint8: {
		size: 1,
		integer: true,
		unsigned: true,
		maxValue: 255,
		read: (view, offset) => view.getUint8(offset),
	},
	int16: {
		size: 2,
		integer: true,
		unsigned: false,
		maxValue: 32767,
		read: (view, offset, littleEndian) => view.getInt16(offset, littleEndian),
	},
	uint16: {
		size: 2,
		integer: true,
		unsigned: true,
		maxValue: 65535,
		read: (view, offset, littleEndian) => view.getUint16(offset, littleEndian),
	},
	int32: {
		size: 4,
		integer: true,
		unsigned: false,
		maxValue: 2147483647,
		read: (view, offset, littleEndian) => view.getInt32(offset, littleEndian),
	},
	uint32: {
		size: 4,
		integer: true,
		unsigned: true,
		maxValue: 4294967295,
		read: (view, offset, littleEndian) => view.getUint32(offset, littleEndian),
	},
	float32: {
		size: 4,
		integer: false,
		unsigned: false,
		read: (view, offset, littleEndian) => view.getFloat32(offset, littleEndian),
	},
	float64: {
		size: 8,
		integer: false,
		unsigned: false,
		read: (view, offset, littleEndian) => view.getFloat64(offset, littleEndian),
	},
};

const TYPE_ALIASES: Record<string, PlyScalarType> = {
	char: 'int8',
	int8: 'int8',
	uchar: 'uint8',
	uint8: 'uint8',
	short: 'int16',
	int16: 'int16',
	ushort: 'uint16',
	uint16: 'uint16',
	int: 'int32',
	int32: 'int32',
	uint: 'uint32',
	uint32: 'uint32',
	float: 'float32',
	float32: 'float32',
	double: 'float64',
	float64: 'float64',
};

const POSITION_ALIASES: Record<'x' | 'y' | 'z', readonly string[]> = {
	x: ['x'],
	y: ['y'],
	z: ['z'],
};

const NORMAL_ALIASES: Record<'nx' | 'ny' | 'nz', readonly string[]> = {
	nx: ['nx', 'normal_x'],
	ny: ['ny', 'normal_y'],
	nz: ['nz', 'normal_z'],
};

const UV_ALIASES: Record<'u' | 'v', readonly string[]> = {
	u: ['u', 's', 'texture_u', 'texcoord_u'],
	v: ['v', 't', 'texture_v', 'texcoord_v'],
};

const COLOR_ALIASES: Record<'red' | 'green' | 'blue' | 'alpha', readonly string[]> = {
	red: ['red', 'r', 'diffuse_red'],
	green: ['green', 'g', 'diffuse_green'],
	blue: ['blue', 'b', 'diffuse_blue'],
	alpha: ['alpha', 'a', 'opacity'],
};

const RADIUS_ALIASES: readonly string[] = ['radius', 'radii', 'point_size', 'size'];

/**
 * Parses PLY point clouds into the canonical SampleSet layout.
 *
 * The adapter stays pure: callers own file loading and asset routing policy.
 */
export class PlyAdapter implements IngestAdapter<ArrayBuffer, PlyAdapterOptions> {
	readonly name = 'ply';

	sample(source: ArrayBuffer, options: PlyAdapterOptions = {}): SampleSet {
		const header = this.parseHeader(source);
		const vertexElement = header.elements[header.vertexElementIndex];
		this.assertVertexElementSupported(vertexElement);

		return header.format === 'ascii'
			? this.parseAscii(source, header, vertexElement, options)
			: this.parseBinaryLittleEndian(source, header, vertexElement, options);
	}

	private parseAscii(
		source: ArrayBuffer,
		header: ParsedHeader,
		vertexElement: PlyElement,
		options: PlyAdapterOptions,
	): SampleSet {
		const bodyText = new TextDecoder().decode(new Uint8Array(source, header.dataOffset));
		const bodyLines = bodyText.split(/\r?\n/);

		const samples = this.createOutput(vertexElement, options);
		const semantics = this.resolveVertexSemantics(vertexElement);

		for (let elementIndex = 0; elementIndex < header.elements.length; elementIndex++) {
			const element = header.elements[elementIndex];

			for (let record = 0; record < element.count; record++) {
				const line = this.consumeNextAsciiLine(bodyLines, element.name, record);

				if (elementIndex !== header.vertexElementIndex) {
					continue;
				}

				const tokens = line.trim().split(/\s+/);
				if (tokens.length !== vertexElement.properties.length) {
					throw new Error(
						`ASCII PLY vertex ${record} expected ${vertexElement.properties.length} scalar values but received ${tokens.length}.`,
					);
				}

				this.assignAsciiVertex(samples, vertexElement, semantics, record, tokens);
			}
		}

		return samples;
	}

	private parseBinaryLittleEndian(
		source: ArrayBuffer,
		header: ParsedHeader,
		vertexElement: PlyElement,
		options: PlyAdapterOptions,
	): SampleSet {
		let byteOffset = header.dataOffset;

		for (let i = 0; i < header.vertexElementIndex; i++) {
			const element = header.elements[i];
			byteOffset += this.getFixedBinaryElementSize(element) * element.count;
		}

		const vertexStride = this.getFixedBinaryElementSize(vertexElement);
		const requiredBytes = vertexStride * vertexElement.count;
		if (byteOffset + requiredBytes > source.byteLength) {
			throw new Error(
				`Binary PLY vertex payload is truncated: expected ${requiredBytes} bytes but only ${source.byteLength - byteOffset} remain.`,
			);
		}

		const view = new DataView(source, byteOffset, requiredBytes);
		const semantics = this.resolveVertexSemantics(vertexElement);
		const samples = this.createOutput(vertexElement, options);

		let cursor = 0;
		for (let vertexIndex = 0; vertexIndex < vertexElement.count; vertexIndex++) {
			const i3 = vertexIndex * 3;
			const i2 = vertexIndex * 2;
			samples.ids![vertexIndex] = vertexIndex;

			for (let propertyIndex = 0; propertyIndex < vertexElement.properties.length; propertyIndex++) {
				const property = vertexElement.properties[propertyIndex];
				const typeInfo = TYPE_INFO[property.type!];
				const value = typeInfo.read(view, cursor, true);
				cursor += typeInfo.size;

				this.assignVertexScalar(
					samples,
					semantics[propertyIndex],
					property.type!,
					vertexIndex,
					i2,
					i3,
					value,
				);
			}
		}

		return samples;
	}

	private assignAsciiVertex(
		samples: SampleSet,
		vertexElement: PlyElement,
		semantics: VertexSemantic[],
		vertexIndex: number,
		tokens: string[],
	): void {
		const i3 = vertexIndex * 3;
		const i2 = vertexIndex * 2;
		samples.ids![vertexIndex] = vertexIndex;

		for (let propertyIndex = 0; propertyIndex < vertexElement.properties.length; propertyIndex++) {
			const property = vertexElement.properties[propertyIndex];
			const rawValue = Number(tokens[propertyIndex]);
			if (!Number.isFinite(rawValue)) {
				throw new Error(
					`ASCII PLY vertex ${vertexIndex} property "${property.name}" is not a finite number: ${tokens[propertyIndex]}.`,
				);
			}
			if (TYPE_INFO[property.type!].integer && !Number.isInteger(rawValue)) {
				throw new Error(
					`ASCII PLY vertex ${vertexIndex} property "${property.name}" must be an integer for type ${property.type}.`,
				);
			}

			this.assignVertexScalar(
				samples,
				semantics[propertyIndex],
				property.type!,
				vertexIndex,
				i2,
				i3,
				rawValue,
			);
		}
	}

	private assignVertexScalar(
		samples: SampleSet,
		semantic: VertexSemantic,
		type: PlyScalarType,
		vertexIndex: number,
		i2: number,
		i3: number,
		value: number,
	): void {
		switch (semantic) {
			case 'x':
				samples.positions[i3] = value;
				return;
			case 'y':
				samples.positions[i3 + 1] = value;
				return;
			case 'z':
				samples.positions[i3 + 2] = value;
				return;
			case 'red':
				samples.colors[i3] = this.normalizeColorValue(value, type);
				return;
			case 'green':
				samples.colors[i3 + 1] = this.normalizeColorValue(value, type);
				return;
			case 'blue':
				samples.colors[i3 + 2] = this.normalizeColorValue(value, type);
				return;
			case 'alpha':
				samples.opacities[vertexIndex] = this.normalizeColorValue(value, type);
				return;
			case 'nx':
				if (samples.normals) samples.normals[i3] = value;
				return;
			case 'ny':
				if (samples.normals) samples.normals[i3 + 1] = value;
				return;
			case 'nz':
				if (samples.normals) samples.normals[i3 + 2] = value;
				return;
			case 'u':
				if (samples.uv) samples.uv[i2] = value;
				return;
			case 'v':
				if (samples.uv) samples.uv[i2 + 1] = value;
				return;
			case 'radius':
				samples.radii[vertexIndex] = value;
				return;
			case 'skip':
				return;
		}
	}

	private createOutput(vertexElement: PlyElement, options: PlyAdapterOptions): SampleSet {
		const semantics = this.resolveVertexSemantics(vertexElement);
		const includeNormals =
			semantics.includes('nx') && semantics.includes('ny') && semantics.includes('nz');
		const includeUv = semantics.includes('u') && semantics.includes('v');
		const samples = createSampleSet({
			count: vertexElement.count,
			includeIds: true,
			includeNormals,
			includeUv,
		});

		samples.colors.fill(1.0);
		samples.radii.fill(options.defaultRadius ?? 1.0);
		samples.opacities.fill(options.defaultOpacity ?? 1.0);

		return samples;
	}

	private resolveVertexSemantics(vertexElement: PlyElement): VertexSemantic[] {
		const semantics = vertexElement.properties.map((property) =>
			this.resolveSemantic(property.name.toLowerCase()),
		);

		this.requireRequiredSemanticSet(semantics, POSITION_ALIASES.x[0], 'x');
		this.requireRequiredSemanticSet(semantics, POSITION_ALIASES.y[0], 'y');
		this.requireRequiredSemanticSet(semantics, POSITION_ALIASES.z[0], 'z');

		this.assertSemanticGroupComplete(semantics, ['red', 'green', 'blue'], 'color');
		this.assertSemanticGroupComplete(semantics, ['nx', 'ny', 'nz'], 'normal');
		this.assertSemanticGroupComplete(semantics, ['u', 'v'], 'uv');

		return semantics;
	}

	private requireRequiredSemanticSet(
		semantics: VertexSemantic[],
		_propertyName: string,
		required: VertexSemantic,
	): void {
		if (!semantics.includes(required)) {
			throw new Error(`PLY vertex element is missing required "${required}" property.`);
		}
	}

	private assertSemanticGroupComplete(
		semantics: VertexSemantic[],
		group: VertexSemantic[],
		label: string,
	): void {
		const presentCount = group.filter((semantic) => semantics.includes(semantic)).length;
		if (presentCount > 0 && presentCount !== group.length) {
			throw new Error(`PLY vertex element has incomplete ${label} properties; expected ${group.join(', ')}.`);
		}
	}

	private resolveSemantic(propertyName: string): VertexSemantic {
		if (POSITION_ALIASES.x.includes(propertyName)) return 'x';
		if (POSITION_ALIASES.y.includes(propertyName)) return 'y';
		if (POSITION_ALIASES.z.includes(propertyName)) return 'z';
		if (NORMAL_ALIASES.nx.includes(propertyName)) return 'nx';
		if (NORMAL_ALIASES.ny.includes(propertyName)) return 'ny';
		if (NORMAL_ALIASES.nz.includes(propertyName)) return 'nz';
		if (UV_ALIASES.u.includes(propertyName)) return 'u';
		if (UV_ALIASES.v.includes(propertyName)) return 'v';
		if (COLOR_ALIASES.red.includes(propertyName)) return 'red';
		if (COLOR_ALIASES.green.includes(propertyName)) return 'green';
		if (COLOR_ALIASES.blue.includes(propertyName)) return 'blue';
		if (COLOR_ALIASES.alpha.includes(propertyName)) return 'alpha';
		if (RADIUS_ALIASES.includes(propertyName)) return 'radius';
		return 'skip';
	}

	private normalizeColorValue(value: number, type: PlyScalarType): number {
		const info = TYPE_INFO[type];
		if (!info.integer) {
			return Math.min(Math.max(value, 0), 1);
		}

		const normalized = value / (info.maxValue ?? 1);
		return Math.min(Math.max(normalized, 0), 1);
	}

	private parseHeader(source: ArrayBuffer): ParsedHeader {
		const { headerText, dataOffset } = this.extractHeader(source);
		const lines = headerText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

		if (lines[0] !== 'ply') {
			throw new Error('Invalid PLY header: first line must be "ply".');
		}

		let format: PlyFormat | null = null;
		const elements: PlyElement[] = [];
		let currentElement: PlyElement | null = null;

		for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
			const line = lines[lineIndex];
			if (line === HEADER_END_LINE) break;

			const tokens = line.split(/\s+/);
			switch (tokens[0]) {
				case 'comment':
				case 'obj_info':
					continue;
				case 'format': {
					if (tokens.length !== 3) {
						throw new Error(`Invalid PLY format declaration: "${line}".`);
					}
					format = this.parseFormat(tokens[1], tokens[2]);
					continue;
				}
				case 'element': {
					if (tokens.length !== 3) {
						throw new Error(`Invalid PLY element declaration: "${line}".`);
					}
					const count = Number(tokens[2]);
					if (!Number.isInteger(count) || count < 0) {
						throw new Error(`Invalid PLY element count in declaration: "${line}".`);
					}
					currentElement = { name: tokens[1], count, properties: [] };
					elements.push(currentElement);
					continue;
				}
				case 'property': {
					if (!currentElement) {
						throw new Error(`PLY property declared before any element: "${line}".`);
					}
					currentElement.properties.push(this.parseProperty(line, tokens));
					continue;
				}
				default:
					throw new Error(`Unsupported or malformed PLY header line: "${line}".`);
			}
		}

		if (!format) {
			throw new Error('Invalid PLY header: missing format declaration.');
		}

		const vertexElementIndex = elements.findIndex((element) => element.name === 'vertex');
		if (vertexElementIndex === -1) {
			throw new Error('PLY header does not declare a vertex element.');
		}

		return {
			format,
			elements,
			vertexElementIndex,
			dataOffset,
		};
	}

	private parseFormat(rawFormat: string, version: string): PlyFormat {
		if (version !== '1.0') {
			throw new Error(`Unsupported PLY version "${version}".`);
		}

		if (rawFormat === 'ascii') return 'ascii';
		if (rawFormat === 'binary_little_endian') return 'binary_little_endian';
		if (rawFormat === 'binary_big_endian') {
			throw new Error('Unsupported PLY format "binary_big_endian"; use binary_little_endian or ascii.');
		}
		if (rawFormat.includes('compressed')) {
			throw new Error(`Unsupported PLY format "${rawFormat}"; compressed variants are not supported.`);
		}

		throw new Error(`Unsupported PLY format "${rawFormat}".`);
	}

	private parseProperty(line: string, tokens: string[]): PlyProperty {
		if (tokens[1] === 'list') {
			if (tokens.length !== 5) {
				throw new Error(`Invalid PLY list property declaration: "${line}".`);
			}
			return {
				name: tokens[4],
				kind: 'list',
				listCountType: this.normalizeScalarType(tokens[2], line),
				listValueType: this.normalizeScalarType(tokens[3], line),
			};
		}

		if (tokens.length !== 3) {
			throw new Error(`Invalid PLY property declaration: "${line}".`);
		}

		return {
			name: tokens[2],
			kind: 'scalar',
			type: this.normalizeScalarType(tokens[1], line),
		};
	}

	private normalizeScalarType(rawType: string, line: string): PlyScalarType {
		const normalized = TYPE_ALIASES[rawType];
		if (!normalized) {
			throw new Error(`Unsupported PLY scalar type "${rawType}" in line "${line}".`);
		}
		return normalized;
	}

	private extractHeader(source: ArrayBuffer): { headerText: string; dataOffset: number } {
		const bytes = new Uint8Array(source);
		const decoder = new TextDecoder();
		let lineStart = 0;

		for (let i = 0; i < bytes.length; i++) {
			if (bytes[i] !== 0x0a) continue;

			const lineEnd = i > lineStart && bytes[i - 1] === 0x0d ? i - 1 : i;
			const line = decoder.decode(bytes.subarray(lineStart, lineEnd));
			const dataOffset = i + 1;

			if (line.trim() === HEADER_END_LINE) {
				return {
					headerText: decoder.decode(bytes.subarray(0, dataOffset)),
					dataOffset,
				};
			}

			lineStart = dataOffset;
		}

		throw new Error('Invalid PLY header: missing end_header terminator.');
	}

	private assertVertexElementSupported(vertexElement: PlyElement): void {
		for (const property of vertexElement.properties) {
			if (property.kind === 'list') {
				throw new Error(
					`Unsupported PLY vertex property "${property.name}": list properties are not supported in vertex payloads.`,
				);
			}
		}
	}

	private getFixedBinaryElementSize(element: PlyElement): number {
		let size = 0;

		for (const property of element.properties) {
			if (property.kind === 'list') {
				throw new Error(
					`Unsupported binary PLY element "${element.name}": list properties cannot be skipped without parsing.`,
				);
			}
			size += TYPE_INFO[property.type!].size;
		}

		return size;
	}

	private consumeNextAsciiLine(
		lines: string[],
		elementName: string,
		recordIndex: number,
	): string {
		while (lines.length > 0) {
			const line = lines.shift()!;
			if (line.trim() === '') continue;
			return line;
		}

		throw new Error(
			`ASCII PLY ended before element "${elementName}" record ${recordIndex} could be read.`,
		);
	}
}
