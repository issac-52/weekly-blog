'use client';

import { useState, useRef, useTransition } from 'react';
import * as XLSX from 'xlsx';
import { X, Download, Upload, RefreshCw } from 'lucide-react';
import { getMeterRecordsForExport, type MeterRecord } from '@/app/admin/meter/_actions';

// 0-based 컬럼 인덱스 — EXCEL_MAP의 __EMPTY_N = N번째 컬럼
const OLD_METER_COL = 7;  // old_meter_number (매칭 키)
const DATA_START_ROW = 3; // 헤더 3행(row 0~2) 스킵

// 고정 컬럼 인덱스(숫자로 특정 가능한 필드)
const FIXED_WRITE_COLS: { dbKey: keyof MeterRecord; colIdx: number }[] = [
  { dbKey: 'meter_number', colIdx: 8  },
  { dbKey: 'reading',      colIdx: 13 },
  { dbKey: 'sealed',       colIdx: 14 },
  { dbKey: 'location',     colIdx: 17 },
  { dbKey: 'usage_type',   colIdx: 23 },
  { dbKey: 'floor',        colIdx: 26 },
];

// 헤더 텍스트로 컬럼을 찾아야 하는 필드
const NAMED_WRITE_COLS: { dbKey: keyof MeterRecord; headerName: string }[] = [
  { dbKey: 'note',        headerName: '비고' },
  { dbKey: 'survey_date', headerName: '조사일자' },
  { dbKey: 'cover_type',  headerName: '보호통뚜껑양식' },
];

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
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];

        // 블록 목록 파악 (sheet_to_json 활용)
        const allParsed = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
          defval: null,
          raw: false,
        });
        const dataRows = allParsed.slice(2);
        const blocks = [...new Set(
          dataRows
            .map(r => r['블록\r\n구분'] as string | null)
            .filter((b): b is string => !!b && b.trim() !== '')
        )];

        if (blocks.length === 0) {
          setError('블록 정보를 찾을 수 없습니다. 엑셀 파일 형식을 확인하세요.');
          return;
        }

        startTransition(async () => {
          // DB에서 해당 블록 레코드 전체 조회
          const dbRecords = await getMeterRecordsForExport(blocks);
          const dbMap = new Map<string, MeterRecord>();
          for (const rec of dbRecords) {
            if (rec.old_meter_number) dbMap.set(rec.old_meter_number.trim(), rec);
          }

          // row 0에서 named 컬럼 인덱스 스캔
          const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
          const namedColMap: Record<string, number> = {};
          for (let c = range.s.c; c <= range.e.c; c++) {
            const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
            const val = cell ? String(cell.v ?? '').trim() : '';
            if (val) namedColMap[val] = c;
          }

          const writeCols = [
            ...FIXED_WRITE_COLS,
            ...NAMED_WRITE_COLS
              .map(({ dbKey, headerName }) => ({ dbKey, colIdx: namedColMap[headerName] ?? -1 }))
              .filter(({ colIdx }) => colIdx >= 0),
          ];

          let total = 0;
          let matched = 0;

          for (let rowIdx = DATA_START_ROW; rowIdx <= range.e.r; rowIdx++) {
            const oldMeterCell = ws[XLSX.utils.encode_cell({ r: rowIdx, c: OLD_METER_COL })];
            const oldMeterNum = oldMeterCell ? String(oldMeterCell.v ?? '').trim() : '';
            if (!oldMeterNum) continue;
            total++;

            const rec = dbMap.get(oldMeterNum);
            if (!rec) continue;
            matched++;

            for (const { dbKey, colIdx } of writeCols) {
              const val = rec[dbKey];
              if (val == null) continue;
              ws[XLSX.utils.encode_cell({ r: rowIdx, c: colIdx })] = { v: String(val), t: 's' };
            }
          }

          setStats({ total, matched });
          setConvertedWb(wb);
          setStep(2);
        });
      } catch {
        setError('파일을 읽는 중 오류가 발생했습니다.');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleDownload() {
    if (!convertedWb) return;
    const outBuf = XLSX.write(convertedWb, { type: 'array', bookType: 'xlsx' });
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
                <br />
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
