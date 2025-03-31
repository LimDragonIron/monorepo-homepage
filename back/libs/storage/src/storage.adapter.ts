import { Logger } from '@nestjs/common';
import { StorageFile } from '.';

export abstract class StorageAdapter {
  protected readonly logger = new Logger(StorageAdapter.name);

  abstract upload(
    file: StorageFile,
    generateFileName: (fileName: string) => string,
  ): Promise<string>;

  abstract download(path: string): Promise<Buffer>;
}
