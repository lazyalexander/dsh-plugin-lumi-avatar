import {createGunzip} from 'node:zlib';
import {existsSync} from 'node:fs';
import http from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
export function startBundledRenderer() {
 const root=path.resolve(fileURLToPath(new URL('../renderer/',import.meta.url)));
 const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'};
 const server=http.createServer(async(req,res)=>{try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  const compressed=file.endsWith('.vrm') && !existsSync(file) && existsSync(file+'.gz');
  if(compressed)file+='.gz';
  if((await stat(file)).isDirectory())file=path.join(file,'index.html');
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
  const stream=createReadStream(file);stream.on('error',()=>res.destroy());if(compressed){const decoder=createGunzip();decoder.on('error',()=>res.destroy());stream.pipe(decoder).pipe(res);}else stream.pipe(res);
 }catch{res.writeHead(404).end('Not found');}});
 server.listen(0,'127.0.0.1');server.unref();
 return {url(){const a=server.address();if(!a)throw Error('Lumi renderer is starting');return `http://127.0.0.1:${a.port}/runtime/interaction/`;},close(){server.close();}};
}
