import { assertExists } from '@blocksuite/global/utils';
import type { BlobStorage } from '@blocksuite/store';

import { bufferToBlob } from './util';

export const createSQLiteStorage = (workspaceId: string): BlobStorage => {
  const apis = window.apis;
  assertExists(apis);
  return {
    crud: {
      get: async (key: string) => {
        const buffer = await apis.db.getBlob(workspaceId, key);
        if (buffer) {
          return bufferToBlob(buffer);
        }
        return null;
      },
      set: async (key: string, value: Blob) => {
        await apis.db.addBlob(
          workspaceId,
          key,
          new Uint8Array(await value.arrayBuffer())
        );
        return key;
      },
      delete: async (key: string) => {
        return apis.db.deleteBlob(workspaceId, key);
      },
      list: async () => {
        return apis.db.getBlobKeys(workspaceId);
      },
    },
  };
};
