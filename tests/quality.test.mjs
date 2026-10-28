import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateQuality,canTransition} from '../lib/quality.ts';
import {seedArticles} from '../lib/seed.ts';
test('missing source verification or editor checks blocks approval',()=>{
 const a=structuredClone(seedArticles[0]);a.status='review';a.sources[0].reachable=false;
 assert.equal(evaluateQuality(a).canApprove,false);assert.equal(canTransition(a,'approve'),false);
 a.sources[0].reachable=true;a.checks.facts=false;assert.equal(canTransition(a,'approve'),false);
});
test('only a fully reviewed, approved version can publish',()=>{
 const a=structuredClone(seedArticles[0]);a.status='review';assert.equal(canTransition(a,'approve'),true);assert.equal(canTransition(a,'publish'),false);
 a.status='approved';assert.equal(canTransition(a,'publish'),true);a.checks.context=false;assert.equal(canTransition(a,'publish'),false);
});
test('unresolved citation IDs block approval even with all editor checks',()=>{
 const a=structuredClone(seedArticles[0]);a.status='review';a.sections[0].sourceIds=['missing'];assert.equal(canTransition(a,'approve'),false);
});
