import {requireAdmin} from '@/lib/auth';
import { z } from 'zod';
import { loadState,saveArticle } from '@/lib/store';
import { canTransition } from '@/lib/quality';
import { verifySources } from '@/lib/sources';
import { currentAdmin } from '@/lib/auth';
import { failure,guardMutation,HttpError,input } from '@/lib/http';
const section=z.object({heading:z.string().min(2).max(150),text:z.string().min(1).max(12000),sourceIds:z.array(z.string()).max(10),kind:z.enum(['fact','analysis']).optional()});
const schema=z.object({id:z.string().max(150),version:z.number().int().positive(),action:z.enum(['save','verify','approve','publish','changes','reject']),patch:z.object({title:z.string().min(5).max(160),description:z.string().min(20).max(600),takeaways:z.array(z.string().min(3).max(500)).min(2).max(6),sections:z.array(section).min(2).max(12),checks:z.object({facts:z.boolean(),context:z.boolean(),disclosure:z.boolean()}),reviewNote:z.string().max(2000)}).optional(),note:z.string().max(2000).optional()});
export async function POST(request:Request){try{
 await requireAdmin();guardMutation(request);const body=schema.parse(await input(request));
 const current=(await loadState()).articles.find(a=>a.id===body.id);
 if(!current)throw new HttpError(404,'기사를 찾을 수 없습니다.');
 if(current.version!==body.version)throw new HttpError(409,'다른 창에서 글이 수정되었습니다. 새로고침 후 다시 확인해주세요.');
 let next=structuredClone(current);
 if(body.action==='save') {
  if(!body.patch)throw new HttpError(400,'수정 내용이 필요합니다.');
  const changed=JSON.stringify([next.title,next.description,next.takeaways,next.sections])!==JSON.stringify([body.patch.title,body.patch.description,body.patch.takeaways,body.patch.sections]);
  next={...next,...body.patch,status:'review',checks:changed?{facts:false,context:false,disclosure:false}:body.patch.checks};
 } else if(body.action==='verify') {
  next.sources=await verifySources(next.sources);next.status='review';next.checks={facts:false,context:false,disclosure:false};
 } else {
  if(!canTransition(next,body.action))throw new HttpError(422,'출처 검사와 모든 편집 확인을 완료해야 승인할 수 있습니다. 발행은 승인된 글만 가능합니다.');
  if(['changes','reject'].includes(body.action)&&(!body.note||body.note.trim().length<5))throw new HttpError(400,'수정 요청·반려 사유를 5자 이상 입력해주세요.');
  next.status=({approve:'approved',publish:'published',changes:'changes',reject:'rejected'} as const)[body.action];
  if(body.note)next.reviewNote=body.note;
 }
 next.version=current.version+1;next.updatedAt=new Date().toISOString();
 const user=await currentAdmin();
 await saveArticle(next,current.version,{id:crypto.randomUUID(),articleId:next.id,action:body.action,note:body.note||next.reviewNote||'',actor:user?.displayName||'비공개 사이트 관리자',createdAt:next.updatedAt});
 return Response.json({article:next});
}catch(e){return failure(e);}}
