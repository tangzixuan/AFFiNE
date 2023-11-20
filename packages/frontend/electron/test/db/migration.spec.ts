import path from 'node:path';

import {
  copyToTemp,
  migrateToSubdocAndReplaceDatabase,
} from '@affine/electron/helper/db/migration';
import { SqliteConnection } from '@affine/native';
import { removeWithRetry } from '@affine-test/kit/utils/utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyUpdate, Doc as YDoc } from 'yjs';

const tmpDir = path.join(__dirname, 'tmp');
const testDBFilePath = path.resolve(__dirname, 'old-db.affine');

const appDataPath = path.join(tmpDir, 'app-data');

vi.mock('@affine/electron/helper/main-rpc', () => ({
  mainRPC: {
    getPath: async () => appDataPath,
  },
}));

afterEach(async () => {
  await removeWithRetry(tmpDir);
});

describe('migrateToSubdocAndReplaceDatabase', () => {
  it('should migrate and replace the database', async () => {
    const copiedDbFilePath = await copyToTemp(testDBFilePath);
    await migrateToSubdocAndReplaceDatabase(copiedDbFilePath);

    const db = new SqliteConnection(copiedDbFilePath);
    await db.connect();

    // check if db has two rows, one for root doc and one for subdoc
    const rows = await db.getAllUpdates();
    expect(rows.length).toBe(2);

    const rootUpdate = rows.find(row => row.docId === undefined)!.data;
    const subdocUpdate = rows.find(row => row.docId !== undefined)!.data;

    expect(rootUpdate).toBeDefined();
    expect(subdocUpdate).toBeDefined();

    // apply updates
    const rootDoc = new YDoc();
    applyUpdate(rootDoc, rootUpdate);

    // check if root doc has one subdoc
    expect(rootDoc.subdocs.size).toBe(1);

    // populates subdoc
    applyUpdate(rootDoc.subdocs.values().next().value, subdocUpdate);

    // check if root doc's meta is correct
    const meta = rootDoc.getMap('meta').toJSON();
    expect(meta.workspaceVersion).toBe(1);
    expect(meta.name).toBe('hiw');
    expect(meta.pages.length).toBe(1);
    const pageMeta = meta.pages[0];
    expect(pageMeta.title).toBe('Welcome to AFFiNEd');

    // get the subdoc through id
    const subDoc = rootDoc.getMap('spaces').get(pageMeta.id) as YDoc;
    expect(subDoc).toEqual(rootDoc.subdocs.values().next().value);

    await db.close();
  });
});
