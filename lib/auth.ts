import 'server-only';
import {createClient} from './supabase/server';
import {allowedAdmin} from './security/access.mjs';
import {HttpError} from './http';
export async function currentAdmin(){
 if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)return null;
 const client=await createClient();const {data,error}=await client.auth.getUser();
 if(error||!data.user||!allowedAdmin(data.user.email,process.env.ADMIN_EMAILS))return null;
 return {id:data.user.id,email:data.user.email!,displayName:data.user.email!};
}
export async function requireAdmin(){const admin=await currentAdmin();if(!admin)throw new HttpError(401,'관리자 로그인이 필요합니다.');return admin;}
