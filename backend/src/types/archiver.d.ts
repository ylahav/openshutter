declare module 'archiver' {
	import type { ZlibOptions } from 'zlib';
	import { Transform } from 'stream';

	export interface ZipArchiveOptions {
		zlib?: ZlibOptions;
		highWaterMark?: number;
		statConcurrency?: number;
	}

	/** Archiver v8 ESM API; @types/archiver@7 only models the removed default factory. */
	export class ZipArchive extends Transform {
		constructor(options?: ZipArchiveOptions);
		directory(dirpath: string, destpath: false | string): this;
		file(filename: string, data: { name: string }): this;
		finalize(): void;
		pipe<T extends NodeJS.WritableStream>(destination: T): T;
		on(event: 'error', listener: (err: Error) => void): this;
		on(event: 'end' | 'close' | 'drain' | 'finish', listener: () => void): this;
		on(event: 'data', listener: (chunk: Buffer) => void): this;
		on(event: string, listener: (...args: unknown[]) => void): this;
	}
}
