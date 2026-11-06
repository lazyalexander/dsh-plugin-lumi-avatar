import test from 'node:test';
import assert from 'node:assert/strict';
import { AvatarPlayback } from '../src/playback.mjs';
const reply={id:'1',text:'你好',reaction:{state:'cute',intensity:.5},selected:true};
function setup(){
 const updates=[],calls=[];
 const client={async begin(){calls.push('begin');},async react(){calls.push('react');return {type:'started'};},async cancel(){calls.push('cancel');},async request(){return {state:'idle',speechActive:false};},dispose(){calls.push('dispose');}};
 const playback=new AvatarPlayback(client,update=>updates.push(update),error=>{throw error;});
 return {playback,client,updates,calls};
}
test('a late begin acknowledgement cannot play a replaced reply',async()=>{
 const {playback,client,calls,updates}=setup();
 let release;client.begin=()=>new Promise(resolve=>{release=resolve;});
 const pending=playback.play(reply);await playback.rest();release();await pending;
 assert.ok(!calls.includes('react'));assert.equal(updates.at(-1).state,'idle');playback.dispose();
});
test('actual completion returns UI state to idle and disposal clears ownership',async()=>{
 const {playback,updates,calls}=setup();await playback.play(reply);
 assert.equal(updates.at(-1).status,'playing');
 await new Promise(resolve=>setTimeout(resolve,300));
 assert.equal(updates.at(-1).status,'idle');playback.dispose();assert.equal(calls.at(-1),'dispose');
});
