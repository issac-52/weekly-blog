import type {Source,SourceDomain} from './types';
import {loadSourceDomains} from './source-registry';
import {sourceAllowed,safeSourceUrl} from './source-policy.mjs';
import {readPublicSource} from './source-network.mjs';
export {safeSourceUrl};
export async function readSource(url:string,rules?:SourceDomain[]):Promise<string>{
 return readPublicSource(url,rules||await loadSourceDomains());
}
export async function verifySources(sources:Source[],registry?:SourceDomain[]) {
 const rules=registry||await loadSourceDomains();
 return Promise.all(sources.map(async source=>{
  const base={...source,manualReview:undefined,verifiedAt:new Date().toISOString(),policyAllowed:sourceAllowed(source.url,rules)};
  if(!base.policyAllowed)return {...base,reachable:false,error:'등록되지 않았거나 비활성화된 출처입니다. 출처 관리에서 확인해주세요.'};
  try {await readSource(source.url,rules);return {...base,reachable:true,error:undefined};}
  catch(error) {return {...base,reachable:false,error:error instanceof Error?error.message:'자동 접근 확인 실패'};}
 }));
}
export function assertAllowedSources(sources:Source[],rules:SourceDomain[]){
 const denied=sources.filter(s=>!sourceAllowed(s.url,rules));
 if(denied.length)throw new Error(`등록되지 않았거나 비활성화된 출처입니다: ${denied.map(s=>{try{return new URL(s.url).hostname;}catch{return '잘못된 URL';}}).join(', ')}. 관리자 출처 관리에서 확인해주세요.`);
}
export function applySourcePolicy(sources:Source[],rules:SourceDomain[]){return sources.map(s=>({...s,policyAllowed:sourceAllowed(s.url,rules)}));}
export function stripTags(value:string) {return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();}
