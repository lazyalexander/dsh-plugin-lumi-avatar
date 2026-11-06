import test from 'node:test';
import assert from 'node:assert/strict';
import {apply} from '../src/index.mjs';
test('configured renderer origin is explicitly delivered to the browser',()=>{
 const events=new Map();const ctx={on:(name,fn)=>events.set(name,fn),systemPrompt:{section(){}},tools:{register(){}}};
 apply(ctx,{avatarUrl:'http://127.0.0.1:4567/runtime/interaction/'});
 const table=[];events.get('webserver/index-inject')(table);
 assert.deepEqual(table,[{kind:'global',name:'__LUMI_AVATAR_URL__',value:'http://127.0.0.1:4567/runtime/interaction/'}]);
 assert.throws(()=>apply(ctx,{avatarUrl:'file:///private/model'}),/HTTP avatar URL/);
});
