import {redirect} from 'next/navigation';
import {currentAdmin} from '@/lib/auth';
import {createClient} from '@/lib/supabase/server';
import {trustedOAuthRedirect} from '@/lib/security/access.mjs';
import OAuthConsent from '@/components/magazine/OAuthConsent';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{authorization_id?:string}>}){
 const id=(await searchParams).authorization_id;if(!id||id.length>300)return <main className="container"><h1>올바른 연결 요청이 아닙니다.</h1></main>;
 const admin=await currentAdmin();if(!admin)redirect(`/admin/login?next=${encodeURIComponent(`/oauth/consent?authorization_id=${encodeURIComponent(id)}`)}`);
 if(process.env.CHATGPT_DRAFTS_ENABLED!=='true'||admin.id!==process.env.MCP_ADMIN_USER_ID)return <main className="container"><h1>초안 연결을 허용한 관리자 계정이 필요합니다.</h1></main>;
 const client=await createClient();const {data,error}=await client.auth.oauth.getAuthorizationDetails(id);
 if(error||!data)return <main className="container"><h1>연결 요청이 만료되었거나 유효하지 않습니다.</h1></main>;
 if('redirect_url'in data){if(!trustedOAuthRedirect(data.redirect_url,process.env.CHATGPT_OAUTH_REDIRECT_URI||''))return <main>올바르지 않은 리디렉션입니다.</main>;redirect(data.redirect_url);}
 if(data.client.id!==process.env.CHATGPT_OAUTH_CLIENT_ID||data.redirect_uri!==process.env.CHATGPT_OAUTH_REDIRECT_URI)return <main className="container"><h1>등록한 ChatGPT 전용 OAuth 앱과 일치하지 않습니다.</h1></main>;
 return <OAuthConsent authorizationId={id} clientName={data.client.name||'ChatGPT'} scope={data.scope}/>;
}
