import { StorageAdapter } from './storage.adapter';
import { Injectable } from '@nestjs/common';
import { join, resolve } from 'path';
import * as process from 'process';
import * as fse from 'fs-extra';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import { StorageFile } from './';

@Injectable()
export class LocalStorage extends StorageAdapter {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async upload(
    { originalName, buffer }: StorageFile,
    generateFileName: (fileName: string) => string,
  ): Promise<string> {
    const root = this.config.getOrThrow('storage.root');
    await fse.ensureDir(resolve(process.cwd(), root));

    const path = join(root, generateFileName(originalName));
    const target = resolve(process.cwd(), path);
    await fse.writeFile(target, buffer);

    this.logger.log(
      `file was uploaded successfully. file path is ${generateFileName(
        originalName,
      )}`,
    );

    return path;
  }

  async download(path: string): Promise<Buffer> {
    this.logger.log('local storage download...');
    const target = resolve(process.cwd(), path);
    return await fs.readFile(target);
  }
}
