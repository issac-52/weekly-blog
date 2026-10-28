import {z} from 'zod';
import {requireAdmin} from '@/lib/auth';
import {createClient} from '@/lib/supabase/server';
import {guardMutation,input,failure,HttpError} from '@/lib/http';
export async function POST(request:Request){try{
 guardMutation(request);const admin=await requireAdmin();if(process.env.CHATGPT_DRAFTS_ENABLED!=='true'||admin.id!==process.env.MCP_ADMIN_USER_ID)throw new HttpError(403,'연결을 허용한 관리자 계정이 아닙니다.');
 const body=z.object({authorizationId:z.string().min(1).max(300),approve:z.boolean()}).parse(await input(request));
 const client=await createClient();const details=await client.auth.oauth.getAuthorizationDetails(body.authorizationId);
 if(details.error||!details.data||!('client'in details.data)||details.data.client.id!==process.env.CHATGPT_OAUTH_CLIENT_ID||details.data.redirect_uri!==process.env.CHATGPT_OAUTH_REDIRECT_URI)throw new HttpError(403,'등록한 OAuth 앱의 유효한 요청이 필요합니다.');
 const result=body.approve?await client.auth.oauth.approveAuthorization(body.authorizationId,{skipBrowserRedirect:true}):await client.auth.oauth.denyAuthorization(body.authorizationId,{skipBrowserRedirect:true});
 if(result.error||!result.data)throw new HttpError(400,'연결 승인을 처리하지 못했습니다.');
 const destination=new URL(result.data.redirect_url);const registered=new URL(details.data.redirect_uri);
 if(destination.protocol!=='https:'||destination.origin!==registered.origin||destination.pathname!==registered.pathname)throw new HttpError(400,'등록되지 않은 리디렉션입니다.');
 return Response.json({redirectUrl:destination.href},{headers:{'Cache-Control':'no-store'}});
}catch(e){return failure(e);}}
