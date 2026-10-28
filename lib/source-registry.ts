import 'server-only';
import {rest} from './store';
import type {SourceDomain} from './types';
import {HttpError} from './http';
export async function loadSourceDomains():Promise<SourceDomain[]> {
 try{return await rest('browinfo_source_domains?select=*&order=domain.asc&limit=201');}
 catch {throw new HttpError(503,'출처 목록을 불러오지 못했습니다. 새 Supabase에 004 출처 관리 migration을 적용했는지 확인해주세요.');}
}
