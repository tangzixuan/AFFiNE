import { toast } from '@affine/component';
import { PublicLinkDisableModal } from '@affine/component/disable-public-link';
import { ShareMenu } from '@affine/core/components/affine/share-page-modal/share-menu';
import type {
  AffineCloudWorkspace,
  LocalWorkspace,
} from '@affine/env/workspace';
import { WorkspaceFlavour } from '@affine/env/workspace';
import { getOrCreateWorkspace } from '@affine/workspace/manager';
import type { Page } from '@blocksuite/store';
import { expect } from '@storybook/jest';
import type { Meta, StoryFn } from '@storybook/react';
import { use } from 'foxact/use';
import { useState } from 'react';

export default {
  title: 'AFFiNE/ShareMenu',
  component: ShareMenu,
  parameters: {
    chromatic: { disableSnapshot: true },
  },
} satisfies Meta;

async function initPage(page: Page) {
  await page.waitForLoaded();
  // Add page block and surface block at root level
  const pageBlockId = page.addBlock('affine:page', {
    title: new page.Text('Hello, world!'),
  });
  page.addBlock('affine:surface', {}, pageBlockId);
  const frameId = page.addBlock('affine:note', {}, pageBlockId);
  page.addBlock(
    'affine:paragraph',
    {
      text: new page.Text('This is a paragraph.'),
    },
    frameId
  );
  page.resetHistory();
}

const blockSuiteWorkspace = getOrCreateWorkspace(
  'test-workspace',
  WorkspaceFlavour.LOCAL
);

const promise = Promise.all([
  initPage(blockSuiteWorkspace.createPage({ id: 'page0' })),
  initPage(blockSuiteWorkspace.createPage({ id: 'page1' })),
  initPage(blockSuiteWorkspace.createPage({ id: 'page2' })),
]);

const localWorkspace: LocalWorkspace = {
  id: 'test-workspace',
  flavour: WorkspaceFlavour.LOCAL,
  blockSuiteWorkspace,
};

const affineWorkspace: AffineCloudWorkspace = {
  id: 'test-workspace',
  flavour: WorkspaceFlavour.AFFINE_CLOUD,
  blockSuiteWorkspace,
};

async function unimplemented() {
  toast('work in progress');
}

export const Basic: StoryFn = () => {
  use(promise);
  return (
    <ShareMenu
      currentPage={blockSuiteWorkspace.getPage('page0') as Page}
      workspace={localWorkspace}
      onEnableAffineCloud={unimplemented}
    />
  );
};

Basic.play = async ({ canvasElement }) => {
  {
    const button = canvasElement.querySelector(
      '[data-testid="share-menu-button"]'
    ) as HTMLButtonElement;
    expect(button).not.toBeNull();
    button.click();
  }
  await new Promise(resolve => window.setTimeout(resolve, 100));
  {
    const button = canvasElement.querySelector(
      '[data-testid="share-menu-enable-affine-cloud-button"]'
    );
    expect(button).not.toBeNull();
  }
};

export const AffineBasic: StoryFn = () => {
  use(promise);
  return (
    <ShareMenu
      currentPage={blockSuiteWorkspace.getPage('page0') as Page}
      workspace={affineWorkspace}
      onEnableAffineCloud={unimplemented}
    />
  );
};

export const DisableModal: StoryFn = () => {
  const [open, setOpen] = useState(false);
  use(promise);
  return (
    <>
      <div onClick={() => setOpen(!open)}>Disable Public Link</div>
      <PublicLinkDisableModal
        open={open}
        onConfirm={() => {
          toast('Disabled');
          setOpen(false);
        }}
        onOpenChange={setOpen}
      />
    </>
  );
};
