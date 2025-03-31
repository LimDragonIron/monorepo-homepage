import { Module, Provider } from '@nestjs/common';
import { StorageAdapter } from './storage.adapter';
import { ConfigService } from '@nestjs/config';
import { LocalStorage } from './local-storage';

const StorageProvider: Provider = {
  provide: StorageAdapter,
  useFactory: (config: ConfigService) => {
    const storageType = process.env.NODE_ENV;
    switch (storageType) {
      case 'local':
        return new LocalStorage(config);
      case 'dev':
        return new LocalStorage(config);
      case 'prod':
        return new LocalStorage(config);
      default:
        throw new Error(`Unknown storage type: ${storageType}`);
    }
  },
  inject: [ConfigService],
};

@Module({
  providers: [StorageProvider],
  exports: [StorageProvider],
})
export class StorageModule {}
