import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedAdmin,validBearer} from '../lib/security/access.mjs';
import {previousKoreanWeek} from '../lib/week.mjs';
test('admin authorization fails closed and uses exact normalized email',()=>{
 assert.equal(allowedAdmin('admin@example.com',''),false);assert.equal(allowedAdmin('attacker@example.com','admin@example.com'),false);assert.equal(allowedAdmin('Admin@Example.com',' admin@example.com , second@example.com '),true);assert.equal(allowedAdmin('admin@example.com.evil','admin@example.com'),false);
});
test('cron fails closed for missing or short secrets',()=>{
 assert.equal(validBearer('Bearer undefined',undefined),false);assert.equal(validBearer('Bearer short','short'),false);const secret='x'.repeat(32);assert.equal(validBearer(`Bearer ${secret}`,secret),true);assert.equal(validBearer(`Bearer ${secret}x`,secret),false);
});
test('Korean week handles Monday boundary and ISO year rollover',()=>{
 assert.deepEqual(previousKoreanWeek(new Date('2026-10-26T00:00:00Z')),{id:'2026-W43',start:'2026-10-19',end:'2026-10-25',label:'10월 19일–10월 25일'});
 assert.equal(previousKoreanWeek(new Date('2026-10-25T14:59:59Z')).id,'2026-W42');
 assert.deepEqual(previousKoreanWeek(new Date('2027-01-04T00:00:00Z')),{id:'2026-W53',start:'2026-12-28',end:'2027-01-03',label:'12월 28일–1월 3일'});
});
