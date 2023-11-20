import {
  currentPageIdAtom,
  currentWorkspaceAtom,
  deleteLayoutAtom,
  pushLayoutAtom,
} from '@affine/sdk/entry';
import { TOCNotesPanel } from '@blocksuite/blocks';
import { assertExists } from '@blocksuite/global/utils';
import { RightSidebarIcon } from '@blocksuite/icons';
import { IconButton } from '@toeverything/components/button';
import { Tooltip } from '@toeverything/components/tooltip';
import { useAtomValue, useSetAtom } from 'jotai';
import type { ComponentType, PropsWithChildren } from 'react';
import { useCallback, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

const Outline = () => {
  const tocPanelRef = useRef<TOCNotesPanel | null>(null);
  const currentPageId = useAtomValue(currentPageIdAtom);
  assertExists(currentPageId, 'current page id');
  const currentWorkspace = useAtomValue(currentWorkspaceAtom);
  const currentPage = currentWorkspace.getPage(currentPageId);
  assertExists(currentPage, 'current page');

  if (!tocPanelRef.current) {
    tocPanelRef.current = new TOCNotesPanel();
  }

  if (currentPage !== tocPanelRef.current?.page) {
    (tocPanelRef.current as TOCNotesPanel).page = currentPage;
  }

  return (
    <div
      className={`outline-wrapper`}
      style={{
        height: '100%',
        borderLeft: `1px solid var(--affine-border-color)`,
      }}
      ref={useCallback((container: HTMLDivElement | null) => {
        if (container) {
          assertExists(tocPanelRef.current);
          container.appendChild(tocPanelRef.current);
        }
      }, [])}
    />
  );
};

export const HeaderItem = ({
  Provider,
}: {
  Provider: ComponentType<PropsWithChildren>;
}) => {
  const [open, setOpen] = useState(false);
  const pushLayout = useSetAtom(pushLayoutAtom);
  const deleteLayout = useSetAtom(deleteLayoutAtom);
  const [container, setContainer] = useState<HTMLButtonElement | null>(null);

  return (
    <Tooltip
      content={`${open ? 'Collapse' : 'Expand'} table of contents`}
      portalOptions={{
        container,
      }}
    >
      <IconButton
        size="large"
        ref={setContainer}
        style={{
          width: '32px',
          fontSize: '24px',
        }}
        onClick={useCallback(() => {
          if (!open) {
            setOpen(true);
            pushLayout(
              '@affine/outline-plugin',
              div => {
                const root = createRoot(div);

                div.style.height = '100%';

                root.render(
                  <Provider>
                    <Outline />
                  </Provider>
                );
                return () => {
                  root.unmount();
                };
              },
              {
                maxWidth: [undefined, 300],
              }
            );
          } else {
            setOpen(false);
            deleteLayout('@affine/outline-plugin');
          }
        }, [Provider, deleteLayout, open, pushLayout])}
      >
        <RightSidebarIcon />
      </IconButton>
    </Tooltip>
  );
};
