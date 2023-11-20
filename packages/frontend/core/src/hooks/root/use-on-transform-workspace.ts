import { pushNotificationAtom } from '@affine/component/notification-center';
import type { WorkspaceRegistry } from '@affine/env/workspace';
import type { WorkspaceFlavour } from '@affine/env/workspace';
import { WorkspaceSubPath } from '@affine/env/workspace';
import { useAFFiNEI18N } from '@affine/i18n/hooks';
import {
  rootWorkspacesMetadataAtom,
  workspaceAdaptersAtom,
} from '@affine/workspace/atom';
import { useAsyncCallback } from '@toeverything/hooks/affine-async-hooks';
import { currentPageIdAtom } from '@toeverything/infra/atom';
import { WorkspaceVersion } from '@toeverything/infra/blocksuite';
import { useAtomValue, useSetAtom } from 'jotai';

import { openSettingModalAtom } from '../../atoms';
import { useNavigateHelper } from '../use-navigate-helper';

export function useOnTransformWorkspace() {
  const t = useAFFiNEI18N();
  const setSettingModal = useSetAtom(openSettingModalAtom);
  const WorkspaceAdapters = useAtomValue(workspaceAdaptersAtom);
  const setMetadata = useSetAtom(rootWorkspacesMetadataAtom);
  const { openPage } = useNavigateHelper();
  const currentPageId = useAtomValue(currentPageIdAtom);
  const pushNotification = useSetAtom(pushNotificationAtom);

  return useAsyncCallback(
    async <From extends WorkspaceFlavour, To extends WorkspaceFlavour>(
      from: From,
      to: To,
      workspace: WorkspaceRegistry[From]
    ): Promise<void> => {
      // create first, then delete, in case of failure
      const newId = await WorkspaceAdapters[to].CRUD.create(
        workspace.blockSuiteWorkspace
      );
      await WorkspaceAdapters[from].CRUD.delete(workspace.blockSuiteWorkspace);
      setMetadata(workspaces => {
        const idx = workspaces.findIndex(ws => ws.id === workspace.id);
        workspaces.splice(idx, 1, {
          id: newId,
          flavour: to,
          version: WorkspaceVersion.SubDoc,
        });
        return [...workspaces];
      }, newId);
      // fixme(himself65): setting modal could still open and open the non-exist workspace
      setSettingModal(settings => ({
        ...settings,
        open: false,
      }));
      window.dispatchEvent(
        new CustomEvent('affine-workspace:transform', {
          detail: {
            from,
            to,
            oldId: workspace.id,
            newId: newId,
          },
        })
      );
      openPage(newId, currentPageId ?? WorkspaceSubPath.ALL);
      pushNotification({
        title: t['Successfully enabled AFFiNE Cloud'](),
        type: 'success',
      });
    },
    [
      WorkspaceAdapters,
      setMetadata,
      setSettingModal,
      openPage,
      currentPageId,
      pushNotification,
      t,
    ]
  );
}

declare global {
  // global Events
  interface WindowEventMap {
    'affine-workspace:transform': CustomEvent<{
      from: WorkspaceFlavour;
      to: WorkspaceFlavour;
      oldId: string;
      newId: string;
    }>;
  }
}
