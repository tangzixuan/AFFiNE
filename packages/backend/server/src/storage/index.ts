import { createRequire } from 'node:module';

import { type DynamicModule, type FactoryProvider } from '@nestjs/common';

import { Config } from '../config';

export const StorageProvide = Symbol('Storage');

let storageModule: typeof import('@affine/storage');
try {
  storageModule = await import('@affine/storage');
} catch {
  const require = createRequire(import.meta.url);
  storageModule =
    process.arch === 'arm64'
      ? require('../../storage.arm64.node')
      : require('../../storage.node');
}

export class StorageModule {
  static forRoot(): DynamicModule {
    const storageProvider: FactoryProvider = {
      provide: StorageProvide,
      useFactory: async (config: Config) => {
        return storageModule.Storage.connect(config.db.url);
      },
      inject: [Config],
    };

    return {
      global: true,
      module: StorageModule,
      providers: [storageProvider],
      exports: [storageProvider],
    };
  }
}

export const mergeUpdatesInApplyWay = storageModule.mergeUpdatesInApplyWay;

export const verifyChallengeResponse = async (
  response: any,
  bits: number,
  resource: string
) => {
  if (typeof response !== 'string' || !response || !resource) return false;
  return storageModule.verifyChallengeResponse(response, bits, resource);
};

export const mintChallengeResponse = async (resource: string, bits: number) => {
  if (!resource) return null;
  return storageModule.mintChallengeResponse(resource, bits);
};
