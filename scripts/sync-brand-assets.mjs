import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'assets/brand/logo-oficial-branca.png');
const targets = [
  resolve(root, 'apps/web/public/brand/logo-oficial-branca.png'),
  resolve(root, 'mobile/assets/images/logo-oficial-branca.png'),
];

for (const target of targets) {
  await mkdir(resolve(target, '..'), { recursive: true });
  await copyFile(source, target);
  console.log(`Logo sincronizada: ${target}`);
}
