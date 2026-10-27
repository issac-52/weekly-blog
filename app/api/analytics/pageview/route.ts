import {z} from 'zod';
import {cookies} from 'next/headers';
import {currentAdmin} from '@/lib/auth';
import {rest} from '@/lib/store';
import {guardMutation,input,failure,HttpError} from '@/lib/http';
import {countableUserAgent,getVisitorIdentity,publicAnalyticsPath,visitorCookie} from '@/lib/analytics-identity.mjs';
export async function POST(request:Request){try{
 guardMutation(request);
 if(process.env.ANALYTICS_ENABLED!=='true'||process.env.SITE_VISIBILITY!=='public')return Response.json({recorded:false,reason:'disabled'},{status:202});
 if(!process.env.ANALYTICS_SECRET||process.env.ANALYTICS_SECRET.length<32)return Response.json({recorded:false,reason:'not_configured'},{status:202});
 if(!countableUserAgent(request.headers.get('user-agent')))return Response.json({recorded:false,reason:'bot'},{status:202});
 if(await currentAdmin())return Response.json({recorded:false,reason:'admin'},{status:202});
 const body=z.object({eventId:z.string().uuid(),path:z.string().max(180).refine(publicAnalyticsPath)}).parse(await input(request));
 const jar=await cookies();const identity=getVisitorIdentity(jar.get(visitorCookie)?.value,process.env.ANALYTICS_SECRET);
 const recorded=await rest('rpc/browinfo_record_pageview','POST',{p_id:body.eventId,p_path:body.path,p_visitor_hash:identity.hash});
 if(identity.isNew)jar.set(visitorCookie,identity.cookie,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*24*30});
 return Response.json({recorded:Boolean(recorded)},{headers:{'Cache-Control':'no-store'}});
}catch(error){if(error instanceof HttpError||error instanceof Error&&error.name==='ZodError')return failure(error);console.error('Analytics recording failed');return Response.json({recorded:false},{status:503});}}
