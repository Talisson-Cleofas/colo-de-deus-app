import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';

for (const relative of [
  'apps/api/dist',
  'apps/web/dist',
  'apps/web/tsconfig.app.tsbuildinfo',
  'apps/web/tsconfig.node.tsbuildinfo',
]) {
  await rm(resolve(relative), { recursive: true, force: true });
}
console.log('Artefatos antigos removidos.');
