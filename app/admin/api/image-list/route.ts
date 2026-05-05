import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const dateFrom = req.nextUrl.searchParams.get('dateFrom') ?? undefined;
  const dateTo = req.nextUrl.searchParams.get('dateTo') ?? undefined;

  const admin = createAdminClient();
  let query = admin
    .from('meter_records')
    .select('id, block, row_no, image1_id, image2_id, image3_id')
    .or('image1_id.not.is.null,image2_id.not.is.null,image3_id.not.is.null')
    .order('block', { ascending: true })
    .order('row_no', { ascending: true, nullsFirst: false });

  if (dateFrom) query = query.gte('survey_date', dateFrom);
  if (dateTo) {
    const d = new Date(dateTo);
    d.setDate(d.getDate() + 1);
    query = query.lt('survey_date', d.toISOString().slice(0, 10));
  }

  const { data } = await query;
  type Row = { id: number; block: string; row_no: string | null; image1_id: string | null; image2_id: string | null; image3_id: string | null };
  const records = (data ?? []) as Row[];

  const images = records.flatMap((r) =>
    ([r.image1_id, r.image2_id, r.image3_id] as (string | null)[]).flatMap((imgId) => {
      if (!imgId) return [];
      const filename = imgId.split('/').pop() ?? imgId;
      return [{ path: imgId, filename }];
    })
  );

  return NextResponse.json(images);
}
