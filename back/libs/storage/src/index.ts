export * from './storage.module';

export type StorageFile = {
  originalName: string;
  buffer: Buffer;
};
