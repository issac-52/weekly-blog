import {readFile} from 'node:fs/promises';
const args=process.argv.slice(2);const file=args.find(x=>!x.startsWith('--'));
if(!file||!args.includes('--confirm-new-project'))throw new Error('사용법: node --env-file=.env.local scripts/import-content.mjs browinfo-content.json --confirm-new-project');
const ref=process.env.EXPECTED_SUPABASE_PROJECT_REF,url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!ref||!key||url!==`https://${ref}.supabase.co`)throw new Error('새 전용 Supabase URL/ref와 서버 키 설정을 확인해주세요.');
const data=JSON.parse(await readFile(file,'utf8'));
for(const name of ['issues','articles','runs','events','bookmarks'])if(!Array.isArray(data[name]))throw new Error(`배열이 필요합니다: ${name}`);
const rowsets={
 browinfo_issues:data.issues.map(x=>({id:x.id,payload:JSON.stringify(x)})),
 browinfo_articles:data.articles.map(x=>{if(!x.id||!x.slug||!x.issueId||!['review','changes','approved','published','rejected'].includes(x.status)||!Number.isInteger(x.version))throw new Error('올바르지 않은 기사 데이터입니다.');return {id:x.id,slug:x.slug,issue_id:x.issueId,status:x.status,version:x.version,payload:JSON.stringify(x)};}),
 browinfo_runs:data.runs.map(x=>({id:x.id,run_key:x.key,payload:JSON.stringify(x)})),
 browinfo_events:data.events.map(x=>({id:x.id,article_id:x.articleId,payload:JSON.stringify(x)})),
 browinfo_bookmarks:data.bookmarks.map(id=>({article_id:id})),
};
const get=async path=>{const r=await fetch(`${url}/rest/v1/${path}`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});if(!r.ok)throw new Error(`조회 실패 ${r.status}`);return r.json();};
const getAll=async(table,select)=>{const all=[];const order=table==='browinfo_bookmarks'?'article_id':'id';for(let offset=0;offset<10000;offset+=500){const rows=await get(`${table}?select=${select}&order=${order}.asc&limit=500&offset=${offset}`);all.push(...rows);if(rows.length<500)return all;}throw new Error('10000개 이상의 행은 페이지별 이관 도구로 처리해주세요.');};
// Complete all validation before the first write; never overwrite target edits.
for(const [table,rows]of Object.entries(rowsets)){
 if(!rows.length)continue;
 const existing=await getAll(table,table==='browinfo_bookmarks'?'article_id':'*');
 for(const row of rows){const field=table==='browinfo_bookmarks'?'article_id':'id';const prior=existing.find(x=>x[field]===row[field]);if(prior&&Object.entries(row).some(([k,v])=>String(prior[k])!==String(v)))throw new Error(`대상에 다른 버전이 이미 있습니다: ${table}/${row[field]}. 기존 데이터를 덮어쓰지 않았습니다.`);}
}
for(const [table,rows]of Object.entries(rowsets)){
 for(let offset=0;offset<rows.length;offset+=100){const r=await fetch(`${url}/rest/v1/${table}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify(rows.slice(offset,offset+100))});if(!r.ok)throw new Error(`가져오기 중단: ${table}, HTTP ${r.status}. 완료된 테이블을 확인하고 같은 파일로 재실행하세요.`);}
 const after=await getAll(table,table==='browinfo_bookmarks'?'article_id':'id');const id=table==='browinfo_bookmarks'?'article_id':'id';if(!rows.every(x=>after.some(y=>y[id]===x[id])))throw new Error(`읽기 검증 실패: ${table}`);
 console.log(`${table}: ${rows.length}개 ID 읽기 확인`);
}
console.log('가져오기 완료. 관리자에서 제목·발행 상태·검토 이력을 추가로 확인하세요.');
