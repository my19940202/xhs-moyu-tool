import test from 'node:test';
import assert from 'node:assert/strict';
import {Platform} from '../src/platform.js';
test('daily ranking requests the platform list and caches it',async()=>{
 let calls=0; globalThis.window={xhs:{miniTool:{getRankList:async args=>{calls++;assert.equal(args.board,1);assert.equal(args.period,'day');return {data:[{rank:1,score:12,nickname:null}]};},submitScore:async()=>({})}}};
 const p=new Platform();p.version=9510;assert.equal(p.rankingAvailable,true);
 assert.equal((await p.rank('2026-11-17'))[0].score,12);await p.rank('2026-11-17');assert.equal(calls,1);
});
test('unauthorized ranking hides the entry',async()=>{
 globalThis.window={xhs:{miniTool:{getRankList:async()=>{throw {errCode:1005};},submitScore:async()=>({})}}};
 const p=new Platform();p.version=9510;await assert.rejects(p.rank('2026-11-17'));assert.equal(p.rankingAvailable,false);
});
