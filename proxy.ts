import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
function same(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
export async function proxy(request:NextRequest){
 // Fail closed for preview and production until an explicit public-release flag is set.
 if(process.env.SITE_VISIBILITY!=='public'){
  const password=process.env.PREVIEW_ACCESS_PASSWORD;
  const auth=request.headers.get('authorization')||'';let value='';
  try{if(auth.startsWith('Basic '))value=Buffer.from(auth.slice(6),'base64').toString('utf8').split(':').slice(1).join(':');}catch{}
  // Cron is reachable only with its separate long bearer secret, even in private mode.
  const cron=request.nextUrl.pathname==='/api/cron/weekly'&&process.env.CRON_SECRET&&process.env.CRON_SECRET.length>=32&&auth===`Bearer ${process.env.CRON_SECRET}`;
  if(!cron&&(!password||password.length<16||!same(value,password)))return new NextResponse('비공개 미리보기입니다. 접근 비밀번호를 설정하고 로그인해주세요.',{status:401,headers:{'WWW-Authenticate':'Basic realm="Browinfo Private Preview", charset="UTF-8"','Cache-Control':'no-store'}});
 }
 let response=NextResponse.next({request});
 if(!request.nextUrl.pathname.startsWith('/admin')&&!request.nextUrl.pathname.startsWith('/api/'))return response;
 if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)return response;
 const supabase=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{cookies:{getAll:()=>request.cookies.getAll(),setAll(values){values.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});values.forEach(({name,value,options})=>response.cookies.set(name,value,options));}}});
 await supabase.auth.getClaims();response.headers.set('Cache-Control','private, no-store');return response;
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico|favicon.svg).*)']};
