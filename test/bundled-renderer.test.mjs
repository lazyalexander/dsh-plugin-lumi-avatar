import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {startBundledRenderer} from '../src/bundled-renderer.mjs';
test('bundled renderer serves original model and denies files outside its root',async()=>{
 const s=startBundledRenderer();
 try{
  await new Promise(r=>setTimeout(r,50));
  const page=await fetch(s.url());assert.equal(page.status,200);assert.match(await page.text(),/html/i);
  const response=await fetch(new URL('../../assets/Lumi.vrm',s.url()));assert.equal(response.status,200);
  const hash=b=>createHash('sha256').update(b).digest('hex');
  assert.equal(hash(Buffer.from(await response.arrayBuffer())),hash(gunzipSync(await readFile(new URL('../renderer/assets/Lumi.vrm.gz',import.meta.url)))));
  const denied=await fetch(new URL('/%2e%2e%2fpackage.json',s.url()));assert.equal(denied.status,403);
 }finally{s.close();}
});
