declare module "archiver" {
  import { Transform } from "node:stream";

  export interface ZipEntryData {
    name: string;
    store?: boolean;
    date?: Date | string;
  }

  export class ZipArchive extends Transform {
    constructor(options?: { zlib?: { level?: number }; store?: boolean; forceZip64?: boolean });
    append(source: NodeJS.ReadableStream | Buffer | string, data: ZipEntryData): this;
    file(filepath: string, data: ZipEntryData): this;
    finalize(): Promise<void>;
    abort(): this;
    pointer(): number;
  }
}
