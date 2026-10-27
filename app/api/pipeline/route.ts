import {requireAdmin} from '@/lib/auth';
import { pipelineSchema,generate } from '@/lib/pipeline';
import { failure,guardMutation,input } from '@/lib/http';
import { sourceHosts } from '@/lib/sources';
export async function GET(){try{await requireAdmin();return Response.json({
 version:1,
 instructions:'검증된 Supabase 관리자 세션으로 검토 대기 초안만 추가합니다. 먼저 /api/state를 읽고 지난 ISO 주간(Asia/Seoul)의 weekly-ai:YYYY-Www 실행이 있으면 중단합니다. 공식 출처를 직접 열어 읽은 후 한국어로 최대 4개 기사를 작성합니다. 요약은 사건·배경·의미를 3개 이상의 완결된 문장으로 설명하고, 본문은 무슨 일이 있었는지·배경과 용어·달라지는 점·독자에게 주는 영향·확인할 한계를 다루는 4~6개 소제목, 총 1200~2000자 정도로 작성합니다. 분량을 채우려고 같은 말을 반복하거나 확인되지 않은 사실을 보태지 않습니다. 사실과 해설을 구분하고 모든 문단에 sourceIds를 연결합니다. 긴 인용, 근거 없는 수치, 투자 권고를 쓰지 않습니다. 기존 발행본, 공개 범위, 외부 계정 설정을 바꾸거나 승인·발행하지 않습니다. 실패 재시도는 같은 요청 본문과 idempotencyKey를 사용합니다. 저장 후 /api/state를 재조회해 상태 review, checks=false와 출처 검사 결과를 확인합니다.',
 allowedSourceHosts:sourceHosts,
 method:'POST /api/pipeline',
 requestShape:{mode:'ai',idempotencyKey:'weekly-ai:YYYY-Www',issueId:'YYYY-Www',issue:{id:'YYYY-Www',number:'기존 호 번호+1 (문자열)',title:'주간 제목 5~150자',subtitle:'500자 이내',start:'YYYY-MM-DD',end:'YYYY-MM-DD',label:'10월 넷째 주'},articles:[{title:'5~160자',description:'30~600자',category:'경제·금융 | 세계·정세 | IT·AI | 라이프·트렌드',date:'실제 원문 발행일 YYYY-MM-DD',takeaways:['5~500자 핵심 포인트를 2~6개'],sections:[{heading:'2~150자',text:'40~10000자, 문단을 2~10개',kind:'fact | analysis',sourceIds:['s1']}],sources:[{id:'s1',title:'정확한 원문 제목',publisher:'공식 발행 기관',date:'YYYY-MM-DD',url:'공식 원문 HTTPS URL'}]}]},
 notes:['기존 주간 호는 issue 메타데이터 생략 가능. 새 주간 호는 필수입니다.','한 기사의 출처는 1~5개. 같은 호에 이미 포함된 출처 URL을 재사용하지 않습니다.','생성 결과는 자동 승인되지 않습니다. 출처 접근 실패가 있으면 편집자에게 알립니다.','이 계약의 예시는 형식 안내이며 실제 기사 본문으로 제출하지 않습니다.'],
 },{headers:{'Cache-Control':'no-store'}});}catch(e){return failure(e);}}
export async function POST(request:Request){try{await requireAdmin();guardMutation(request);return Response.json(await generate(pipelineSchema.parse(await input(request))));}catch(e){return failure(e);}}
