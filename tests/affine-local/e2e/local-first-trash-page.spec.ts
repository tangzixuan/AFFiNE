import { test } from '@affine-test/kit/playwright';
import { openHomePage } from '@affine-test/kit/utils/load-page';
import {
  clickNewPageButton,
  clickPageMoreActions,
  getBlockSuiteEditorTitle,
  getPageOperationButton,
  waitForEditorLoad,
} from '@affine-test/kit/utils/page-logic';
import { expect } from '@playwright/test';

test('New a page , then delete it in all pages, finally find it in trash', async ({
  page,
  workspace,
}) => {
  await openHomePage(page);
  await waitForEditorLoad(page);
  await clickNewPageButton(page);
  await getBlockSuiteEditorTitle(page).click();
  await getBlockSuiteEditorTitle(page).fill('this is a new page to delete');
  const newPageId = page.url().split('/').reverse()[0];
  await page.getByTestId('all-pages').click();
  const cell = page.getByRole('cell', {
    name: 'this is a new page to delete',
  });
  expect(cell).not.toBeUndefined();

  await getPageOperationButton(page, newPageId).click();
  const deleteBtn = page.getByTestId('move-to-trash');
  await deleteBtn.click();
  const confirmTip = page.getByText('Delete page?');
  expect(confirmTip).not.toBeUndefined();

  await page.getByRole('button', { name: 'Delete' }).click();

  await page.getByTestId('trash-page').click();
  expect(
    page.getByRole('cell', { name: 'this is a new page to delete' })
  ).not.toBeUndefined();
  const currentWorkspace = await workspace.current();

  expect(currentWorkspace.flavour).toContain('local');
});

test('New a page , then delete it in page, blockHub and option menu will not appear ', async ({
  page,
}) => {
  await openHomePage(page);
  await waitForEditorLoad(page);
  await clickNewPageButton(page);
  const title = getBlockSuiteEditorTitle(page);
  await title.pressSequentially('test');
  await clickPageMoreActions(page);
  await page.getByTestId('editor-option-menu-delete').click();
  await page.getByTestId('confirm-delete-page').click();
  await expect(page.getByTestId('header-dropDownButton')).not.toBeVisible();
  await expect(page.getByTestId('block-hub')).not.toBeVisible();
  await page.getByTestId('page-restore-button').click();
  await expect(page.getByTestId('header-dropDownButton')).toBeVisible();
  await expect(page.getByTestId('block-hub')).toBeVisible();
});
