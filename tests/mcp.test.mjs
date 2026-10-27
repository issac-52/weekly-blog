import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,exportJWK,SignJWT,createLocalJWKSet} from 'jose';
import {z} from 'zod';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {WebStandardStreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import {verifyWriterJwt} from '../lib/mcp/identity.mjs';
import {createDraftServer} from '../lib/mcp/server.mjs';
import {safeReturnTo,trustedOAuthRedirect} from '../lib/security/access.mjs';
const config={issuer:'https://project.supabase.co/auth/v1',resource:'https://browinfo.example/mcp',adminId:'owner',clientId:'chatgpt-client'};
test('writer JWT validates signature, audience, issuer, expiry, owner, client and narrow permission',async()=>{
 const {publicKey,privateKey}=await generateKeyPair('ES256');const jwk=await exportJWK(publicKey);jwk.kid='test';const keys=createLocalJWKSet({keys:[jwk]});
 const sign=(changes={},options={})=>new SignJWT({client_id:config.clientId,browinfo_scope:'drafts:write',...changes}).setProtectedHeader({alg:'ES256',kid:'test'}).setSubject(options.sub||config.adminId).setIssuer(options.issuer||config.issuer).setAudience(options.aud||config.resource).setIssuedAt().setExpirationTime(options.exp||'5m').sign(privateKey);
 const token=await sign();assert.equal((await verifyWriterJwt(token,keys,config)).userId,'owner');
 for(const token of [await sign({client_id:'other'}),await sign({browinfo_scope:'admin'}),await sign({}, {sub:'other'}),await sign({}, {issuer:'https://evil.test'}),await sign({}, {aud:'authenticated'}),await sign({}, {exp:Math.floor(Date.now()/1000)-30})])await assert.rejects(verifyWriterJwt(token,keys,config));
 assert.equal(safeReturnTo('https://evil.test'),'/admin');assert.equal(safeReturnTo('/oauth/consent?authorization_id=x'),'/oauth/consent?authorization_id=x');assert.equal(trustedOAuthRedirect('https://evil.test/callback','https://chatgpt.com/callback'),false);
});
test('MCP exposes only draft context, submit and status; no publish, DB admin, or statistics',async()=>{
 let submitted=0;
 async function call(method,params){const server=createDraftServer({context:async()=>({issues:[]}),submit:async body=>{submitted++;return {status:'review',body};},status:async key=>({key,status:'review'})},z.object({mode:z.literal('ai'),idempotencyKey:z.string()}));const transport=new WebStandardStreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});await server.connect(transport);try{const body={jsonrpc:'2.0',id:1,method,...(params?{params}:{})};const response=await transport.handleRequest(new Request('https://browinfo.example/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2025-03-26'},body:JSON.stringify(body)}));return {status:response.status,body:await response.json()};}finally{await transport.close();await server.close();}}
 const tools=await call('tools/list');assert.equal(tools.status,200);assert.deepEqual(tools.body.result.tools.map(t=>t.name).sort(),['get_draft_context','get_submission_status','submit_drafts']);
 const bad=await call('tools/call',{name:'publish',arguments:{}});assert.ok(bad.body.result?.isError||bad.body.error);assert.equal(submitted,0);
 const good=await call('tools/call',{name:'submit_drafts',arguments:{mode:'ai',idempotencyKey:'test-key'}});assert.equal(good.status,200);assert.equal(submitted,1);assert.match(good.body.result.content[0].text,/review/);
});
test('optional token hook grants draft-only audience for the configured owner and OAuth client',async()=>{
 const db=new PGlite();try{await db.exec('CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE supabase_auth_admin;');await db.exec(await readFile(new URL('../supabase/optional/chatgpt_oauth.sql',import.meta.url),'utf8'));
 const user='10000000-0000-4000-8000-000000000001';await db.query('INSERT INTO browinfo_oauth_config(client_id,admin_user_id,resource) VALUES($1,$2,$3)',[config.clientId,user,config.resource]);
 const event={user_id:user,client_id:config.clientId,claims:{aud:'authenticated',sub:user,role:'authenticated',client_id:config.clientId}};
 const execute=async v=>(await db.query('SELECT browinfo_access_token_hook($1) AS d',[JSON.stringify(v)])).rows[0].d;
 const ok=await execute(event);assert.equal(ok.claims.aud,config.resource);assert.equal(ok.claims.browinfo_scope,'drafts:write');assert.equal(ok.claims.role,'authenticated');
 assert.equal((await execute({...event,client_id:'other'})).claims.aud,'authenticated');
 await db.exec('SET ROLE anon;');await assert.rejects(db.query('SELECT * FROM browinfo_oauth_config'));await assert.rejects(execute(event));
 }finally{await db.close();}
});
