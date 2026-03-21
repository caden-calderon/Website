import type { SampleSet } from '../core/types.js';
import type { SampleProcessor, ProcessorParams } from './types.js';

interface PipelineEntry {
	processor: SampleProcessor;
	params: ProcessorParams;
}

/** Ordered chain of SampleProcessors. */
export class Pipeline {
	private entries: PipelineEntry[] = [];

	add(processor: SampleProcessor, params: ProcessorParams = {}): this {
		this.entries.push({ processor, params });
		return this;
	}

	remove(name: string): this {
		this.entries = this.entries.filter((e) => e.processor.name !== name);
		return this;
	}

	clear(): this {
		this.entries = [];
		return this;
	}

	/** Run every processor in order, threading the SampleSet through. */
	run(samples: SampleSet): SampleSet {
		return this.entries.reduce(
			(current, { processor, params }) => processor.process(current, params),
			samples,
		);
	}
}
