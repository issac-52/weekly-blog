import 'server-only';
import {loadState} from '../store';
import {pipelineSchema,generate} from '../pipeline';
import {HttpError} from '../http';
export async function draftContext(){
 const state=await loadState();
 return {schemaVersion:2,instructions:'공식 출처를 직접 조사하고 한국어 초안만 제출합니다. 사건·배경·의미를 설명하는 요약 3문장, 4~6개 소제목의 본문 약 1200~2000자를 권장합니다. 원문의 사실과 해설을 구분하고 문단별 sourceIds를 남깁니다. 같은 주의 원문과 실행 키를 중복하지 않습니다. 승인·발행은 사람이 처리합니다.',issues:state.issues,runs:state.runs.map(r=>({key:r.key,issueId:r.issueId,status:r.status,articleIds:r.articleIds})),usedSources:state.articles.map(a=>({issueId:a.issueId,urls:a.sources.map(s=>s.url)}))};
}
export async function submitDrafts(value:unknown){
 const body=pipelineSchema.parse(value);if(body.mode!=='ai')throw new HttpError(422,'ChatGPT 연결은 작성한 초안만 제출할 수 있습니다.');
 if(!body.articles||body.articles.some(a=>a.takeaways.length<3||a.sections.length<4||a.sections.reduce((n,s)=>n+s.text.length,0)<900))throw new HttpError(422,'핵심 요약 3개, 본문 4개 문단·900자 이상으로 배경과 의미를 설명해주세요.');
 return generate(body);
}
export async function submissionStatus(key:string){
 const state=await loadState();const run=state.runs.find(r=>r.key===key);if(!run)return {found:false};
 return {found:true,run,articles:state.articles.filter(a=>run.articleIds.includes(a.id)).map(a=>({id:a.id,title:a.title,status:a.status,checks:a.checks,sources:a.sources.map(s=>({url:s.url,reachable:s.reachable,error:s.error}))}))};
}
