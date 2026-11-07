import {readFile,readdir,access} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd();
const docs=['README.md',...(await readdir('docs')).filter(x=>x.endsWith('.md')).map(x=>'docs/'+x)];
const stripCode=text=>text.replace(/```[\s\S]*?```/g,'');
function anchors(text){
 const seen=new Map();return new Set([...stripCode(text).matchAll(/^#{1,6}\s+(.+)$/gm)].map(m=>{
  const base=m[1].trim().toLowerCase().replace(/`/g,'').replace(/[^\p{L}\p{N}_\-\s]/gu,'').replace(/\s/g,'-');
  const n=seen.get(base)||0;seen.set(base,n+1);return base+(n?'-'+n:'');
 }));
}
let count=0;
for(const file of docs){
 const text=await readFile(file,'utf8');
 assert.ok(/\[中文\]|\*\*中文\*\*/.test(text)&&/\[English\]|\*\*English\*\*/.test(text),`Missing language navigation: ${file}`);
 for(const m of stripCode(text).matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){
  const link=m[1];if(/^(https?:|mailto:)/.test(link))continue;
  const [rel,fragment]=link.split('#');const target=path.resolve(path.dirname(file),decodeURIComponent(rel||path.basename(file)));
  assert.ok(target.startsWith(root+path.sep),`Link outside repository: ${file}: ${link}`);await access(target).catch(()=>{throw Error(`Missing link: ${file}: ${link}`)});
  if(fragment&&target.endsWith('.md'))assert.ok(anchors(await readFile(target,'utf8')).has(decodeURIComponent(fragment)),`Missing anchor: ${file}: ${link}`);
  count++;
 }
}
console.log(`Documentation links passed: ${docs.length} bilingual pages, ${count} local links.`);
