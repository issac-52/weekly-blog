import {validBearer} from '@/lib/security/access.mjs';
import {failure} from '@/lib/http';
import {runWeeklyWriter} from '@/lib/automated-writer';
export const maxDuration=300;
export const dynamic='force-dynamic';
export async function GET(request:Request){if(!validBearer(request.headers.get('authorization'),process.env.CRON_SECRET))return Response.json({error:'Unauthorized'},{status:401});try{return Response.json(await runWeeklyWriter(),{headers:{'Cache-Control':'no-store'}});}catch(e){return failure(e);}}
