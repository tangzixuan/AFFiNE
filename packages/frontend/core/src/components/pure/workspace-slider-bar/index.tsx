import type { DeleteCollectionInfo } from '@affine/env/filter';
import type { Workspace } from '@blocksuite/store';

export type FavoriteListProps = {
  workspace: Workspace;
};

export type CollectionsListProps = {
  workspace: Workspace;
  info: DeleteCollectionInfo;
};
