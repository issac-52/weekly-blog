'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type MeterRecord = {
  id: number;
  block: string;
  row_no: string | null;
  name: string | null;
  address: string | null;
  old_meter_number: string | null;
  meter_number: string | null;
  reading: string | null;
  sealed: string | null;
  location: string | null;
  usage_type: string | null;
  floor: string | null;
  note: string | null;
  survey_date: string | null;
  cover_type: string | null;
  image1_id: string | null;
  image2_id: string | null;
  created_at: string;
};

export type MeterInsert = Omit<MeterRecord, 'id' | 'created_at'>;

async function requireAuth() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
}

export type SortCol = 'row_no' | 'address' | 'survey_date';
export type SortDir = 'asc' | 'desc';

export type StatusFilter = 'processed' | 'unprocessed' | 'closed';

// 6개 필드 전부 입력 AND 호폐 아님
const ALL_FILLED =
  'meter_number.not.is.null,reading.not.is.null,sealed.not.is.null,location.not.is.null,usage_type.not.is.null,floor.not.is.null';
// 하나라도 비어있음
const ANY_EMPTY =
  'meter_number.is.null,reading.is.null,sealed.is.null,location.is.null,usage_type.is.null,floor.is.null';
// 호폐 아님 (null 포함)
const NOT_CLOSED = 'note.is.null,note.neq.호폐';

export async function getMeterRecords(
  page: number,
  pageSize: number,
  block?: string,
  search?: string,
  sortCol: SortCol = 'row_no',
  sortDir: SortDir = 'asc',
  status?: StatusFilter,
) {
  const admin = createAdminClient();
  const asc = sortDir === 'asc';

  let mainQuery = admin
    .from('meter_records')
    .select('*', { count: 'exact' })
    .order(sortCol, { ascending: asc, nullsFirst: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  let totalQuery = admin.from('meter_records').select('*', { count: 'exact', head: true });
  let closedQuery = admin.from('meter_records').select('*', { count: 'exact', head: true }).eq('note', '호폐');
  let processedQuery = admin.from('meter_records').select('*', { count: 'exact', head: true })
    .or(NOT_CLOSED).not('meter_number', 'is', null).not('reading', 'is', null)
    .not('sealed', 'is', null).not('location', 'is', null)
    .not('usage_type', 'is', null).not('floor', 'is', null);

  if (block) {
    mainQuery = mainQuery.eq('block', block);
    totalQuery = totalQuery.eq('block', block);
    closedQuery = closedQuery.eq('block', block);
    processedQuery = processedQuery.eq('block', block);
  }
  if (search) {
    const term = `%${search}%`;
    const sf = `row_no.ilike.${term},address.ilike.${term},old_meter_number.ilike.${term}`;
    mainQuery = mainQuery.or(sf);
    totalQuery = totalQuery.or(sf);
    closedQuery = closedQuery.or(sf);
    processedQuery = processedQuery.or(sf);
  }

  // 상태 필터는 메인 쿼리에만 적용
  if (status === 'closed') {
    mainQuery = mainQuery.eq('note', '호폐');
  } else if (status === 'processed') {
    mainQuery = mainQuery.or(NOT_CLOSED).not('meter_number', 'is', null)
      .not('reading', 'is', null).not('sealed', 'is', null)
      .not('location', 'is', null).not('usage_type', 'is', null).not('floor', 'is', null);
  } else if (status === 'unprocessed') {
    mainQuery = mainQuery.or(NOT_CLOSED).or(ANY_EMPTY);
  }

  const [{ data, count, error }, { count: totalCount }, { count: closedCount }, { count: processedCount }] =
    await Promise.all([mainQuery, totalQuery, closedQuery, processedQuery]);

  return {
    data: (data ?? []) as MeterRecord[],
    count: count ?? 0,
    totalCount: totalCount ?? 0,
    processedCount: processedCount ?? 0,
    closedCount: closedCount ?? 0,
    error,
  };
}

export async function getBlockList(): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin.from('meter_records').select('block').order('block');
  const all = (data ?? []).map((r: { block: string }) => r.block);
  return [...new Set(all)];
}

export async function importFromExcel(block: string, rows: MeterInsert[]) {
  await requireAuth();
  const admin = createAdminClient();
  await admin.from('meter_records').delete().eq('block', block);
  const { error } = await admin.from('meter_records').insert(rows);
  if (error) return { error: error.message };
  revalidatePath('/admin/meter');
  return { success: true };
}

export async function updateMeterRecord(id: number, data: Partial<MeterInsert>) {
  await requireAuth();
  const admin = createAdminClient();
  const { error } = await admin.from('meter_records').update(data).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/meter');
  return { success: true };
}

export async function deleteMeterRecord(id: number) {
  await requireAuth();
  const admin = createAdminClient();
  const { error } = await admin.from('meter_records').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/meter');
  return { success: true };
}
