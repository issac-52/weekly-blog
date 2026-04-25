'use client';

import { useState, useTransition } from 'react';
import { X, Check } from 'lucide-react';
import { updateMeterRecord, type MeterRecord, type MeterInsert } from '@/app/admin/meter/_actions';

const LOCATION_OPTIONS = [
  '',
  '건물 앞(내부)',
  '건물 앞(외부)',
  '건물 좌(내부)',
  '건물 좌(외부)',
  '건물 우(내부)',
  '건물 우(외부)',
  '건물 뒤(내부)',
  '건물 뒤(외부)',
];

const COVER_OPTIONS = ['', '뚜껑 파손', '뚜껑 없음', '없음'];

function nowString() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

type Props = {
  record: MeterRecord;
  onClose: () => void;
};

const labelCls = 'block text-xs font-semibold text-zinc-400 mb-1.5';
const inputCls =
  'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400 transition-colors';
const selectCls =
  'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400 transition-colors';

export default function MeterEditModal({ record, onClose }: Props) {
  const isSameInit =
    !!record.old_meter_number && record.meter_number === record.old_meter_number;

  const [meterSame, setMeterSame] = useState(isSameInit);
  const [values, setValues] = useState<Partial<MeterInsert>>({
    meter_number: record.meter_number,
    reading: record.reading,
    sealed: record.sealed ?? '유',
    location: record.location ?? '',
    usage_type: record.usage_type,
    floor: record.floor,
    note: record.note,
    survey_date: nowString(),
    cover_type: record.cover_type ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function set<K extends keyof MeterInsert>(key: K, val: MeterInsert[K]) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  function selectO() {
    setMeterSame(true);
    set('meter_number', record.old_meter_number);
  }

  function selectX() {
    setMeterSame(false);
    // 기존과 달랐던 값 유지, 없으면 빈값
    set('meter_number', isSameInit ? null : record.meter_number);
  }

  function handleSave() {
    startTransition(async () => {
      const payload: Partial<MeterInsert> = {
        ...values,
        meter_number: meterSame ? record.old_meter_number : (values.meter_number || null),
        reading: values.reading || null,
        sealed: values.sealed || null,
        location: values.location || null,
        usage_type: values.usage_type || null,
        floor: values.floor || null,
        note: values.note || null,
        cover_type: values.cover_type || null,
      };
      const result = await updateMeterRecord(record.id, payload);
      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-t-2xl md:rounded-xl w-full md:max-w-lg max-h-[92dvh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-zinc-800">
          <div>
            <p className="text-white font-semibold text-sm">수정</p>
            <p className="text-zinc-500 text-xs mt-0.5">
              {record.row_no && <span className="mr-2">도면번호 {record.row_no}</span>}
              {record.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* 식별 정보 */}
        <div className="px-5 py-3 bg-zinc-950/50 border-b border-zinc-800 space-y-0.5">
          <p className="text-xs text-zinc-500 truncate">{record.address ?? '-'}</p>
          <p className="text-xs text-zinc-500">
            기물번호(기존):{' '}
            <span className="text-zinc-300 font-mono">{record.old_meter_number ?? '-'}</span>
          </p>
        </div>

        {/* 폼 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && (
            <div className="px-3 py-2 bg-red-400/10 border border-red-400/20 rounded-lg text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* 기물번호 */}
          <div>
            <label className={labelCls}>기물번호</label>
            <div className="flex gap-2 mb-2">
              <button
                onClick={selectO}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  meterSame
                    ? 'bg-emerald-400 border-emerald-400 text-zinc-950'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
                }`}
              >
                O — 기존과 동일
              </button>
              <button
                onClick={selectX}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  !meterSame
                    ? 'bg-zinc-200 border-zinc-200 text-zinc-950'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
                }`}
              >
                X — 직접 입력
              </button>
            </div>
            {meterSame ? (
              <div className="px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-zinc-400 font-mono">
                {record.old_meter_number ?? '-'}
              </div>
            ) : (
              <input
                type="text"
                placeholder="기물번호 입력"
                value={(values.meter_number as string) ?? ''}
                onChange={(e) => set('meter_number', e.target.value || null)}
                className={inputCls}
              />
            )}
          </div>

          {/* 지침 */}
          <div>
            <label className={labelCls}>지침</label>
            <input
              type="number"
              placeholder="숫자 입력"
              value={(values.reading as string) ?? ''}
              onChange={(e) => set('reading', e.target.value || null)}
              className={inputCls}
            />
          </div>

          {/* 봉인유무 */}
          <div>
            <label className={labelCls}>봉인유무</label>
            <div className="flex gap-4">
              {['유', '무'].map((v) => (
                <label key={v} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`sealed-${record.id}`}
                    value={v}
                    checked={values.sealed === v}
                    onChange={() => set('sealed', v)}
                    className="w-4 h-4 accent-emerald-400"
                  />
                  <span className="text-sm text-zinc-300">{v}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 위치 */}
          <div>
            <label className={labelCls}>위치</label>
            <select
              value={(values.location as string) ?? ''}
              onChange={(e) => set('location', e.target.value || null)}
              className={selectCls}
            >
              {LOCATION_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o || '— 선택 —'}
                </option>
              ))}
            </select>
          </div>

          {/* 사용형태 */}
          <div>
            <label className={labelCls}>사용형태</label>
            <input
              type="text"
              placeholder="예: 가정집, 상가"
              value={(values.usage_type as string) ?? ''}
              onChange={(e) => set('usage_type', e.target.value || null)}
              className={inputCls}
            />
          </div>

          {/* 층수 */}
          <div>
            <label className={labelCls}>층수</label>
            <input
              type="text"
              placeholder="예: 1, 2, B1"
              value={(values.floor as string) ?? ''}
              onChange={(e) => set('floor', e.target.value || null)}
              className={inputCls}
            />
          </div>

          {/* 비고 */}
          <div>
            <label className={labelCls}>비고</label>
            <input
              type="text"
              value={(values.note as string) ?? ''}
              onChange={(e) => set('note', e.target.value || null)}
              className={inputCls}
            />
          </div>

          {/* 조사일자 */}
          <div>
            <label className={labelCls}>
              조사일자
              <span className="ml-1.5 font-normal text-zinc-600">(입력 시각 자동 기록)</span>
            </label>
            <input
              type="text"
              value={(values.survey_date as string) ?? ''}
              onChange={(e) => set('survey_date', e.target.value || null)}
              className={`${inputCls} font-mono`}
            />
          </div>

          {/* 보호통뚜껑양식 */}
          <div>
            <label className={labelCls}>보호통뚜껑양식</label>
            <select
              value={(values.cover_type as string) ?? ''}
              onChange={(e) => set('cover_type', e.target.value || null)}
              className={selectCls}
            >
              {COVER_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o || '— 선택 —'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-5 py-4 border-t border-zinc-800 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-emerald-400 text-zinc-950 hover:bg-emerald-300 rounded-lg disabled:opacity-50 transition-colors"
          >
            <Check size={15} />
            {isPending ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
