import {requireAdmin} from '@/lib/auth';
import {rest} from '@/lib/store';
import {failure,HttpError} from '@/lib/http';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{await requireAdmin();const days=Number(new URL(request.url).searchParams.get('days')||'7');if(![7,30].includes(days))throw new HttpError(400,'7일 또는 30일을 선택해주세요.');const enabled=process.env.ANALYTICS_ENABLED==='true'&&process.env.SITE_VISIBILITY==='public'&&Boolean(process.env.ANALYTICS_SECRET&&process.env.ANALYTICS_SECRET.length>=32);return Response.json({enabled,...await rest('rpc/browinfo_analytics_overview','POST',{p_days:days})},{headers:{'Cache-Control':'private,no-store','Vary':'Cookie'}});}catch(e){return failure(e);}}
