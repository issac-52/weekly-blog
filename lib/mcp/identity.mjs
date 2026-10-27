import {jwtVerify} from 'jose';
export async function verifyWriterJwt(token,jwks,config){
 const {payload}=await jwtVerify(token,jwks,{issuer:config.issuer,audience:config.resource,algorithms:['ES256','RS256'],requiredClaims:['sub','exp','iat'],clockTolerance:5});
 if(payload.sub!==config.adminId||payload.client_id!==config.clientId||payload.browinfo_scope!=='drafts:write')throw new Error('Draft writer permission required');
 return {userId:payload.sub,clientId:payload.client_id};
}
