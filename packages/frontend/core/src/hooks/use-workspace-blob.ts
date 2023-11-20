import { DebugLogger } from '@affine/debug';
import type { BlobManager } from '@blocksuite/store';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { BlockSuiteWorkspace } from '../shared';

const logger = new DebugLogger('useWorkspaceBlob');

export function useWorkspaceBlob(
  blockSuiteWorkspace: BlockSuiteWorkspace
): BlobManager {
  return useMemo(() => blockSuiteWorkspace.blob, [blockSuiteWorkspace.blob]);
}

export function useWorkspaceBlobImage(
  key: string | null,
  blockSuiteWorkspace: BlockSuiteWorkspace
) {
  const blobManager = useWorkspaceBlob(blockSuiteWorkspace);
  const [blob, setBlob] = useState<Blob | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    if (key === null) {
      setBlob(null);
      return;
    }
    blobManager
      ?.get(key)
      .then(blob => {
        if (controller.signal.aborted) {
          return;
        }
        if (blob) {
          setBlob(blob);
        }
      })
      .catch(err => {
        logger.error('Failed to get blob', err);
      });
    return () => {
      controller.abort();
    };
  }, [blobManager, key]);
  const [url, setUrl] = useState<string | null>(null);
  const ref = useRef<string | null>(null);

  useEffect(() => {
    if (ref.current) {
      URL.revokeObjectURL(ref.current);
    }
    if (blob) {
      const url = URL.createObjectURL(blob);
      setUrl(url);
      ref.current = url;
    }
  }, [blob]);
  return url;
}
