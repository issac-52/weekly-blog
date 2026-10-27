import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
const password=randomBytes(24).toString('hex'),base='http://127.0.0.1:3197';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3197'],{env:{...process.env,SITE_VISIBILITY:'private',PREVIEW_ACCESS_PASSWORD:password,CHATGPT_DRAFTS_ENABLED:'true',APP_ORIGIN:'https://browinfo.example',MCP_ADMIN_USER_ID:'owner',CHATGPT_OAUTH_CLIENT_ID:'chatgpt-client',ANALYTICS_ENABLED:'false',NEXT_PUBLIC_SUPABASE_URL:'https://testproject.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'',SUPABASE_SERVICE_ROLE_KEY:''},stdio:['ignore','pipe','pipe']});
let logs='';server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);
const auth={Authorization:`Basic ${Buffer.from(`preview:${password}`).toString('base64')}`};
try{
 let ready=false;for(let n=0;n<150;n++){try{if((await fetch(base,{redirect:'manual'})).status===401){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.equal(ready,true,logs);
 assert.equal((await fetch(base)).status,401);assert.equal((await fetch(base,{headers:{Authorization:'Basic bad'}})).status,401);
 assert.equal((await fetch(`${base}/admin`,{headers:auth,redirect:'manual'})).status,307);
 for(const path of ['/api/articles','/api/bookmarks','/api/pipeline','/api/oauth/consent']){const r=await fetch(base+path,{method:'POST',headers:{...auth,'Content-Type':'application/json'},body:'{}'});assert.equal(r.status,401,path);}
 for(const path of ['/api/export','/api/pipeline','/api/admin/analytics'])assert.equal((await fetch(base+path,{headers:auth})).status,401,path);
 for(const path of ['/mcp','/api/ingest']){const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(r.status,401,path);assert.match(r.headers.get('www-authenticate'),/oauth-protected-resource/);}
 const metadata=await fetch(`${base}/.well-known/oauth-protected-resource`);assert.equal(metadata.status,200);assert.equal((await metadata.json()).resource,'https://browinfo.example/mcp');
 const analytics=await fetch(`${base}/api/analytics/pageview`,{method:'POST',headers:{...auth,'Content-Type':'application/json'},body:'{}'});assert.equal(analytics.status,202);assert.equal((await analytics.json()).recorded,false);
 const cross=await fetch(`${base}/api/analytics/pageview`,{method:'POST',headers:{...auth,'Content-Type':'application/json',Origin:'https://evil.test'},body:'{}'});assert.equal(cross.status,403);
 assert.equal((await fetch(`${base}/api/generate`,{method:'POST',headers:auth})).status,404);
 assert.equal((await fetch(`${base}/api/cron/weekly`,{headers:auth})).status,404);
 console.log('HTTP checks passed: private gate, protected admin/statistics APIs, OAuth challenges/discovery, disabled analytics, cross-origin rejection, and removed paid-generation/Cron routes.');
}finally{server.kill('SIGTERM');}
