import type { SampleSet } from '../core/types.js';

export interface ProcessorParams {
	[key: string]: number | boolean | string;
}

/** A composable transform over a SampleSet. */
export interface SampleProcessor {
	readonly name: string;
	process(samples: SampleSet, params: ProcessorParams): SampleSet;
}
