import test from 'node:test';
import assert from 'node:assert/strict';
import { LumiAvatarClient } from '../src/avatar-client.mjs';

test('idle body pose does not mute reply text, but empty text stays silent', async () => {
 const client=new LumiAvatarClient({},'http://127.0.0.1:8798/');
 let payload;client.request=async (_type,value)=>{payload=value;return {type:'started'};};
 for(const state of ['idle','explain','serious','laugh']){
  await client.react('turn','reply',state,'你好，我们慢慢说。');
  assert.equal(payload.speak,true);assert.equal(payload.gesture.name,state);
 }
 for(const text of ['','   ']){
  await client.react('turn','reply','idle',text);assert.equal(payload.speak,false);
 }
});
