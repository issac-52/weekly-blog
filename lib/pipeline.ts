import { z } from 'zod';
import { loadState,persistRun } from './store';
import { readSource,verifySources,stripTags,isAllowedSource } from './sources';
import type { Article,Issue,Run } from './types';
import { HttpError } from './http';
const source=z.object({id:z.string().min(1).max(30),title:z.string().min(3).max(300),publisher:z.string().min(2).max(80),url:z.string().url().refine(isAllowedSource),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)});
const draft=z.object({title:z.string().min(5).max(160),description:z.string().min(30).max(600),category:z.enum(['경제·금융','세계·정세','IT·AI','라이프·트렌드']),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),takeaways:z.array(z.string().min(5).max(500)).min(2).max(6),sections:z.array(z.object({heading:z.string().min(2).max(150),text:z.string().min(40).max(10000),sourceIds:z.array(z.string()).min(1).max(10),kind:z.enum(['fact','analysis'])})).min(2).max(10),sources:z.array(source).min(1).max(5)});
export const pipelineSchema=z.object({mode:z.enum(['collect','ai']).default('ai'),idempotencyKey:z.string().min(8).max(120).regex(/^[a-zA-Z0-9:_-]+$/),issueId:z.string().regex(/^\d{4}-W\d{2}$/),issue:z.object({id:z.string(),number:z.string().max(10),title:z.string().min(5).max(150),subtitle:z.string().max(500),start:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),end:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),label:z.string().max(50)}).optional(),articles:z.array(draft).min(1).max(5).optional()});
export async function generate(body:z.infer<typeof pipelineSchema>) {
 const state=await loadState();const prior=state.runs.find(r=>r.key===body.idempotencyKey);
 if(prior)return {run:prior,replayed:true};
 if(!state.issues.some(i=>i.id===body.issueId)&&(!body.issue||body.issue.id!==body.issueId))throw new HttpError(400,'새 주간 호의 메타데이터가 필요합니다.');
 if(body.issue&&body.issue.id!==body.issueId)throw new HttpError(400,'주간 호 식별자가 일치하지 않습니다.');
 let inputs=body.articles;
 if(body.mode==='collect') {
  const xml=await readSource('https://blog.cloudflare.com/rss/');
  const items=[...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].slice(0,12);
  const existing=new Set(state.articles.flatMap(a=>a.sources.map(s=>s.url.replace(/\/$/,''))));
  inputs=[];
  for(const item of items) {
   const read=(tag:string)=>stripTags(item[1].match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,'i'))?.[1]||'');
   const url=read('link');if(!url||!isAllowedSource(url)||existing.has(url.replace(/\/$/,'')))continue;
   const title=read('title').slice(0,150);const summary=read('description').slice(0,160);const rawDate=Date.parse(read('pubDate'));const date=Number.isFinite(rawDate)?new Date(rawDate).toISOString().slice(0,10):new Date().toISOString().slice(0,10);
   inputs.push({title:`[검토 초안] ${title}`,description:`공식 피드에서 수집한 원문 후보입니다. 한국어 요약과 사실관계를 편집자가 확인한 뒤 승인해주세요. ${summary}`.slice(0,600),category:'IT·AI',date,takeaways:['공식 피드에서 수집한 원문입니다. 핵심 사실을 원문과 대조해주세요.','한국어 해설과 영향을 보완한 뒤 편집 확인을 완료해주세요.'],sections:[{heading:'원문 발췌 · 수집 단계',text:`${summary} 이 문단은 RSS 설명의 일부를 담은 수집 초안입니다. 원문을 읽고 정확한 한국어 요약으로 수정해주세요.`,sourceIds:['s1'],kind:'fact'},{heading:'편집자가 보완할 내용',text:'이 소식이 누구에게 어떤 변화를 주는지, 원문에서 확인되는 사실과 편집자의 해석을 구분해 작성해주세요. 성능·비용 등 공급자의 주장은 조건과 한계를 함께 표시해야 합니다.',sourceIds:['s1'],kind:'analysis'}],sources:[{id:'s1',title,publisher:'Cloudflare',url,date}]});
   if(inputs.length===2)break;
  }
 }
 if(!inputs?.length)throw new HttpError(422,'새로 수집할 기사가 없습니다. 다음 업데이트 후 다시 실행해주세요.');
 const articles:Article[]=[];
 const existingUrls=new Set(state.articles.filter(a=>a.issueId===body.issueId).flatMap(a=>a.sources.map(s=>s.url.replace(/\/$/,''))));
 for(const d of inputs) {
  if(d.sources.every(s=>existingUrls.has(s.url.replace(/\/$/,''))))continue;
  const ids=new Set(d.sources.map(s=>s.id));
  if(d.sections.some(s=>s.sourceIds.some(id=>!ids.has(id))))throw new HttpError(400,'본문의 출처 표시가 실제 출처와 일치하지 않습니다.');
  const id=crypto.randomUUID();const sources=await verifySources(d.sources);
  for(const s of d.sources)existingUrls.add(s.url.replace(/\/$/,''));
  articles.push({...d,id,slug:`brief-${id}`,issueId:body.issueId,status:'review',version:1,readMinutes:Math.max(2,Math.ceil(d.sections.map(s=>s.text).join('').length/500)),cover:d.category==='경제·금융'?'market':d.category==='세계·정세'?'globe':'chip',kicker:'새로운 관점',author:'Browinfo AI 에디터',checks:{facts:false,context:false,disclosure:false},sources,reviewNote:'',generatedBy:body.mode==='ai'?'ChatGPT 예약 초안':'RSS 자동 수집 · 편집 보완 필요',updatedAt:new Date().toISOString()});
 }
 const run:Run={id:crypto.randomUUID(),issueId:body.issueId,key:body.idempotencyKey,status:articles.length?'completed':'skipped',createdAt:new Date().toISOString(),articleIds:articles.map(a=>a.id),message:`${articles.length}개 초안을 검토 대기열에 저장했습니다. 자동 발행하지 않습니다.`};
 try {await persistRun(run,articles,body.issue as Issue|undefined);}catch(error){
  const duplicate=(await loadState()).runs.find(r=>r.key===body.idempotencyKey);if(duplicate)return {run:duplicate,replayed:true};throw error;
 }
 return {run,replayed:false};
}
