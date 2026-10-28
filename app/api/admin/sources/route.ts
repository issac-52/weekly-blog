import {z} from 'zod';
import {requireAdmin} from '@/lib/auth';
import {guardMutation,input,failure,HttpError} from '@/lib/http';
import {loadSourceDomains} from '@/lib/source-registry';
import {normalizeDomain} from '@/lib/source-policy.mjs';
import {rest} from '@/lib/store';
export const dynamic='force-dynamic';
const schema=z.object({domain:z.string().max(300),version:z.number().int().min(0),label:z.string().trim().min(1).max(100),kind:z.enum(['official','news','research','other']),enabled:z.boolean(),include_subdomains:z.boolean(),usage_note:z.string().trim().max(2000)});
export async function GET(){try{
 await requireAdmin();const domains=await loadSourceDomains();
 const events=await rest('browinfo_source_domain_events?select=*&order=id.desc&limit=30');
 return Response.json({domains,events},{headers:{'Cache-Control':'private,no-store','Vary':'Cookie'}});
}catch(e){return failure(e);}}
export async function POST(request:Request){try{
 const user=await requireAdmin();guardMutation(request);const body=schema.parse(await input(request));
 let domain;try{domain=normalizeDomain(body.domain);}catch(e){throw new HttpError(422,e instanceof Error?e.message:'도메인을 확인해주세요.');}
 const saved=await rest('rpc/browinfo_put_source_domain','POST',{p_domain:domain,p_expected:body.version,p_value:{label:body.label,kind:body.kind,enabled:body.enabled,include_subdomains:body.include_subdomains,usage_note:body.usage_note},p_actor:user.email});
 if(!saved)throw new HttpError(409,'다른 창에서 출처가 변경됐습니다. 새로고침 후 다시 수정해주세요.');
 return Response.json({domain:saved},{headers:{'Cache-Control':'private,no-store'}});
}catch(e){return failure(e);}}
