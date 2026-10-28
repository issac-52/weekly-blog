import 'server-only';
import {loadState} from '../store';
import {pipelineSchema,generate} from '../pipeline';
import {HttpError} from '../http';
import {loadSourceDomains} from '../source-registry';
export async function draftContext(){
 const state=await loadState();
 return {schemaVersion:3,sourcePolicy:(await loadSourceDomains()).map(({domain,label,kind,enabled,include_subdomains,usage_note})=>({domain,label,kind,enabled,include_subdomains,usage_note})),instructions:'활성 출처 도메인만 사용해 직접 조사하고 한국어 초안을 제출합니다. 관련 출처 2~4개를 권장하며 같은 보도자료의 전재는 독립된 근거로 계산하지 않습니다. 기사 문장·구성을 따라 재작성하거나 전문·사진·표를 복제하지 말고 사실을 교차 확인해 직접 해설을 씁니다. 최소 인용은 구분하고 매체·날짜·원문 링크를 남깁니다. 유료벽·봇 차단을 우회하지 않으며 접근 실패는 수동 검토로 남깁니다. 이용 조건 확인은 발행 전 편집자가 수행합니다. 사건·배경·의미를 설명하는 요약 3문장, 4~6개 소제목의 본문 약 1200~2000자를 권장합니다. 원문의 사실과 해설을 구분하고 문단별 sourceIds를 남깁니다. 같은 주의 원문과 실행 키를 중복하지 않습니다. 승인·발행은 사람이 처리합니다.',issues:state.issues,runs:state.runs.map(r=>({key:r.key,issueId:r.issueId,status:r.status,articleIds:r.articleIds})),usedSources:state.articles.map(a=>({issueId:a.issueId,urls:a.sources.map(s=>s.url)}))};
}
export async function submitDrafts(value:unknown){
 const body=pipelineSchema.parse(value);if(body.mode!=='ai')throw new HttpError(422,'ChatGPT 연결은 작성한 초안만 제출할 수 있습니다.');
 if(!body.articles||body.articles.some(a=>a.takeaways.length<3||a.sections.length<4||a.sections.reduce((n,s)=>n+s.text.length,0)<900))throw new HttpError(422,'핵심 요약 3개, 본문 4개 문단·900자 이상으로 배경과 의미를 설명해주세요.');
 return generate(body);
}
export async function submissionStatus(key:string){
 const state=await loadState();const run=state.runs.find(r=>r.key===key);if(!run)return {found:false};
 return {found:true,run,articles:state.articles.filter(a=>run.articleIds.includes(a.id)).map(a=>({id:a.id,title:a.title,status:a.status,checks:a.checks,sources:a.sources.map(s=>({url:s.url,reachable:s.reachable,error:s.error,policyAllowed:s.policyAllowed,manualReview:s.manualReview?{confirmed:true,reviewedAt:s.manualReview.reviewedAt}:undefined}))}))};
}
