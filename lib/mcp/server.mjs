import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
export function createDraftServer(service,submissionSchema){
 const server=new McpServer({name:'browinfo-draft-writer',version:'2.1.0'});
 const schemes=[{type:'oauth2',scopes:['openid','email']}];
 const text=value=>({content:[{type:'text',text:JSON.stringify(value)}]});
 const handle=fn=>async input=>{try{return text(await fn(input));}catch(error){return {...text({error:error.message||'초안 처리 실패'}),isError:true};}};
 server.registerTool('get_draft_context',{title:'주간 초안 작성 맥락 확인',description:'주간 호·기존 실행·사용한 출처만 읽습니다. 통계·개인정보·관리 이력은 반환하지 않습니다.',inputSchema:z.object({}),annotations:{readOnlyHint:true,openWorldHint:false},_meta:{securitySchemes:schemes}},handle(()=>service.context()));
 server.registerTool('submit_drafts',{title:'주간 초안을 검토 대기열에 저장',description:'ChatGPT가 직접 조사·작성한 기사와 출처를 제출합니다. 초안은 review로만 저장되며 기존 글 수정·승인·발행은 할 수 없습니다.',inputSchema:submissionSchema,annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:true,openWorldHint:true},_meta:{securitySchemes:schemes}},handle(service.submit));
 server.registerTool('get_submission_status',{title:'초안 저장 결과 확인',description:'실행 키의 저장 결과·검토 상태·출처 검사 결과를 읽습니다.',inputSchema:z.object({key:z.string().min(8).max(120)}),annotations:{readOnlyHint:true,openWorldHint:false},_meta:{securitySchemes:schemes}},handle(({key})=>service.status(key)));
 return server;
}
