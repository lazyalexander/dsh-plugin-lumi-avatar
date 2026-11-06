import { mkdir } from 'node:fs/promises';
import { build } from 'esbuild';

await mkdir(new URL('./lib/', import.meta.url), { recursive: true });
await build({
  entryPoints: [new URL('./src/client.mjs', import.meta.url).pathname],
  outfile: new URL('./lib/client.js', import.meta.url).pathname,
  bundle: true,
  platform: 'browser',
  format: 'cjs',
  target: 'es2024',
  external: ['react'],
  banner: { js: 'window.__ModuleLoader__.load({id:"dsh-plugin-lumi-avatar",factory:(require)=>{var module={exports:{}};var exports=module.exports;' },
  footer: { js: 'return module.exports;}});' },
});
