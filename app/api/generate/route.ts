import {requireAdmin} from '@/lib/auth';
import {guardMutation,failure} from '@/lib/http';
import {runWeeklyWriter} from '@/lib/automated-writer';
export const maxDuration=300;
export async function POST(request:Request){try{guardMutation(request);await requireAdmin();return Response.json(await runWeeklyWriter());}catch(e){return failure(e);}}
