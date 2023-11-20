import { test } from '@affine-test/kit/playwright';
import { openHomePage, openPluginPage } from '@affine-test/kit/utils/load-page';
import { waitForEditorLoad } from '@affine-test/kit/utils/page-logic';
import { expect } from '@playwright/test';

test('plugin map should valid', async ({ page }) => {
  await openPluginPage(page);
  await page.waitForSelector('[data-plugins-load-status="success"]');
});

test('plugin should exist', async ({ page }) => {
  await openHomePage(page);
  await waitForEditorLoad(page);
  await page.route('**/plugins/**/package.json', route => route.fetch(), {
    times: 5,
  });
  await page.waitForTimeout(50);
  const packageJson = await page.evaluate(() => {
    // @ts-expect-error
    return window.__pluginPackageJson__.sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  });
  const plugins = [
    '@affine/copilot-plugin',
    '@affine/hello-world-plugin',
    '@affine/image-preview-plugin',
    '@affine/vue-hello-world-plugin',
    '@affine/outline-plugin',
  ];
  expect(packageJson).toEqual(
    plugins
      .map(name => ({
        name,
        version: expect.any(String),
        description: expect.any(String),
        affinePlugin: expect.anything(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  );
});
