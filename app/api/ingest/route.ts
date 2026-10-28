import {requireWriter,writerFailure} from '@/lib/mcp/auth';
import {draftContext,submitDrafts} from '@/lib/mcp/service';
import {input} from '@/lib/http';
export const maxDuration=120;
export async function GET(request:Request){try{await requireWriter(request);return Response.json(await draftContext(),{headers:{'Cache-Control':'no-store'}});}catch(e){return writerFailure(e);}}
export async function POST(request:Request){try{await requireWriter(request);return Response.json(await submitDrafts(await input(request)));}catch(e){return writerFailure(e);}}
