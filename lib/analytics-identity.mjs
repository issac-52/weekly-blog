import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
export const visitorCookie='browinfo_v';
const hmac=(secret,value)=>createHmac('sha256',secret).update(value).digest('hex');
export function validVisitorCookie(cookie,secret){if(!cookie||!secret||secret.length<32)return false;const [id,signature,...tail]=cookie.split('.');if(tail.length||!/^[a-f0-9]{48}$/.test(id||'')||!/^[a-f0-9]{64}$/.test(signature||''))return false;return timingSafeEqual(Buffer.from(signature),Buffer.from(hmac(secret,`cookie:${id}`)));}
export function getVisitorIdentity(cookie,secret,now=new Date()){
 if(!secret||secret.length<32)throw new Error('Analytics secret required');
 const existing=validVisitorCookie(cookie,secret);const id=existing?cookie.split('.')[0]:randomBytes(24).toString('hex');
 const day=new Date(now.getTime()+9*3600000).toISOString().slice(0,10);
 return {cookie:`${id}.${hmac(secret,`cookie:${id}`)}`,isNew:!existing,day,hash:hmac(secret,`daily:${day}:${id}`)};
}
export function countableUserAgent(agent){return Boolean(agent)&&!/bot\b|crawler|spider|headless|preview|facebookexternalhit|slurp|curl\/|wget\//i.test(agent);}
export function publicAnalyticsPath(path){return path==='/'||path==='/archive'||/^\/blog\/[a-zA-Z0-9_-]{1,150}$/.test(path);}
