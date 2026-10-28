import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {normalizeDomain,safeSourceUrl,sourceAllowed,isPublicAddress} from '../lib/source-policy.mjs';
import {readPublicSource} from '../lib/source-network.mjs';
import {evaluateQuality,canTransition} from '../lib/quality.ts';
import {seedArticles} from '../lib/seed.ts';

test('domain registry honors exact hosts, explicit subdomains, disabled overrides and HTTPS',()=>{
 assert.equal(normalizeDomain(' WWW.Example.COM. '),'www.example.com');
 for(const bad of ['https://example.com','example.com/path','*.example.com','example.com:443','localhost','127.0.0.1','2130706433','service.internal','co.kr','example.com@localhost','example..com'])assert.throws(()=>normalizeDomain(bad),bad);
 const rules=[{domain:'example.com',enabled:true,include_subdomains:false}];
 assert.equal(sourceAllowed('https://example.com/article',rules),true);
 for(const url of ['https://www.example.com/article','https://example.com.evil.com/','http://example.com/','https://user:pass@example.com/','https://127.1/','https://[::1]/','https://example.com:444/'])assert.equal(sourceAllowed(url,rules),false,url);
 rules[0].include_subdomains=true;assert.equal(sourceAllowed('https://www.example.com/a',rules),true);
 rules.push({domain:'blocked.example.com',enabled:false,include_subdomains:true});
 assert.equal(sourceAllowed('https://blocked.example.com/a',rules),false);assert.equal(sourceAllowed('https://deep.blocked.example.com/a',rules),false);
 assert.equal(safeSourceUrl('https://news.example.com/article'),true);
 for(const ip of ['0.0.0.0','10.0.0.1','100.100.100.200','127.0.0.1','169.254.169.254','172.16.1.1','192.168.1.1','198.18.0.1','224.0.0.1','::','::1','::ffff:127.0.0.1','fe80::1','fc00::1','2001:db8::1','2002:7f00:1::'])assert.equal(isPublicAddress(ip),false,ip);
 assert.equal(isPublicAddress('8.8.8.8'),true);assert.equal(isPublicAddress('2606:4700:4700::1111'),true);
});

test('source network checks every redirect and pins validated DNS; no requests to private or unapproved destinations',async()=>{
 const rules=[{domain:'example.com',enabled:true,include_subdomains:true}];
 const publicAnswer=[{address:'8.8.8.8',family:4}];let calls=0;
 const response={status:200,type:'text/html',text:'verified body '.repeat(20)};
 assert.equal(await readPublicSource('https://example.com/a',rules,{resolve:async()=>publicAnswer,request:async(url,address)=>{assert.equal(address.address,'8.8.8.8');assert.equal(url.hostname,'example.com');return response;}}),response.text);
 await assert.rejects(readPublicSource('https://example.com/a',rules,{resolve:async()=>[{address:'169.254.169.254',family:4}],request:async()=>{calls++;return response;}}));assert.equal(calls,0);
 await assert.rejects(readPublicSource('https://example.com/a',rules,{resolve:async()=>publicAnswer,request:async()=>{calls++;return {status:302,location:'https://evil.com/'};}}));assert.equal(calls,1);
 calls=0;
 await assert.rejects(readPublicSource('https://example.com/a',rules,{resolve:async host=>host==='internal.example.com'?[{address:'127.0.0.1',family:4}]:publicAnswer,request:async()=>{calls++;return {status:302,location:'https://internal.example.com/a'};}}));assert.equal(calls,1);
 for(const result of [{status:403,type:'text/html',text:''},{status:200,type:'application/pdf',text:'pdf'},{status:200,type:'text/html',text:'Just a moment '+'.'.repeat(150)}])await assert.rejects(readPublicSource('https://example.com/',rules,{resolve:async()=>publicAnswer,request:async()=>result}));
});

test('manual access review never claims automatic reachability or overrides a disabled domain; rights review required',()=>{
 const a=structuredClone(seedArticles[0]);a.status='review';a.checks.rights=true;
 for(const s of a.sources){s.reachable=false;s.policyAllowed=true;s.manualReview={id:'private-audit-record',reviewedAt:'2026-10-28T00:00:00Z'};}
 assert.equal(evaluateQuality(a).canApprove,true);assert.equal(a.sources[0].reachable,false);
 a.checks.rights=false;assert.equal(canTransition(a,'approve'),false);a.checks.rights=true;
 a.sources[0].policyAllowed=false;assert.equal(canTransition(a,'approve'),false);
 a.sources[0].policyAllowed=true;delete a.sources[0].manualReview;assert.equal(canTransition(a,'approve'),false);
});

test('source registry migration: admin RPC versions and audit atomicity, private tables, seed coverage and bounded growth',async()=>{
 const db=new PGlite();try{
  await db.exec('CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;');
  await db.exec(await readFile(new URL('../supabase/migrations/202610280004_source_registry.sql',import.meta.url),'utf8'));
  assert.equal((await db.query("SELECT count(*)::int AS n FROM browinfo_source_domains WHERE domain IN ('developers.openai.com','supabase.com') AND enabled")).rows[0].n,2);
  const value={label:'신문사',kind:'news',enabled:true,include_subdomains:false,usage_note:'사실 대조 후 직접 해설'};
  const put=async(domain,version,body=value)=>(await db.query('SELECT browinfo_put_source_domain($1,$2,$3,$4) AS d',[domain,version,JSON.stringify(body),'admin@private.example'])).rows[0].d;
  await db.exec('SET ROLE anon;');await assert.rejects(db.query('SELECT * FROM browinfo_source_domains'));await assert.rejects(put('news.example.com',0));
  await db.exec('RESET ROLE;SET ROLE authenticated;');await assert.rejects(db.query('SELECT * FROM browinfo_source_domain_events'));await assert.rejects(put('news.example.com',0));
  await db.exec('RESET ROLE;SET ROLE service_role;');
  const saved=await put('news.example.com',0);assert.equal(saved.version,1);assert.equal(saved.enabled,true);
  assert.equal(await put('news.example.com',0),null);assert.equal((await put('news.example.com',1,{...value,enabled:false})).version,2);
  await assert.rejects(put('news.example.com',2,{...value,kind:'unsupported'}));
  const rows=(await db.query("SELECT before_value,after_value FROM browinfo_source_domain_events WHERE domain='news.example.com' ORDER BY id")).rows;
  assert.equal(rows.length,2);assert.equal(rows[0].before_value,null);assert.equal(rows[1].before_value.enabled,true);assert.equal(rows[1].after_value.enabled,false);
  await db.exec('RESET ROLE;');
  const n=(await db.query('SELECT count(*)::int AS n FROM browinfo_source_domains')).rows[0].n;
  await db.query("INSERT INTO browinfo_source_domains(domain,label,kind,updated_by) SELECT 'news'||i||'.example.com','test','news','test' FROM generate_series(1,$1) i",[200-n]);
  await db.exec('SET ROLE service_role;');await assert.rejects(put('overflow.example.com',0));
  assert.equal((await put('news.example.com',2)).version,3);
 }finally{await db.close();}
});
