import 'server-only';
import {unstable_cache,revalidateTag} from 'next/cache';
import {loadPublishedState} from './store';
import type {State} from './types';

export const PUBLISHED_TAG='browinfo-published';

/** Published articles are the same for every visitor, so cache them instead of querying Supabase per request. */
export const getPublishedState=unstable_cache(loadPublishedState,['browinfo-published-state'],{tags:[PUBLISHED_TAG],revalidate:300});

export function visitorFlags(isAdmin:boolean){
 return {isAdmin,isPrivate:process.env.SITE_VISIBILITY!=='public',analyticsEnabled:process.env.SITE_VISIBILITY==='public'&&process.env.ANALYTICS_ENABLED==='true'&&Boolean(process.env.ANALYTICS_SECRET&&process.env.ANALYTICS_SECRET.length>=32)};
}

/** Server-rendered starting state for public pages. Falls back to client loading if the store is unavailable. */
export async function initialPublicState():Promise<State|null>{
 try{return {...await getPublishedState(),...visitorFlags(false)};}
 catch(error){console.error('Published state prerender failed',error instanceof Error?error.message:error);return null;}
}

/** Call after anything that can change what is published. The next request reads fresh data. */
export function invalidatePublished(){
 try{revalidateTag(PUBLISHED_TAG,{expire:0});}catch(error){console.error('Published cache invalidation failed',error instanceof Error?error.message:error);}
}
