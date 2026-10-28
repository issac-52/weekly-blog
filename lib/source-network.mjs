import {lookup} from 'node:dns/promises';
import https from 'node:https';
import {isPublicAddress,sourceAllowed} from './source-policy.mjs';

// Resolve once, reject non-public answers, and pin that address on the TLS request.
// Re-check registry + DNS at EVERY redirect; never forward credentials/cookies.
export async function readPublicSource(url,rules,dependencies={}) {
 const resolve=dependencies.resolve||lookup;
 const request=dependencies.request||requestPinned;
 let next=url;
 for(let redirects=0;redirects<4;redirects++) {
  if(!sourceAllowed(next,rules))throw new Error('활성화된 출처 도메인의 HTTPS 주소가 필요합니다.');
  const target=new URL(next);
  const answers=await boundedResolve(resolve,target.hostname);
  if(!answers.length||answers.some(a=>!isPublicAddress(a.address)))throw new Error('공개 인터넷 주소로 확인되지 않는 출처입니다.');
  const response=await request(target,answers[0]);
  if(response.status>=300&&response.status<400) {
   if(!response.location)throw new Error('출처 이동 주소를 확인할 수 없습니다.');
   next=new URL(response.location,next).href;continue;
  }
  if(response.status<200||response.status>=300)throw new Error(`자동 접근 확인 실패 (HTTP ${response.status}). 원문을 직접 확인해주세요.`);
  if(!/html|xml|text/i.test(response.type))throw new Error('텍스트로 확인 가능한 출처만 자동 검사합니다.');
  if(response.text.length<120||/just a moment|attention required!|access denied/i.test(response.text.slice(0,1500)))throw new Error('자동으로 본문을 확인하지 못했습니다. 차단을 우회하지 말고 수동 확인해주세요.');
  return response.text;
 }
 throw new Error('출처의 리디렉션 횟수가 초과되었습니다.');
}
function requestPinned(target,address) {
 return new Promise((resolve,reject)=>{
  const req=https.get(target,{agent:false,signal:AbortSignal.timeout(10000),headers:{Accept:'text/html,application/rss+xml,application/xml,text/plain','User-Agent':'Browinfo/2.2 (editorial source access checker)'},lookup:(_host,options,callback)=>options.all?callback(null,[address]):callback(null,address.address,address.family)},res=>{
   const status=res.statusCode||0;
   if(status>=300&&status<400){res.destroy();resolve({status,location:res.headers.location,type:'',text:''});return;}
   const type=String(res.headers['content-type']||'');
   if(status<200||status>=300||!/html|xml|text/i.test(type)){res.destroy();resolve({status,type,text:''});return;}
   const chunks=[];let size=0;
   res.on('data',chunk=>{size+=chunk.length;if(size>1_500_000){res.destroy(new Error('출처 본문이 자동 검사 한도를 넘었습니다.'));return;}chunks.push(chunk);});
   res.on('end',()=>resolve({status,type,text:Buffer.concat(chunks).toString('utf8')}));
   res.on('error',reject);
  });
  req.on('error',reject);
 });
}

function boundedResolve(resolve,hostname){
 return new Promise((done,fail)=>{
  const timer=setTimeout(()=>fail(new Error('출처 DNS 확인 시간이 초과됐습니다.')),5000);
  Promise.resolve().then(()=>resolve(hostname,{all:true,verbatim:true})).then(value=>{clearTimeout(timer);done(value);},error=>{clearTimeout(timer);fail(error);});
 });
}
