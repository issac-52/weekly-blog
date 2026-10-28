import {createClient} from '@/lib/supabase/server';
import {guardMutation,failure} from '@/lib/http';
export async function POST(request:Request){try{guardMutation(request);await(await createClient()).auth.signOut();return Response.json({ok:true});}catch(e){return failure(e);}}
