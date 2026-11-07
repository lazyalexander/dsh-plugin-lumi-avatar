import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const forbidden = [
  /\/Users\//,
  /[A-Za-z]:\\Users\\/,
  /(?:ghp_|gho_|github_pat_)[A-Za-z0-9_]{20,}/,
  /\bsk-[A-Za-z0-9_-]{20,}/,
  /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/,
  /[?&]token=[A-Za-z0-9_-]{16,}/,
  /Bearer\s+[A-Za-z0-9_.-]{20,}/,
];
const allowedRoots = new Set(['src', 'lib', 'docs', 'test', 'scripts', '.github', 'renderer', 'market']);
const allowedFiles = new Set(['ASSET-NOTICES.txt', 'LICENSE', 'README.md', 'package.json', 'package-lock.json', 'build.mjs', 'lumi.overlay.yml', '.gitignore', 'icon.png']);
const paths = [];
async function collect(directory = '.') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (directory === '.' && ['.git', 'node_modules'].includes(entry.name)) continue;
    const path = directory === '.' ? entry.name : `${directory}/${entry.name}`;
    const root = path.split('/')[0];
    assert.ok(allowedRoots.has(root) || allowedFiles.has(path), `Unexpected release path: ${path}`);
    assert.ok(!entry.isSymbolicLink(), `Symlink excluded from release: ${path}`);
    if (entry.isDirectory()) await collect(path);
    else {
      if (path === 'icon.png') { paths.push(path); continue; }
      if (path.startsWith('market/') && /\.(?:png|jpe?g|webp|gif|avif)$/i.test(path)) { paths.push(path); continue; }
    if (path.startsWith('renderer/') && /\.(?:vrma|gz|png|jpe?g|wasm|txt)$/i.test(path)) { paths.push(path); continue; }
      const text = await readFile(path, 'utf8');
      for (const pattern of forbidden) assert.ok(!pattern.test(text), `Sensitive pattern in ${path}`);
      assert.ok(!/\.(?:vrm|vrma|vmd|pmx|blend|png|jpe?g|mp4|webm|zip|tgz|db)$/i.test(path), `Asset or archive in release: ${path}`);
      paths.push(path);
    }
  }
}
await collect();
const pack = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--ignore-scripts', '--json'], { encoding: 'utf8' }))[0];
for (const file of pack.files) assert.ok(paths.includes(file.path), `Unexpected npm package file: ${file.path}`);
console.log(`Release audit passed: ${paths.length} source files, ${pack.files.length} package files.`);
