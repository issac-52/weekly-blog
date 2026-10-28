import 'server-only';
import type { Article, Issue, Run, ReviewEvent, State } from './types';
const names={issues:'browinfo_issues',articles:'browinfo_articles',runs:'browinfo_runs',events:'browinfo_events',bookmarks:'browinfo_bookmarks'};
export function storageName(){return 'Supabase · Browinfo 전용 프로젝트';}
export async function rest(path:string,method='GET',body?:unknown):Promise<any>{
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 const ref=process.env.EXPECTED_SUPABASE_PROJECT_REF;
 if(!ref||url!==`https://${ref}.supabase.co`)throw new Error('전용 Supabase 프로젝트 참조 ID와 URL을 확인해주세요.');
 if(!url||!key)throw new Error('Browinfo 전용 Supabase 환경변수를 설정해주세요.');
 const res=await fetch(`${url.replace(/\/$/,'')}/rest/v1/${path}`,{method,cache:'no-store',signal:AbortSignal.timeout(20000),headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'return=representation,resolution=ignore-duplicates'},body:body===undefined?undefined:JSON.stringify(body)});
 if(!res.ok){console.error('Supabase request failed',res.status,path.split('?')[0]);throw new Error(`데이터 저장소 요청에 실패했습니다 (${res.status}).`);}
 return res.status===204?null:res.json();
}
async function rows(table:string,filter=''):Promise<Record<string,unknown>[]>{
 let offset=0;const all:Record<string,unknown>[]=[];
 while(true){const page=await rest(`${table}?select=*${filter}&limit=500&offset=${offset}&order=${table===names.bookmarks?'article_id':'id'}.asc`);all.push(...page);if(page.length<500)break;offset+=page.length;if(offset>=10000)throw new Error('데이터가 많아 페이지별 조회 API로 전환해야 합니다.');}
 return all;
}
const decode=<T>(values:Record<string,unknown>[])=>values.map(r=>JSON.parse(String(r.payload)) as T);
export async function loadState():Promise<State>{
 const [i,a,r,e,b]=await Promise.all([rows(names.issues),rows(names.articles),rows(names.runs),rows(names.events),rows(names.bookmarks)]);
 return {issues:decode<Issue>(i).sort((a,b)=>b.start.localeCompare(a.start)),articles:decode<Article>(a).sort((a,b)=>b.date.localeCompare(a.date)),runs:decode<Run>(r).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),events:decode<ReviewEvent>(e).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),bookmarks:b.map(x=>String(x.article_id)),storage:storageName()};
}
export async function loadPublishedState():Promise<State>{
 const articles=decode<Article>(await rows(names.articles,'&status=eq.published')).filter(a=>a.status==='published').sort((a,b)=>b.date.localeCompare(a.date));
 const issues=decode<Issue>(await rows(names.issues)).filter(i=>articles.some(a=>a.issueId===i.id)).sort((a,b)=>b.start.localeCompare(a.start));
 return {issues,articles,runs:[],events:[],bookmarks:[],storage:'발행한 기사'};
}
export async function saveArticle(a:Article,expectedVersion:number,event:ReviewEvent){
 const ok=await rest('rpc/browinfo_update_article','POST',{p_id:a.id,p_expected:expectedVersion,p_payload:JSON.stringify(a),p_status:a.status,p_slug:a.slug,p_event:JSON.stringify(event)});
 if(!ok)throw new Error('다른 창에서 글이 수정되었습니다. 새로고침 후 다시 확인해주세요.');
}
export async function persistRun(run:Run,articles:Article[],issue?:Issue){return rest('rpc/browinfo_ingest_run','POST',{p_run:JSON.stringify(run),p_articles:JSON.stringify(articles),p_issue:issue?JSON.stringify(issue):null});}
export async function setBookmark(id:string,saved:boolean){await rest(`${names.bookmarks}${saved?'':`?article_id=eq.${encodeURIComponent(id)}`}`,saved?'POST':'DELETE',saved?{article_id:id}:undefined);}
