import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
const password=randomBytes(24).toString('hex'),cron=randomBytes(32).toString('hex'),base='http://127.0.0.1:3197';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3197'],{env:{...process.env,SITE_VISIBILITY:'private',PREVIEW_ACCESS_PASSWORD:password,CRON_SECRET:cron,AI_GENERATION_ENABLED:'false',NEXT_PUBLIC_SUPABASE_URL:'',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'',SUPABASE_SERVICE_ROLE_KEY:''},stdio:['ignore','pipe','pipe']});
let logs='';server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);
const auth={Authorization:`Basic ${Buffer.from(`preview:${password}`).toString('base64')}`};
try{
 let ready=false;for(let n=0;n<150;n++){try{const r=await fetch(base,{redirect:'manual'});if(r.status===401){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.equal(ready,true,logs);
 assert.equal((await fetch(base)).status,401);
 assert.equal((await fetch(base,{headers:{Authorization:'Basic bad'}})).status,401);
 assert.equal((await fetch(`${base}/admin`,{headers:auth,redirect:'manual'})).status,307);
 for(const path of ['/api/articles','/api/bookmarks','/api/pipeline','/api/generate']){const r=await fetch(base+path,{method:'POST',headers:{...auth,'Content-Type':'application/json'},body:'{}'});assert.equal(r.status,401,path);}
 for(const path of ['/api/export','/api/pipeline'])assert.equal((await fetch(base+path,{headers:auth})).status,401,path);
 assert.equal((await fetch(`${base}/api/cron/weekly`,{headers:auth})).status,401);
 const cronResult=await fetch(`${base}/api/cron/weekly`,{headers:{Authorization:`Bearer ${cron}`}});assert.equal(cronResult.status,200);assert.equal((await cronResult.json()).skipped,true);
 console.log('HTTP route checks passed: preview gate, admin redirect, 6 protected API operations, cron authorization, disabled generator.');
}finally{server.kill('SIGTERM');}
