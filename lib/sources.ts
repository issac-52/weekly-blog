import type { Source } from './types';
export const sourceHosts=['bok.or.kr','imf.org','unep.org','un.org','anthropic.com','blog.cloudflare.com','github.blog','federalreserve.gov','ecb.europa.eu','oecd.org','worldbank.org','nextjs.org','typescriptlang.org'];
export function isAllowedSource(value:string) {
 try {const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&sourceHosts.some(h=>u.hostname===h||u.hostname.endsWith(`.${h}`));}catch{return false;}
}
export async function readSource(url:string):Promise<string> {
 let next=url;
 for(let redirects=0;redirects<4;redirects++) {
  if(!isAllowedSource(next)) throw new Error('허용된 공식 출처의 HTTPS 주소를 입력해주세요.');
  const res=await fetch(next,{redirect:'manual',signal:AbortSignal.timeout(10000),headers:{Accept:'text/html,application/rss+xml,application/xml,text/plain','User-Agent':'Browinfo/2.0 (private editorial source checker)'}});
  if(res.status>=300&&res.status<400) {next=new URL(res.headers.get('location')||'',next).href;continue;}
  if(!res.ok) throw new Error(`출처 접근 실패 (${res.status})`);
  const type=res.headers.get('content-type')||'';
  if(!/html|xml|text/.test(type)) throw new Error('텍스트로 확인 가능한 출처만 지원합니다.');
  const reader=res.body!.getReader();let size=0;let text='';const decoder=new TextDecoder();
  while(true) {const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1_500_000){await reader.cancel();break;}text+=decoder.decode(value,{stream:true});}
  if(text.length<120||/just a moment|attention required!|access denied/i.test(text.slice(0,1000))) throw new Error('출처 본문을 확인할 수 없습니다. 수동 확인이 필요합니다.');
  return text;
 }
 throw new Error('출처의 리디렉션 횟수가 초과되었습니다.');
}
export async function verifySources(sources:Source[]) {
 return Promise.all(sources.map(async source=>{
  try {await readSource(source.url);return {...source,reachable:true,verifiedAt:new Date().toISOString(),error:undefined};}
  catch(error) {return {...source,reachable:false,verifiedAt:new Date().toISOString(),error:error instanceof Error?error.message:'확인 실패'};}
 }));
}
export function stripTags(value:string) {return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();}
