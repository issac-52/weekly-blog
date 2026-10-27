import {writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {seedIssues,seedArticles} from '../lib/seed.ts';
if(!process.argv.includes('--confirm-new-project'))throw new Error('전용 새 프로젝트에만 --confirm-new-project를 지정해 실행해주세요.');
const path=await mkdtemp(join(tmpdir(),'browinfo-seed-'));const file=join(path,'seed.json');
try{await writeFile(file,JSON.stringify({issues:seedIssues,articles:seedArticles,runs:[],events:[],bookmarks:[]}));const result=spawnSync(process.execPath,['scripts/import-content.mjs',file,'--confirm-new-project'],{stdio:'inherit',env:process.env});if(result.status!==0)process.exitCode=1;}finally{await rm(path,{recursive:true,force:true});}
