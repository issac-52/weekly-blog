import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { uploadToStorage, deleteFromStorage } from '@/lib/r2-storage';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const recordId = formData.get('record_id') as string | null;
  const slot = formData.get('slot') as '1' | '2' | null;
  const rowNo = formData.get('row_no') as string | null;

  if (!file || !recordId || !slot || !rowNo) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const ext = file.name.split('.').pop() ?? 'jpg';
  const filePath = `${rowNo}-${slot}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await uploadToStorage(buffer, filePath, file.type);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  const admin = createAdminClient();
  const column = slot === '1' ? 'image1_id' : 'image2_id';
  const { error } = await admin
    .from('meter_records')
    .update({ [column]: filePath })
    .eq('id', Number(recordId));

  if (error) {
    try {
      await deleteFromStorage(filePath);
    } catch {}
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ filePath });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { record_id, slot, file_path } = (await request.json()) as {
    record_id: number;
    slot: 1 | 2;
    file_path: string;
  };

  try {
    await deleteFromStorage(file_path);
  } catch {}

  const admin = createAdminClient();
  const column = slot === 1 ? 'image1_id' : 'image2_id';
  await admin.from('meter_records').update({ [column]: null }).eq('id', record_id);

  return NextResponse.json({ success: true });
}
