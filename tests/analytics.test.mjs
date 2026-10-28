import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {getVisitorIdentity,validVisitorCookie,publicAnalyticsPath,countableUserAgent} from '../lib/analytics-identity.mjs';
const secret='a'.repeat(40);
test('visitor cookie is signed; daily identifier rotates at Korean midnight without IP',()=>{
 const a=getVisitorIdentity(undefined,secret,new Date('2026-10-26T14:59:59Z'));
 assert.equal(a.isNew,true);assert.equal(validVisitorCookie(a.cookie,secret),true);
 const b=getVisitorIdentity(a.cookie,secret,new Date('2026-10-26T14:59:59Z'));assert.equal(b.hash,a.hash);assert.equal(b.isNew,false);
 const c=getVisitorIdentity(a.cookie,secret,new Date('2026-10-26T15:00:00Z'));assert.equal(c.day,'2026-10-27');assert.notEqual(c.hash,a.hash);assert.equal(c.cookie,a.cookie);
 assert.equal(validVisitorCookie(a.cookie.replace(/^./,'z'),secret),false);assert.throws(()=>getVisitorIdentity(a.cookie,''));
 assert.equal(publicAnalyticsPath('/admin'),false);assert.equal(publicAnalyticsPath('/blog/example?secret=x'),false);assert.equal(publicAnalyticsPath('/blog/example'),true);
 assert.equal(countableUserAgent('Googlebot/2.1'),false);assert.equal(countableUserAgent('Mozilla/5.0 Chrome/140'),true);
});
test('Postgres analytics de-duplicates, ignores drafts, aggregates KST days, and protects raw data',async()=>{
 const db=new PGlite();try{
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;');
  for(const file of ['202610260001_browinfo_magazine.sql','202610270003_analytics.sql'])await db.exec(await readFile(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8'));
  await db.query("INSERT INTO browinfo_articles(id,slug,issue_id,status,payload) VALUES ('a','published','week','published',$1),('d','draft','week','review','{}')",[JSON.stringify({title:'인기 글',status:'published'})]);
  const record=async(id,path,hash='a'.repeat(64))=>(await db.query('SELECT browinfo_record_pageview($1,$2,$3) AS ok',[id,path,hash])).rows[0].ok;
  const id='10000000-0000-4000-8000-000000000001';assert.equal(await record(id,'/'),true);assert.equal(await record(id,'/'),false);
  assert.equal(await record('10000000-0000-4000-8000-000000000002','/blog/published'),true);
  assert.equal(await record('10000000-0000-4000-8000-000000000003','/blog/published','b'.repeat(64)),true);
  assert.equal(await record('10000000-0000-4000-8000-000000000004','/blog/draft'),false);
  assert.equal(await record('10000000-0000-4000-8000-000000000005','/admin'),false);
  let result=(await db.query('SELECT browinfo_analytics_overview(7) AS d')).rows[0].d;
  assert.equal(result.todayViews,3);assert.equal(result.todayVisitors,2);assert.equal(result.todayArticleViews,2);assert.equal(result.daily.length,7);assert.equal(result.daily.at(-1).views,3);assert.equal(result.daily[0].views,0);assert.equal(result.popular[0].views,2);assert.equal(result.popular[0].title,'인기 글');
  await db.exec("INSERT INTO browinfo_pageviews(id,occurred_at,local_day,path,visitor_hash) VALUES ('20000000-0000-4000-8000-000000000001',now()-interval '1 day',(now() AT TIME ZONE 'Asia/Seoul')::date-1,'/','"+'c'.repeat(64)+"')");
  result=(await db.query('SELECT browinfo_analytics_overview(30) AS d')).rows[0].d;assert.equal(result.daily.length,30);assert.equal(result.yesterdayViews,1);assert.equal(result.last30Views,4);
  await db.exec('SET ROLE anon;');await assert.rejects(db.query('SELECT * FROM browinfo_pageviews'));await assert.rejects(db.query('SELECT browinfo_analytics_overview(7)'));
  await db.exec('RESET ROLE; SET ROLE service_role;');assert.equal((await db.query('SELECT browinfo_analytics_overview(7) AS d')).rows[0].d.todayViews,3);
 }finally{await db.close();}
});
