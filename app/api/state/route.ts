import {currentAdmin} from '@/lib/auth';
import {loadState,loadPublishedState} from '@/lib/store';
import {failure} from '@/lib/http';
export const dynamic='force-dynamic';
export async function GET(){try{const admin=await currentAdmin();const state=admin?await loadState():await loadPublishedState();return Response.json({...state,isAdmin:Boolean(admin),isPrivate:process.env.SITE_VISIBILITY!=='public'},{headers:{'Cache-Control':'private,no-store','Vary':'Cookie'}});}catch(e){return failure(e);}}
