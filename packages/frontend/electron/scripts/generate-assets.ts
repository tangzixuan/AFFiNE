import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import fs from 'fs-extra';
import { glob } from 'glob';

const require = createRequire(import.meta.url);
const __dirname = fileURLToPath(new URL('.', import.meta.url));

const repoRootDir = path.join(__dirname, '..', '..', '..', '..');
const electronRootDir = path.join(__dirname, '..');
const publicDistDir = path.join(electronRootDir, 'resources');
const affineCoreDir = path.join(repoRootDir, 'packages', 'frontend', 'core');
const affineCoreOutDir = path.join(affineCoreDir, 'dist');
const publicAffineOutDir = path.join(publicDistDir, `web-static`);
const releaseVersionEnv = process.env.RELEASE_VERSION || '';

console.log('build with following dir', {
  repoRootDir,
  electronRootDir,
  publicDistDir,
  affineSrcDir: affineCoreDir,
  affineSrcOutDir: affineCoreOutDir,
  publicAffineOutDir,
});

// step 0: check version match
const electronPackageJson = require(`${electronRootDir}/package.json`);
if (releaseVersionEnv && electronPackageJson.version !== releaseVersionEnv) {
  throw new Error(
    `Version mismatch, expected ${releaseVersionEnv} but got ${electronPackageJson.version}`
  );
}
// copy web dist files to electron dist

process.env.DISTRIBUTION = 'desktop';

const cwd = repoRootDir;

if (!process.env.SKIP_PLUGIN_BUILD) {
  spawnSync('yarn', ['build:plugins'], {
    stdio: 'inherit',
    env: process.env,
    cwd,
  });
}

// step 1: build web dist
if (!process.env.SKIP_WEB_BUILD) {
  spawnSync('yarn', ['nx', 'build', '@affine/core'], {
    stdio: 'inherit',
    env: process.env,
    cwd,
  });

  spawnSync('yarn', ['workspace', '@affine/electron', 'build'], {
    stdio: 'inherit',
    env: process.env,
    cwd,
  });

  // step 1.5: amend sourceMappingURL to allow debugging in devtools
  await glob('**/*.{js,css}', { cwd: affineCoreOutDir }).then(files => {
    return files.map(async file => {
      const dir = path.dirname(file);
      const fullpath = path.join(affineCoreOutDir, file);
      let content = await fs.readFile(fullpath, 'utf-8');
      // replace # sourceMappingURL=76-6370cd185962bc89.js.map
      // to      # sourceMappingURL=assets://./{dir}/76-6370cd185962bc89.js.map
      content = content.replace(/# sourceMappingURL=(.*)\.map/g, (_, p1) => {
        return `# sourceMappingURL=assets://./${dir}/${p1}.map`;
      });
      await fs.writeFile(fullpath, content);
    });
  });

  await fs.move(affineCoreOutDir, publicAffineOutDir, { overwrite: true });
}

// step 2: update app-updater.yml content with build type in resources folder
if (process.env.BUILD_TYPE === 'internal') {
  const appUpdaterYml = path.join(publicDistDir, 'app-update.yml');
  const appUpdaterYmlContent = await fs.readFile(appUpdaterYml, 'utf-8');
  const newAppUpdaterYmlContent = appUpdaterYmlContent.replace(
    'AFFiNE',
    'AFFiNE-Releases'
  );
  await fs.writeFile(appUpdaterYml, newAppUpdaterYmlContent);
}
