import 'server-only';
import {createRemoteJWKSet} from 'jose';
import {verifyWriterJwt} from './identity.mjs';
import {HttpError} from '../http';
let keys:ReturnType<typeof createRemoteJWKSet>|undefined;
let keysUrl='';
export function mcpConfig(){
 const origin=process.env.APP_ORIGIN;const db=process.env.NEXT_PUBLIC_SUPABASE_URL;
 if(!origin||!/^https:\/\/[^/]+$/.test(origin)||!db||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(db))throw new HttpError(503,'ChatGPT 연결용 APP_ORIGIN과 전용 Supabase URL을 설정해주세요.');
 return {origin,resource:`${origin}/mcp`,issuer:`${db}/auth/v1`,metadata:`${origin}/.well-known/oauth-protected-resource`,adminId:process.env.MCP_ADMIN_USER_ID||'',clientId:process.env.CHATGPT_OAUTH_CLIENT_ID||''};
}
export function writerChallenge(){const c=mcpConfig();return `Bearer resource_metadata="${c.metadata}", scope="openid email"`;}
export async function requireWriter(request:Request){
 if(process.env.CHATGPT_DRAFTS_ENABLED!=='true')throw new HttpError(503,'ChatGPT 초안 연결이 비활성화되어 있습니다.');
 const c=mcpConfig();if(!c.adminId||!c.clientId)throw new HttpError(503,'ChatGPT 전용 OAuth client와 관리자 ID를 설정해주세요.');
 const auth=request.headers.get('authorization')||'';if(!auth.startsWith('Bearer '))throw new HttpError(401,'ChatGPT 연결 인증이 필요합니다.');
 const url=`${c.issuer}/.well-known/jwks.json`;if(!keys||keysUrl!==url){keys=createRemoteJWKSet(new URL(url),{timeoutDuration:5000,cooldownDuration:30000});keysUrl=url;}
 try{return await verifyWriterJwt(auth.slice(7),keys,c);}catch{throw new HttpError(401,'유효한 초안 전용 OAuth 토큰이 필요합니다.');}
}
export function writerFailure(error:unknown){
 const status=error instanceof HttpError?error.status:500;
 const headers:Record<string,string>={'Cache-Control':'no-store'};
 if(status===401){try{headers['WWW-Authenticate']=writerChallenge();}catch{}}
 return Response.json({error:error instanceof HttpError?error.message:'초안 연결 요청을 처리하지 못했습니다.'},{status,headers});
}
