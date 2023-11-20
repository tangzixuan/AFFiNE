import { RootBlockHub } from '@affine/component/block-hub';
import { BlockSuiteEditor } from '@affine/component/block-suite-editor';
import { WorkspaceFlavour } from '@affine/env/workspace';
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { ImagePreviewModal } from '@affine/image-preview-plugin/src/component';
import { getOrCreateWorkspace } from '@affine/workspace/manager';
import type { Meta } from '@storybook/react';
import { initEmptyPage } from '@toeverything/infra/blocksuite';
import { createPortal } from 'react-dom';

export default {
  title: 'Component/ImagePreviewModal',
  component: ImagePreviewModal,
} satisfies Meta;

const workspace = getOrCreateWorkspace('test', WorkspaceFlavour.LOCAL);
const page = workspace.createPage('page0');
initEmptyPage(page);
fetch(new URL('@affine-test/fixtures/large-image.png', import.meta.url))
  .then(res => res.arrayBuffer())
  .then(async buffer => {
    const id = await workspace.blob.set(
      new Blob([buffer], { type: 'image/png' })
    );
    const frameId = page.getBlockByFlavour('affine:note')[0].id;
    page.addBlock(
      'affine:paragraph',
      {
        text: new page.Text('Please double click the image to preview it.'),
      },
      frameId
    );
    page.addBlock(
      'affine:image',
      {
        sourceId: id,
      },
      frameId
    );
  })
  .catch(err => {
    console.error('Failed to load large-image.png', err);
  });

export const Default = () => {
  return (
    <>
      <div
        style={{
          height: '100vh',
          width: '100vw',
          overflow: 'auto',
        }}
      >
        <BlockSuiteEditor mode="page" page={page} />
        {createPortal(
          <ImagePreviewModal pageId={page.id} workspace={page.workspace} />,
          document.body
        )}
      </div>
      <RootBlockHub />
    </>
  );
};
