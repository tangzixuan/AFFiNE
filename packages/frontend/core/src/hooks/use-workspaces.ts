import { DebugLogger } from '@affine/debug';
import { WorkspaceFlavour } from '@affine/env/workspace';
import { rootWorkspacesMetadataAtom } from '@affine/workspace/atom';
import { saveWorkspaceToLocalStorage } from '@affine/workspace/local/crud';
import {
  getOrCreateWorkspace,
  globalBlockSuiteSchema,
} from '@affine/workspace/manager';
import { getWorkspace } from '@toeverything/infra/__internal__/workspace';
import { getCurrentStore } from '@toeverything/infra/atom';
import {
  buildShowcaseWorkspace,
  WorkspaceVersion,
} from '@toeverything/infra/blocksuite';
import { useAtomValue, useSetAtom } from 'jotai';
import { nanoid } from 'nanoid';
import { useCallback } from 'react';

import { LocalAdapter } from '../adapters/local';
import { WorkspaceAdapters } from '../adapters/workspace';
import { setPageModeAtom } from '../atoms';

const logger = new DebugLogger('use-workspaces');

/**
 * This hook has the permission to all workspaces. Be careful when using it.
 */
export function useAppHelper() {
  const jotaiWorkspaces = useAtomValue(rootWorkspacesMetadataAtom);
  const set = useSetAtom(rootWorkspacesMetadataAtom);
  return {
    addLocalWorkspace: useCallback(
      async (workspaceId: string): Promise<string> => {
        getOrCreateWorkspace(workspaceId, WorkspaceFlavour.LOCAL);
        saveWorkspaceToLocalStorage(workspaceId);
        set(workspaces => [
          ...workspaces,
          {
            id: workspaceId,
            flavour: WorkspaceFlavour.LOCAL,
            version: WorkspaceVersion.DatabaseV3,
          },
        ]);
        logger.debug('imported local workspace', workspaceId);
        return workspaceId;
      },
      [set]
    ),
    addCloudWorkspace: useCallback(
      (workspaceId: string) => {
        getOrCreateWorkspace(workspaceId, WorkspaceFlavour.AFFINE_CLOUD);
        set(workspaces => [
          ...workspaces,
          {
            id: workspaceId,
            flavour: WorkspaceFlavour.AFFINE_CLOUD,
            version: WorkspaceVersion.DatabaseV3,
          },
        ]);
        logger.debug('imported cloud workspace', workspaceId);
      },
      [set]
    ),
    createLocalWorkspace: useCallback(
      async (name: string): Promise<string> => {
        const blockSuiteWorkspace = getOrCreateWorkspace(
          nanoid(),
          WorkspaceFlavour.LOCAL
        );
        blockSuiteWorkspace.meta.setName(name);
        const id = await LocalAdapter.CRUD.create(blockSuiteWorkspace);
        {
          // this is hack, because CRUD doesn't return the workspace
          const blockSuiteWorkspace = getOrCreateWorkspace(
            id,
            WorkspaceFlavour.LOCAL
          );
          await buildShowcaseWorkspace(blockSuiteWorkspace, {
            schema: globalBlockSuiteSchema,
            store: getCurrentStore(),
            atoms: {
              pageMode: setPageModeAtom,
            },
          });
        }
        set(workspaces => [
          ...workspaces,
          {
            id,
            flavour: WorkspaceFlavour.LOCAL,
            version: WorkspaceVersion.DatabaseV3,
          },
        ]);
        logger.debug('created local workspace', id);
        return id;
      },
      [set]
    ),
    deleteWorkspace: useCallback(
      async (workspaceId: string) => {
        const targetJotaiWorkspace = jotaiWorkspaces.find(
          ws => ws.id === workspaceId
        );
        if (!targetJotaiWorkspace) {
          throw new Error('page cannot be found');
        }

        const targetWorkspace = getWorkspace(targetJotaiWorkspace.id);

        // delete workspace from plugin
        await WorkspaceAdapters[targetJotaiWorkspace.flavour].CRUD.delete(
          targetWorkspace
        );
        // delete workspace from jotai storage
        set(workspaces => workspaces.filter(ws => ws.id !== workspaceId));
      },
      [jotaiWorkspaces, set]
    ),
    deleteWorkspaceMeta: useCallback(
      (workspaceId: string) => {
        set(workspaces => workspaces.filter(ws => ws.id !== workspaceId));
      },
      [set]
    ),
  };
}
