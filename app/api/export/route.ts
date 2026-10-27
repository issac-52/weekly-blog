import {requireAdmin} from '@/lib/auth';
import { loadState } from '@/lib/store';
import { failure } from '@/lib/http';
export const dynamic='force-dynamic';
export async function GET(){try{await requireAdmin();return Response.json({schemaVersion:1,exportedAt:new Date().toISOString(),...await loadState()},{headers:{'Content-Disposition':'attachment; filename="browinfo-content.json"','Cache-Control':'no-store'}});}catch(e){return failure(e);}}
