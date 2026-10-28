import {z} from 'zod';
import {createClient} from '@/lib/supabase/server';
import {allowedAdmin} from '@/lib/security/access.mjs';
import {guardMutation,input,failure,HttpError} from '@/lib/http';
export async function POST(request:Request){try{guardMutation(request);const body=z.object({email:z.string().email().max(254),password:z.string().min(1).max(1024)}).parse(await input(request));if(!allowedAdmin(body.email,process.env.ADMIN_EMAILS))throw new HttpError(401,'계정 정보를 확인해주세요.');const client=await createClient();const {error}=await client.auth.signInWithPassword(body);if(error)throw new HttpError(401,'계정 정보를 확인해주세요.');return Response.json({ok:true});}catch(e){return failure(e);}}
