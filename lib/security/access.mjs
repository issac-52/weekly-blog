export function allowedAdmin(email,allowlist){return Boolean(email)&&String(allowlist||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());}
export function validBearer(value,secret){return Boolean(secret&&secret.length>=32)&&value===`Bearer ${secret}`;}
