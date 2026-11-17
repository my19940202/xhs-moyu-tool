import test from 'node:test';
import assert from 'node:assert/strict';
import {DailyClock, dayKey, formatTime} from '../src/time.js';
test('counts visible time and excludes hidden time',()=>{
 const now=Date.parse('2026-11-17T04:00:00Z'); const c=new DailyClock(null,now,0);
 c.tick(now+5000,5000,true); c.tick(now+15000,15000,false);
 assert.equal(c.record.ms,5000); assert.equal(formatTime(c.record.ms),'00:00:05');
});
test('resets at Beijing midnight and counts only new day',()=>{
 const now=Date.parse('2026-11-17T15:59:58Z'); const c=new DailyClock(null,now,0);
 c.tick(now+5000,5000,true); assert.equal(c.record.day,'2026-11-18'); assert.equal(c.record.ms,3000);
 assert.equal(dayKey(now),'2026-11-17');
});
