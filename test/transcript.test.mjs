import test from 'node:test';
import assert from 'node:assert/strict';
import { readPresentation } from '../src/transcript.mjs';
const node=(turn,seq,blocks,status='settled')=>({kind:'assistant-step',data:{turn,step:seq,status,blocks,finalNode:{seq}}});
const chat=nodes=>({order:nodes.map((_,i)=>String(i)),nodes:{get:key=>nodes[Number(key)]}});
const selection=(state='cute',intensity=.5)=>({kind:'tool-call',name:'lumi_react',callId:'selection',argsRaw:JSON.stringify({state,intensity})});
const result=(isError=false)=>({kind:'tool-call',data:{root:{kind:'tool-result',name:'lumi_react',callId:'selection',isError}}});
test('completed reply receives only its successfully executed same-turn selection',()=>{
 const value=readPresentation(chat([node(2,2,[selection()]),result(),node(2,3,[{kind:'text',text:'原始回复'}])]));
 assert.equal(value.reaction.state,'cute');assert.equal(value.text,'原始回复');assert.equal(value.selected,true);
 assert.equal(readPresentation(chat([node(1,1,[selection()]),result(),node(2,2,[{kind:'text',text:'下一轮'}])])).selected,false);
});
test('unexecuted or failed presentation calls fall back to idle',()=>{
 for(const tail of [[],[result(true)]]){
  const value=readPresentation(chat([node(1,1,[selection()]),...tail,node(1,2,[{kind:'text',text:'回复'}])]));
  assert.equal(value.selected,false);assert.equal(value.reaction.state,'idle');
 }
});
test('streaming, interrupted and invalid selections cannot drive emotion',()=>{
 for(const block of [selection('dance'),selection('cute',NaN),selection('cute',1),{...selection(),argsRaw:'{'}]){
  const value=readPresentation(chat([node(1,1,[block]),result(),node(1,2,[{kind:'text',text:'回复'}])]));
  assert.equal(value.reaction.state,'idle');assert.equal(value.selected,false);
 }
 assert.equal(readPresentation(chat([node(1,1,[{kind:'text',text:'半句'}],'running')])),null);
 const interrupted=node(1,2,[{kind:'text',text:'打断'}]);interrupted.data.finalNode.interrupted=true;
 assert.equal(readPresentation(chat([interrupted])),null);
});
