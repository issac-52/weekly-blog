import {requireAdmin} from '@/lib/auth';
import { z } from 'zod';
import { loadState,setBookmark } from '@/lib/store';
import { failure,guardMutation,HttpError,input } from '@/lib/http';
export async function POST(request:Request){try{await requireAdmin();guardMutation(request);const b=z.object({id:z.string(),saved:z.boolean()}).parse(await input(request));if(!(await loadState()).articles.some(a=>a.id===b.id&&a.status==='published'))throw new HttpError(404,'기사를 찾을 수 없습니다.');await setBookmark(b.id,b.saved);return Response.json({ok:true});}catch(e){return failure(e);}}
