import type { IDBPDatabase } from 'idb';
import { openDB } from 'idb';
import { applyUpdate, Doc, encodeStateAsUpdate } from 'yjs';

import type { BlockSuiteBinaryDB, OldYjsDB, UpdateMessage } from './shared';
import { dbVersion, DEFAULT_DB_NAME, upgradeDB } from './shared';

let allDb: IDBDatabaseInfo[];

export function mergeUpdates(updates: Uint8Array[]) {
  const doc = new Doc();
  updates.forEach(update => {
    applyUpdate(doc, update);
  });
  return encodeStateAsUpdate(doc);
}

async function databaseExists(name: string): Promise<boolean> {
  return new Promise(resolve => {
    const req = indexedDB.open(name);
    let existed = true;
    req.onsuccess = function () {
      req.result.close();
      if (!existed) {
        indexedDB.deleteDatabase(name);
      }
      resolve(existed);
    };
    req.onupgradeneeded = function () {
      existed = false;
    };
  });
}

/**
 * try to migrate the old database to the new database
 * this function will be removed in the future
 * since we don't need to support the old database
 */
export async function tryMigrate(
  db: IDBPDatabase<BlockSuiteBinaryDB>,
  id: string,
  dbName = DEFAULT_DB_NAME
) {
  do {
    if (!allDb || localStorage.getItem(`${dbName}-migration`) !== 'true') {
      try {
        allDb = await indexedDB.databases();
      } catch {
        // in firefox, `indexedDB.databases` is not existed
        if (await databaseExists(id)) {
          await openDB<IDBPDatabase<OldYjsDB>>(id, 1).then(async oldDB => {
            if (!oldDB.objectStoreNames.contains('updates')) {
              return;
            }
            const t = oldDB
              .transaction('updates', 'readonly')
              .objectStore('updates');
            const updates = await t.getAll();
            if (
              !Array.isArray(updates) ||
              !updates.every(update => update instanceof Uint8Array)
            ) {
              return;
            }
            const update = mergeUpdates(updates);
            const workspaceTransaction = db
              .transaction('workspace', 'readwrite')
              .objectStore('workspace');
            const data = await workspaceTransaction.get(id);
            if (!data) {
              console.log('upgrading the database');
              await workspaceTransaction.put({
                id,
                updates: [
                  {
                    timestamp: Date.now(),
                    update,
                  },
                ],
              });
            }
          });
          break;
        }
      }
      // run the migration
      await Promise.all(
        allDb &&
          allDb.map(meta => {
            if (meta.name && meta.version === 1) {
              const name = meta.name;
              const version = meta.version;
              return openDB<IDBPDatabase<OldYjsDB>>(name, version).then(
                async oldDB => {
                  if (!oldDB.objectStoreNames.contains('updates')) {
                    return;
                  }
                  const t = oldDB
                    .transaction('updates', 'readonly')
                    .objectStore('updates');
                  const updates = await t.getAll();
                  if (
                    !Array.isArray(updates) ||
                    !updates.every(update => update instanceof Uint8Array)
                  ) {
                    return;
                  }
                  const update = mergeUpdates(updates);
                  const workspaceTransaction = db
                    .transaction('workspace', 'readwrite')
                    .objectStore('workspace');
                  const data = await workspaceTransaction.get(name);
                  if (!data) {
                    console.log('upgrading the database');
                    await workspaceTransaction.put({
                      id: name,
                      updates: [
                        {
                          timestamp: Date.now(),
                          update,
                        },
                      ],
                    });
                  }
                }
              );
            }
            return void 0;
          })
      );
      localStorage.setItem(`${dbName}-migration`, 'true');
      break;
    }
    // eslint-disable-next-line no-constant-condition
  } while (false);
}

export async function downloadBinary(
  guid: string,
  dbName = DEFAULT_DB_NAME
): Promise<UpdateMessage['update'] | false> {
  const dbPromise = openDB<BlockSuiteBinaryDB>(dbName, dbVersion, {
    upgrade: upgradeDB,
  });
  const db = await dbPromise;
  const t = db.transaction('workspace', 'readonly').objectStore('workspace');
  const doc = await t.get(guid);
  if (!doc) {
    return false;
  } else {
    return mergeUpdates(doc.updates.map(({ update }) => update));
  }
}

export async function overwriteBinary(
  guid: string,
  update: UpdateMessage['update'],
  dbName = DEFAULT_DB_NAME
) {
  const dbPromise = openDB<BlockSuiteBinaryDB>(dbName, dbVersion, {
    upgrade: upgradeDB,
  });
  const db = await dbPromise;
  const t = db.transaction('workspace', 'readwrite').objectStore('workspace');
  await t.put({
    id: guid,
    updates: [
      {
        timestamp: Date.now(),
        update,
      },
    ],
  });
}

export async function pushBinary(
  guid: string,
  update: UpdateMessage['update'],
  dbName = DEFAULT_DB_NAME
) {
  const dbPromise = openDB<BlockSuiteBinaryDB>(dbName, dbVersion, {
    upgrade: upgradeDB,
  });
  const db = await dbPromise;
  const t = db.transaction('workspace', 'readwrite').objectStore('workspace');
  const doc = await t.get(guid);
  if (!doc) {
    await t.put({
      id: guid,
      updates: [
        {
          timestamp: Date.now(),
          update,
        },
      ],
    });
  } else {
    doc.updates.push({
      timestamp: Date.now(),
      update,
    });
    await t.put(doc);
  }
}
