import {WebStandardStreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import {createDraftServer} from '@/lib/mcp/server.mjs';
import {requireWriter,writerFailure,mcpConfig} from '@/lib/mcp/auth';
import {draftContext,submitDrafts,submissionStatus} from '@/lib/mcp/service';
import {pipelineSchema} from '@/lib/pipeline';
import {z} from 'zod';
import {HttpError} from '@/lib/http';
export const maxDuration=120;
export const dynamic='force-dynamic';
export async function POST(request:Request){
 try{
  await requireWriter(request);const origin=request.headers.get('origin');
  if(origin&&origin!==mcpConfig().origin)throw new HttpError(403,'허용되지 않은 Origin입니다.');
  const text=await request.text();if(text.length>200000)throw new HttpError(413,'요청이 너무 큽니다.');
  let body;try{body=JSON.parse(text);}catch{throw new HttpError(400,'JSON 요청이 필요합니다.');}
  const server=createDraftServer({context:draftContext,submit:submitDrafts,status:submissionStatus},pipelineSchema.extend({mode:z.literal('ai')}));
  const transport=new WebStandardStreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
  await server.connect(transport);
  try{return await transport.handleRequest(new Request(request.url,{method:'POST',headers:request.headers,body:text}),{parsedBody:body});}
  finally{await transport.close();await server.close();}
 }catch(error){return writerFailure(error);}
}
export async function GET(request:Request){try{await requireWriter(request);return new Response(null,{status:405,headers:{Allow:'POST'}});}catch(e){return writerFailure(e);}}
export async function DELETE(request:Request){return GET(request);}
