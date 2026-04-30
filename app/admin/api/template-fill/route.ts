import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import ExcelJS from 'exceljs';
import type { MeterRecord } from '@/app/admin/meter/_actions';

// 1-based column indices for ExcelJS (0-based + 1)
const COL = {
  ROW_NO:        2,
  BLOCK:         5,
  OLD_METER_NO: 21,
  METER_NO:     22,
  READING:      27,
  SEALED:       28,
  METER_COND:   29,
  BOX_COND:     30,  // 보호통 상태 = cover_type
  LOCATION:     31,
  WATER_DIRECT: 33,
  WATER_TANK:   34,
  WATER_CISTERN:35,
  USAGE_TYPE:   38,
  FLOOR:        41,
  NOTE:         42,
  SURVEY_DATE:  43,
  COVER_TYPE:   46,
} as const;

const DATA_START_ROW = 4; // rows 1-3 are headers

function cellStr(row: ExcelJS.Row, col: number): string | null {
  const v = row.getCell(col).value;
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return new NextResponse('파일 읽기 실패', { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) return new NextResponse('파일이 없습니다', { status: 400 });

  const buffer = await file.arrayBuffer();

  // DB에서 조사 데이터 조회
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('meter_records')
    .select('*')
    .or(
      'and(note.is.null,meter_number.not.is.null,reading.not.is.null,sealed.not.is.null,location.not.is.null,usage_type.not.is.null,floor.not.is.null),' +
      'and(note.neq.호폐,meter_number.not.is.null,reading.not.is.null,sealed.not.is.null,location.not.is.null,usage_type.not.is.null,floor.not.is.null),' +
      'note.eq.호폐'
    )
    .order('block', { ascending: true })
    .order('row_no', { ascending: true, nullsFirst: false })
    .range(0, 99999);

  if (error) return new NextResponse('DB 조회 실패: ' + error.message, { status: 500 });

  const records = (data ?? []) as MeterRecord[];

  const byMeter = new Map<string, MeterRecord>();
  const byPos   = new Map<string, MeterRecord>();
  for (const r of records) {
    if (r.old_meter_number) byMeter.set(r.old_meter_number, r);
    if (r.block && r.row_no) byPos.set(`${r.block}::${r.row_no}`, r);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) return new NextResponse('시트를 찾을 수 없습니다', { status: 400 });

  let filled = 0;

  worksheet.eachRow((row, rowIdx) => {
    if (rowIdx < DATA_START_ROW) return;

    const oldMeter = cellStr(row, COL.OLD_METER_NO);
    const block    = cellStr(row, COL.BLOCK);
    const rowNo    = cellStr(row, COL.ROW_NO);

    if (!oldMeter && !block && !rowNo) return;

    let rec: MeterRecord | undefined;
    if (oldMeter) rec = byMeter.get(oldMeter);
    if (!rec && block && rowNo) rec = byPos.get(`${block}::${rowNo}`);
    if (!rec) return;

    filled++;

    function set(col: number, val: string | null | undefined) {
      if (!val) return;
      row.getCell(col).value = val;
    }

    if (rec.meter_number) set(COL.METER_NO,    rec.meter_number);
    set(COL.READING,      rec.reading);
    set(COL.SEALED,       rec.sealed);
    set(COL.METER_COND,   rec.meter_condition);
    set(COL.BOX_COND,     rec.cover_type);
    set(COL.LOCATION,     rec.location);
    set(COL.USAGE_TYPE,   rec.usage_type);
    set(COL.FLOOR,        rec.floor);
    set(COL.NOTE,         rec.note);
    set(COL.SURVEY_DATE,  rec.survey_date?.slice(0, 10) ?? null);
    set(COL.COVER_TYPE,   rec.cover_type);

    if (rec.water_supply_type === '물탱크') {
      set(COL.WATER_TANK,    '○');
    } else if (rec.water_supply_type === '저수조') {
      set(COL.WATER_CISTERN, '○');
    } else if (rec.water_supply_type) {
      set(COL.WATER_DIRECT,  '○'); // 직접 or 간접 모두 동그라미
    }

    row.commit();
  });

  const outputBuffer = await workbook.xlsx.writeBuffer();
  const safeName = encodeURIComponent(file.name.replace(/(\.[^.]+)$/, '_작성완료$1'));

  return new NextResponse(outputBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${safeName}`,
      'X-Filled-Count': String(filled),
    },
  });
}
