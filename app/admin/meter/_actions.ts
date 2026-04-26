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

export async function getMeterRecords(
  page: number,
  pageSize: number,
  block?: string,
  search?: string,
  sortCol: SortCol = 'row_no',
  sortDir: SortDir = 'asc',
) {
  const admin = createAdminClient();
  const asc = sortDir === 'asc';
  let query = admin
    .from('meter_records')
    .select('*', { count: 'exact' })
    .order(sortCol, { ascending: asc, nullsFirst: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (block) query = query.eq('block', block);
  if (search) {
    const term = `%${search}%`;
    query = query.or(`row_no.ilike.${term},address.ilike.${term},old_meter_number.ilike.${term}`);
  }
  const { data, count, error } = await query;
  return { data: (data ?? []) as MeterRecord[], count: count ?? 0, error };
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
