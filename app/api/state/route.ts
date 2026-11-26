import {currentAdmin} from '@/lib/auth';
import {loadState} from '@/lib/store';
import {getPublishedState,visitorFlags} from '@/lib/published';
import {loadSourceDomains} from '@/lib/source-registry';
import {applySourcePolicy} from '@/lib/sources';
import {failure} from '@/lib/http';
export const dynamic='force-dynamic';
export async function GET(){try{const admin=await currentAdmin();const state=admin?await loadState():{...await getPublishedState()};if(admin){const rules=await loadSourceDomains();state.articles=state.articles.map(a=>({...a,sources:applySourcePolicy(a.sources,rules)}));}return Response.json({...state,...visitorFlags(Boolean(admin))},{headers:{'Cache-Control':'private,no-store','Vary':'Cookie'}});}catch(e){return failure(e);}}
