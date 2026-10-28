import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('Postgres migrations, RLS, atomic review, ingest rollback, and job leases',async()=>{
 const db=new PGlite();
 try{
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;');
  for(const file of ['202610260001_browinfo_magazine.sql','202610270002_generation_jobs.sql'])await db.exec(await readFile(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8'));
  const a={id:'a1',slug:'article-one',issueId:'week',status:'review',version:1,title:'initial'};
  const run={id:'r1',key:'one-run',issueId:'week'};
  await db.query('SELECT browinfo_ingest_run($1,$2,$3)',[JSON.stringify(run),JSON.stringify([a]),JSON.stringify({id:'week'})]);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM browinfo_articles')).rows[0].n,1);
  const revised={...a,status:'approved',version:2};const event={id:'e1'};
  assert.equal((await db.query('SELECT browinfo_update_article($1,$2,$3,$4,$5,$6) AS ok',[a.id,1,JSON.stringify(revised),'approved',a.slug,JSON.stringify(event)])).rows[0].ok,true);
  assert.equal((await db.query('SELECT browinfo_update_article($1,$2,$3,$4,$5,$6) AS ok',[a.id,1,JSON.stringify(revised),'approved',a.slug,JSON.stringify({id:'e2'})])).rows[0].ok,false);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM browinfo_events')).rows[0].n,1);
  await assert.rejects(db.query('SELECT browinfo_ingest_run($1,$2,$3)',[JSON.stringify({id:'r2',key:'two-run'}),JSON.stringify([a]),null]));
  assert.equal((await db.query("SELECT count(*)::int AS n FROM browinfo_runs WHERE id='r2'")).rows[0].n,0);
  await db.exec("INSERT INTO browinfo_articles(id,slug,issue_id,status,version,payload) VALUES('public','public-slug','week','published',1,'{}'); SET ROLE anon;");
  assert.deepEqual((await db.query('SELECT id FROM browinfo_articles')).rows,[{id:'public'}]);
  await assert.rejects(db.query('SELECT * FROM browinfo_events'));
  await assert.rejects(db.query("UPDATE browinfo_articles SET status='published'"));
  await db.exec('RESET ROLE; SET ROLE authenticated;');
  await assert.rejects(db.query('SELECT browinfo_claim_job($1,$2)',['job','token']));
  await db.exec('RESET ROLE; SET ROLE service_role;');
  assert.equal((await db.query('SELECT browinfo_claim_job($1,$2) AS ok',['job','owner-a'])).rows[0].ok,true);
  assert.equal((await db.query('SELECT browinfo_claim_job($1,$2) AS ok',['job','owner-b'])).rows[0].ok,false);
  assert.equal((await db.query('SELECT browinfo_finish_job($1,$2,$3,$4) AS ok',['job','owner-b',true,'{}'])).rows[0].ok,false);
  assert.equal((await db.query('SELECT browinfo_finish_job($1,$2,$3,$4) AS ok',['job','owner-a',false,'{}'])).rows[0].ok,true);
  assert.equal((await db.query('SELECT browinfo_claim_job($1,$2) AS ok',['job','owner-b'])).rows[0].ok,true);
  assert.equal((await db.query('SELECT browinfo_finish_job($1,$2,$3,$4) AS ok',['job','owner-b',true,'{}'])).rows[0].ok,true);
  assert.equal((await db.query('SELECT browinfo_claim_job($1,$2) AS ok',['job','owner-c'])).rows[0].ok,false);
 }finally{await db.close();}
});
