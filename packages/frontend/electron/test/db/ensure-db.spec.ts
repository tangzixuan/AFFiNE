import path from 'node:path';
import { setTimeout } from 'node:timers/promises';

import { removeWithRetry } from '@affine-test/kit/utils/utils';
import { v4 } from 'uuid';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

const tmpDir = path.join(__dirname, 'tmp');
const appDataPath = path.join(tmpDir, 'app-data');

vi.doMock('@affine/electron/helper/main-rpc', () => ({
  mainRPC: {
    getPath: async () => appDataPath,
  },
}));

const constructorStub = vi.fn();
const destroyStub = vi.fn();
destroyStub.mockReturnValue(Promise.resolve());

function existProcess() {
  process.emit('beforeExit', 0);
}

vi.doMock('@affine/electron/helper/db/secondary-db', () => {
  return {
    SecondaryWorkspaceSQLiteDB: class {
      constructor(...args: any[]) {
        constructorStub(...args);
      }

      connectIfNeeded = () => Promise.resolve();

      pull = () => Promise.resolve();

      destroy = destroyStub;
    },
  };
});

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(async () => {
  existProcess();
  await removeWithRetry(tmpDir);
  vi.useRealTimers();
});

test('can get a valid WorkspaceSQLiteDB', async () => {
  const { ensureSQLiteDB } = await import(
    '@affine/electron/helper/db/ensure-db'
  );
  const workspaceId = v4();
  const db0 = await ensureSQLiteDB(workspaceId);
  expect(db0).toBeDefined();
  expect(db0.workspaceId).toBe(workspaceId);

  const db1 = await ensureSQLiteDB(v4());
  expect(db1).not.toBe(db0);
  expect(db1.workspaceId).not.toBe(db0.workspaceId);

  // ensure that the db is cached
  expect(await ensureSQLiteDB(workspaceId)).toBe(db0);
});

test('db should be destroyed when app quits', async () => {
  const { ensureSQLiteDB } = await import(
    '@affine/electron/helper/db/ensure-db'
  );
  const workspaceId = v4();
  const db0 = await ensureSQLiteDB(workspaceId);
  const db1 = await ensureSQLiteDB(v4());

  expect(db0.db).not.toBeNull();
  expect(db1.db).not.toBeNull();

  existProcess();

  // wait the async `db.destroy()` to be called
  await setTimeout(100);

  expect(db0.db).toBeNull();
  expect(db1.db).toBeNull();
});

test('db should be removed in db$Map after destroyed', async () => {
  const { ensureSQLiteDB, db$Map } = await import(
    '@affine/electron/helper/db/ensure-db'
  );
  const workspaceId = v4();
  const db = await ensureSQLiteDB(workspaceId);
  await db.destroy();
  await setTimeout(100);
  expect(db$Map.has(workspaceId)).toBe(false);
});

// we have removed secondary db feature
test.skip('if db has a secondary db path, we should also poll that', async () => {
  const { ensureSQLiteDB } = await import(
    '@affine/electron/helper/db/ensure-db'
  );
  const { storeWorkspaceMeta } = await import(
    '@affine/electron/helper/workspace'
  );
  const workspaceId = v4();
  await storeWorkspaceMeta(workspaceId, {
    secondaryDBPath: path.join(tmpDir, 'secondary.db'),
  });

  const db = await ensureSQLiteDB(workspaceId);

  await setTimeout(10);

  expect(constructorStub).toBeCalledTimes(1);
  expect(constructorStub).toBeCalledWith(path.join(tmpDir, 'secondary.db'), db);

  // if secondary meta is changed
  await storeWorkspaceMeta(workspaceId, {
    secondaryDBPath: path.join(tmpDir, 'secondary2.db'),
  });

  // wait the async `db.destroy()` to be called
  await setTimeout(100);
  expect(constructorStub).toBeCalledTimes(2);
  expect(destroyStub).toBeCalledTimes(1);

  // if secondary meta is changed (but another workspace)
  await storeWorkspaceMeta(v4(), {
    secondaryDBPath: path.join(tmpDir, 'secondary3.db'),
  });
  await vi.advanceTimersByTimeAsync(1500);
  expect(constructorStub).toBeCalledTimes(2);
  expect(destroyStub).toBeCalledTimes(1);

  // if primary is destroyed, secondary should also be destroyed
  await db.destroy();
  await setTimeout(100);
  expect(destroyStub).toBeCalledTimes(2);
});
