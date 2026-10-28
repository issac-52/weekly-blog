import {isIP, BlockList} from 'node:net';
import {domainToASCII} from 'node:url';

// Only globally routable addresses. IPv4-mapped IPv6 is rejected as well.
const blocked = new BlockList();
for (const [ip, bits] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',3]]) blocked.addSubnet(ip,bits,'ipv4');
for (const [ip, bits] of [['2001::',23],['2001:db8::',32],['2002::',16],['3fff::',20]]) blocked.addSubnet(ip,bits,'ipv6');
const globalV6 = new BlockList(); globalV6.addSubnet('2000::',3,'ipv6');
export function isPublicAddress(address) {
 const family=isIP(address);
 return family===4?!blocked.check(address,'ipv4'):family===6&&globalV6.check(address,'ipv6')&&!blocked.check(address,'ipv6');
}
export function normalizeDomain(value) {
 if(typeof value!=='string')throw new Error('도메인을 입력해주세요.');
 const raw=value.trim().toLowerCase();
 if(!raw||/[\s/:@?#\\*%]/.test(raw))throw new Error('https://나 경로 없이 도메인만 입력해주세요.');
 const domain=domainToASCII(raw.replace(/\.$/,''));
 const labels=domain.split('.');
 if(domain.length>253||isIP(domain)||labels.length<2||labels.some(x=>!x||x.length>63||!/^([a-z0-9]|[a-z0-9][a-z0-9-]*[a-z0-9])$/.test(x))||!/[a-z]/.test(labels.at(-1))||/\.(local|localhost|internal|invalid|test|example|onion)$/.test(domain)||['co.kr','or.kr','go.kr','ac.kr','co.uk','com.au'].includes(domain))throw new Error('공개 서비스의 유효한 도메인을 입력해주세요.');
 return domain;
}
export function safeSourceUrl(value) {
 try {const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.hash&&normalizeDomain(u.hostname)===u.hostname;}catch{return false;}
}
export function sourceRule(value,rules) {
 if(!safeSourceUrl(value))return null;
 const hostname=new URL(value).hostname;
 return rules.filter(r=>hostname===r.domain||(r.include_subdomains&&hostname.endsWith(`.${r.domain}`))).sort((a,b)=>b.domain.length-a.domain.length)[0]||null;
}
export function sourceAllowed(value,rules) {return sourceRule(value,rules)?.enabled===true;}
