import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const standaloneDir = path.join(rootDir, '.next', 'standalone');

function copyIntoStandalone(sourceRelativePath, targetRelativePath) {
  const sourcePath = path.join(rootDir, sourceRelativePath);
  const targetPath = path.join(standaloneDir, targetRelativePath);

  if (!existsSync(sourcePath)) {
    return;
  }

  rmSync(targetPath, { force: true, recursive: true });
  mkdirSync(path.dirname(targetPath), { recursive: true });
  cpSync(sourcePath, targetPath, { force: true, recursive: true });
}

if (!existsSync(standaloneDir)) {
  console.warn('Standalone output was not found. Skipping asset preparation.');
  process.exit(0);
}

copyIntoStandalone(path.join('.next', 'static'), path.join('.next', 'static'));
copyIntoStandalone('public', 'public');

console.log('Prepared standalone static assets.');
