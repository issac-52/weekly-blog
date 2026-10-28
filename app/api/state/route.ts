import {currentAdmin} from '@/lib/auth';
import {loadState,loadPublishedState} from '@/lib/store';
import {loadSourceDomains} from '@/lib/source-registry';
import {applySourcePolicy} from '@/lib/sources';
import {failure} from '@/lib/http';
export const dynamic='force-dynamic';
export async function GET(){try{const admin=await currentAdmin();const state=admin?await loadState():await loadPublishedState();if(admin){const rules=await loadSourceDomains();state.articles=state.articles.map(a=>({...a,sources:applySourcePolicy(a.sources,rules)}));}return Response.json({...state,isAdmin:Boolean(admin),isPrivate:process.env.SITE_VISIBILITY!=='public',analyticsEnabled:process.env.SITE_VISIBILITY==='public'&&process.env.ANALYTICS_ENABLED==='true'&&Boolean(process.env.ANALYTICS_SECRET&&process.env.ANALYTICS_SECRET.length>=32)},{headers:{'Cache-Control':'private,no-store','Vary':'Cookie'}});}catch(e){return failure(e);}}
