import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const yml = {
  version: process.env.RELEASE_VERSION ?? '0.0.0',
  files: [],
};

const generateYml = platform => {
  const regex = new RegExp(`^affine-.*-${platform}-.*.(exe|zip|dmg|AppImage)$`);
  const files = fs.readdirSync(process.cwd()).filter(file => regex.test(file));
  files.forEach(fileName => {
    const filePath = path.join(process.cwd(), './', fileName);
    try {
      const fileData = fs.readFileSync(filePath);
      const hash = crypto
        .createHash('sha512')
        .update(fileData)
        .digest('base64');
      const size = fs.statSync(filePath).size;

      yml.files.push({
        url: fileName,
        sha512: hash,
        size: size,
      });
    } catch (e) {}
  });
  yml.path = yml.files[0].url;
  yml.sha512 = yml.files[0].sha512;
  yml.releaseDate = new Date().toISOString();

  const ymlStr =
    `version: ${yml.version}\n` +
    `files:\n` +
    yml.files
      .map(file => {
        return (
          `  - url: ${file.url}\n` +
          `    sha512: ${file.sha512}\n` +
          `    size: ${file.size}\n`
        );
      })
      .join('') +
    `path: ${yml.path}\n` +
    `sha512: ${yml.sha512}\n` +
    `releaseDate: ${yml.releaseDate}\n`;

  const fileName = platform === 'windows' ? 'latest.yml' : 'latest-mac.yml';

  fs.writeFileSync(fileName, ymlStr);
};

generateYml('windows');
generateYml('macos');
