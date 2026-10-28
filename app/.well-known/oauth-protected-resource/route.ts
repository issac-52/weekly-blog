import {mcpConfig,writerFailure} from '@/lib/mcp/auth';
export const dynamic='force-dynamic';
export async function GET(){try{const c=mcpConfig();return Response.json({resource:c.resource,authorization_servers:[c.issuer],scopes_supported:['openid','email'],bearer_methods_supported:['header']},{headers:{'Cache-Control':'no-store'}});}catch(e){return writerFailure(e);}}
