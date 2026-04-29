'use client';

import { useState, useRef, useTransition } from 'react';
import * as XLSX from 'xlsx';
import { X, Download, Upload, RefreshCw } from 'lucide-react';
import { getMeterRecordsForExport, type MeterRecord } from '@/app/admin/meter/_actions';

// DB 필드 → 엑셀 key 매핑 (MeterExcelUpload의 EXCEL_MAP 역방향)
// key는 sheet_to_json이 생성하는 것과 동일한 규칙: 빈 헤더셀 = __EMPTY, __EMPTY_1, __EMPTY_2 ...
const DB_WRITE_MAP: { dbKey: keyof MeterRecord; excelKey: string }[] = [
  { dbKey: 'meter_number', excelKey: '__EMPTY_8'  },
  { dbKey: 'reading',      excelKey: '__EMPTY_13' },
  { dbKey: 'sealed',       excelKey: '__EMPTY_14' },
  { dbKey: 'location',     excelKey: '__EMPTY_17' },
  { dbKey: 'usage_type',   excelKey: '__EMPTY_23' },
  { dbKey: 'floor',        excelKey: '__EMPTY_26' },
  { dbKey: 'note',         excelKey: '비고'        },
  { dbKey: 'survey_date',  excelKey: '조사일자'    },
  { dbKey: 'cover_type',   excelKey: '보호통뚜껑양식' },
];

const OLD_METER_EXCEL_KEY = '__EMPTY_7'; // 기물번호(기존) — 매칭 키
const DATA_START = 3; // sheet_to_json default 모드: row 0 = header, 1~2 = sub-header → data from row 3

/**
 * 헤더 행(row 0)을 raw 스캔하여 "엑셀 key → 실제 컬럼 인덱스" 맵 생성.
 * sheet_to_json의 내부 규칙과 동일:
 *   - 값이 있는 셀 → 그 값을 key로
 *   - 빈 셀 → __EMPTY (첫 번째), __EMPTY_1, __EMPTY_2, ... 순으로 부여
 */
function buildColMap(ws: XLSX.WorkSheet): Record<string, number> {
  const raw = XLSX.utils.sheet_to_json<(string | null)[]>(ws, {
    header: 1,
    defval: null,
    raw: false,
  });
  const headerArr = (raw[0] ?? []) as (string | null)[];
  const map: Record<string, number> = {};
  let emptyCount = 0;

  for (let c = 0; c < headerArr.length; c++) {
    const trimmed = headerArr[c] ? String(headerArr[c]).trim() : '';
    if (trimmed) {
      map[trimmed] = c;
    } else {
      const key = emptyCount === 0 ? '__EMPTY' : `__EMPTY_${emptyCount}`;
      map[key] = c;
      emptyCount++;
    }
  }
  return map;
}

type Stats = { total: number; matched: number };
type Props = { onClose: () => void };

export default function MeterExcelConvert({ onClose }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [convertedWb, setConvertedWb] = useState<XLSX.WorkBook | null>(null);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buf = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(buf, { type: 'array', cellStyles: true, cellNF: true, cellFormula: true });
        const ws = wb.Sheets[wb.SheetNames[0]];

        // 헤더 스캔 → 실제 컬럼 인덱스 맵
        const colMap = buildColMap(ws);

        // old_meter_number 컬럼 검증
        const oldMeterColIdx = colMap[OLD_METER_EXCEL_KEY] ?? -1;
        if (oldMeterColIdx < 0) {
          setError(`기물번호(기존) 컬럼(${OLD_METER_EXCEL_KEY})을 찾을 수 없습니다. 엑셀 형식을 확인하세요.`);
          return;
        }

        // write 컬럼 목록 (colMap 기반으로 실제 인덱스 결정)
        const writeCols = DB_WRITE_MAP
          .map(({ dbKey, excelKey }) => ({ dbKey, colIdx: colMap[excelKey] ?? -1 }))
          .filter(({ colIdx }) => colIdx >= 0);

        // raw rows로 블록 + 데이터 읽기
        const rawRows = XLSX.utils.sheet_to_json<(string | null)[]>(ws, {
          header: 1,
          defval: null,
          raw: false,
        });

        // 블록 컬럼 — 헤더에 '\r\n' 포함되어 있을 수 있어서 공백 제거 후 비교
        const blockColIdx = Object.entries(colMap).find(
          ([k]) => k.replace(/\s/g, '') === '블록구분'
        )?.[1] ?? -1;

        const dataRawRows = rawRows.slice(DATA_START) as (string | null)[][];

        const blocks = [...new Set(
          dataRawRows
            .map(row => blockColIdx >= 0 ? String(row[blockColIdx] ?? '').trim() : '')
            .filter(b => !!b)
        )];

        if (blocks.length === 0) {
          setError('블록 정보를 찾을 수 없습니다. 엑셀 파일 형식을 확인하세요.');
          return;
        }

        startTransition(async () => {
          const dbRecords = await getMeterRecordsForExport(blocks);
          const dbMap = new Map<string, MeterRecord>();
          for (const rec of dbRecords) {
            if (rec.old_meter_number) dbMap.set(rec.old_meter_number.trim(), rec);
          }

          let total = 0;
          let matched = 0;

          for (let i = 0; i < dataRawRows.length; i++) {
            const row = dataRawRows[i];
            const oldMeterNum = String(row[oldMeterColIdx] ?? '').trim();
            if (!oldMeterNum) continue;
            total++;

            const rec = dbMap.get(oldMeterNum);
            if (!rec) continue;
            matched++;

            const wsRowIdx = i + DATA_START;
            for (const { dbKey, colIdx } of writeCols) {
              const val = rec[dbKey];
              if (val == null) continue;
              const addr = XLSX.utils.encode_cell({ r: wsRowIdx, c: colIdx });
              const existing = ws[addr] ?? {};
              ws[addr] = { ...existing, v: String(val), t: 's', f: undefined };
            }
          }

          setStats({ total, matched });
          setConvertedWb(wb);
          setStep(2);
        });
      } catch (err) {
        console.error('[MeterExcelConvert]', err);
        setError('파일을 읽는 중 오류가 발생했습니다.');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleDownload() {
    if (!convertedWb) return;
    const outBuf = XLSX.write(convertedWb, { type: 'array', bookType: 'xlsx', cellStyles: true });
    const blob = new Blob([outBuf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.replace(/\.[^.]+$/, '')}_최신화.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div>
            <h2 className="text-white font-semibold">엑셀 컨버팅</h2>
            <p className="text-zinc-500 text-xs mt-0.5">DB 데이터 → 엑셀 최신화 후 다운로드</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
          {error && (
            <div className="mb-4 px-3 py-2 bg-red-400/10 border border-red-400/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {step === 1 && (
            <>
              <p className="text-zinc-400 text-sm mb-4">
                원본 엑셀 파일을 업로드하면, DB에 저장된 조사 데이터로 채워진 파일을 반환합니다.
                <span className="text-zinc-600 text-xs mt-1 block">기물번호(기존)으로 매칭 · DB에 값이 있는 항목만 덮어씀</span>
              </p>
              <div
                className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-14 transition-colors ${
                  isPending
                    ? 'border-zinc-700 cursor-not-allowed'
                    : 'border-zinc-700 hover:border-emerald-400/50 cursor-pointer'
                }`}
                onClick={() => !isPending && fileRef.current?.click()}
              >
                {isPending ? (
                  <>
                    <RefreshCw size={32} className="text-emerald-400 animate-spin mb-3" />
                    <p className="text-zinc-400 text-sm">DB 데이터 조회 및 병합 중...</p>
                  </>
                ) : (
                  <>
                    <Upload size={32} className="text-zinc-600 mb-3" />
                    <p className="text-white font-medium">클릭하여 엑셀 파일 선택</p>
                    <p className="text-zinc-500 text-sm mt-1">.xlsx, .xls 지원</p>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFile}
                  className="hidden"
                  disabled={isPending}
                />
              </div>
            </>
          )}

          {step === 2 && stats && (
            <div>
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-zinc-800 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                  <p className="text-zinc-500 text-xs mt-1">엑셀 전체</p>
                </div>
                <div className="bg-emerald-950/40 border border-emerald-900/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{stats.matched}</p>
                  <p className="text-zinc-500 text-xs mt-1">DB 매칭</p>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-zinc-400">{stats.total - stats.matched}</p>
                  <p className="text-zinc-500 text-xs mt-1">미매칭</p>
                </div>
              </div>

              <p className="text-zinc-500 text-xs text-center mb-5">
                매칭된{' '}
                <span className="text-emerald-400 font-semibold">{stats.matched}개</span> 레코드의
                조사 데이터가 채워졌습니다.
              </p>

              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-400 text-zinc-950 font-semibold rounded-lg hover:bg-emerald-300 transition-colors"
              >
                <Download size={16} />
                최신화된 엑셀 다운로드
              </button>
            </div>
          )}
        </div>

        {step === 2 && (
          <div className="px-5 pb-5 flex justify-end">
            <button
              onClick={() => { setStep(1); setConvertedWb(null); setStats(null); setFileName(''); }}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              다른 파일 변환
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
