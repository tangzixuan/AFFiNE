import { createConfiguration, rootPath, getPublicPath } from './config.js';
import { merge } from 'webpack-merge';
import { join, resolve } from 'node:path';
import type { BuildFlags } from '@affine/cli/config';
import { getRuntimeConfig } from './runtime-config.js';
import HTMLPlugin from 'html-webpack-plugin';

import { gitShortHash } from './s3-plugin.js';

const DESCRIPTION = `There can be more than Notion and Miro. AFFiNE is a next-gen knowledge base that brings planning, sorting and creating all together.`;

export default async function (cli_env: any, _: any) {
  const flags: BuildFlags = JSON.parse(
    Buffer.from(cli_env.flags, 'hex').toString('utf-8')
  );
  console.log('build flags', flags);
  const runtimeConfig = getRuntimeConfig(flags);
  console.log('runtime config', runtimeConfig);
  const config = createConfiguration(flags, runtimeConfig);
  return merge(config, {
    entry: {
      'polyfill/intl-segmenter': {
        import: resolve(rootPath, 'src/polyfill/intl-segmenter.ts'),
      },
      'polyfill/ses': {
        import: resolve(rootPath, 'src/polyfill/ses.ts'),
      },
      plugin: {
        dependOn: ['polyfill/intl-segmenter', 'polyfill/ses'],
        import: resolve(rootPath, 'src/bootstrap/register-plugins.ts'),
      },
      app: {
        chunkLoading: 'import',
        dependOn: ['polyfill/intl-segmenter', 'polyfill/ses', 'plugin'],
        import: resolve(rootPath, 'src/index.tsx'),
      },
      '_plugin/index.test': {
        chunkLoading: 'import',
        dependOn: ['polyfill/intl-segmenter', 'polyfill/ses', 'plugin'],
        import: resolve(rootPath, 'src/_plugin/index.test.tsx'),
      },
    },
    plugins: [
      new HTMLPlugin({
        template: join(rootPath, '.webpack', 'template.html'),
        inject: 'body',
        scriptLoading: 'module',
        minify: false,
        chunks: ['app', 'plugin', 'polyfill/intl-segmenter', 'polyfill/ses'],
        filename: 'index.html',
        templateParameters: {
          GIT_SHORT_SHA: gitShortHash(),
          DESCRIPTION,
        },
      }),
      new HTMLPlugin({
        template: join(rootPath, '.webpack', 'template.html'),
        inject: 'body',
        scriptLoading: 'module',
        minify: false,
        publicPath: getPublicPath(flags),
        chunks: [
          '_plugin/index.test',
          'plugin',
          'polyfill/intl-segmenter',
          'polyfill/ses',
        ],
        filename: '_plugin/index.html',
        templateParameters: {
          GIT_SHORT_SHA: gitShortHash(),
          DESCRIPTION,
        },
      }),
    ],
  });
}
