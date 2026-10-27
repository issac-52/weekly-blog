export class HttpError extends Error { constructor(public status:number,message:string){super(message);} }
export function guardMutation(request:Request) {
 const origin=request.headers.get('origin');
 if(origin&&origin!==new URL(request.url).origin) throw new HttpError(403,'허용되지 않은 요청입니다.');
 if(request.headers.get('sec-fetch-site')==='cross-site') throw new HttpError(403,'허용되지 않은 요청입니다.');
 // Each write route separately enforces a verified Supabase admin session.
}
export async function input(request:Request) {
 const text=await request.text();if(text.length>200000)throw new HttpError(413,'요청이 너무 큽니다.');
 try{return JSON.parse(text);}catch{throw new HttpError(400,'올바른 JSON 요청이 필요합니다.');}
}
export function failure(error:unknown) {
 if(error instanceof HttpError) return Response.json({error:error.message},{status:error.status});
 if(error instanceof Error&&error.name==='ZodError') return Response.json({error:'입력 내용을 확인해주세요. 필수 항목 또는 형식이 올바르지 않습니다.'},{status:400});
 console.error(error instanceof Error?error.message:'Request failed');
 return Response.json({error:error instanceof Error?error.message:'요청을 처리할 수 없습니다.'},{status:409});
}
