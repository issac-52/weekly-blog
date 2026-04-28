'use client';

import { useState, useTransition, useRef } from 'react';
import { X, Check, Camera, Trash2, ImagePlus, ExternalLink } from 'lucide-react';
import { updateMeterRecord, type MeterRecord, type MeterInsert } from '@/app/admin/meter/_actions';

const STORAGE_BASE = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
const thumbnailUrl = (path: string) => `${STORAGE_BASE}/${path}`;
const viewUrl = (path: string) => `${STORAGE_BASE}/${path}`;

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
  '기타',
];

const COVER_OPTIONS = ['', '뚜껑 파손', '뚜껑 없음', '없음'];

const USAGE_TYPES = ['가정집', '상가', '주상복합', '빌라', '공공기관', '기타'];

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
  'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-base md:text-sm text-white focus:outline-none focus:border-emerald-400 transition-colors';
const selectCls =
  'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-base md:text-sm text-white focus:outline-none focus:border-emerald-400 transition-colors';

type ImageSlot = 1 | 2;

function ImageSlotCard({
  slot,
  fileId,
  rowNo,
  recordId,
  onUploaded,
  onDeleted,
}: {
  slot: ImageSlot;
  fileId: string | null;
  rowNo: string | null;
  recordId: number;
  onUploaded: (slot: ImageSlot, newFileId: string) => void;
  onDeleted: (slot: ImageSlot) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheBust, setCacheBust] = useState(() => Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!rowNo) {
      setError('도면번호가 없어 이미지를 업로드할 수 없습니다.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // 1단계: 서버에서 presigned URL 발급
      const params = new URLSearchParams({
        record_id: String(recordId),
        slot: String(slot),
        row_no: rowNo,
        content_type: file.type || 'image/jpeg',
      });
      const presignRes = await fetch(`/admin/api/upload-meter-image?${params}`);
      if (!presignRes.ok) {
        const j = await presignRes.json().catch(() => ({})) as { error?: string };
        throw new Error(j.error ?? '업로드 준비 실패');
      }
      const { presignedUrl, filePath } = await presignRes.json() as {
        presignedUrl: string;
        filePath: string;
      };

      // 2단계: 브라우저 → R2 직접 업로드 (크기 제한 없음)
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'image/jpeg' },
      });
      if (!uploadRes.ok) throw new Error('스토리지 업로드 실패');

      // 3단계: DB에 경로 저장
      const saveRes = await fetch('/admin/api/upload-meter-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record_id: recordId, slot, file_path: filePath }),
      });
      if (!saveRes.ok) {
        const j = await saveRes.json().catch(() => ({})) as { error?: string };
        throw new Error(j.error ?? '저장 실패');
      }

      setCacheBust(Date.now());
      onUploaded(slot, filePath);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleDelete() {
    if (!fileId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/admin/api/upload-meter-image', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record_id: recordId, slot, file_path: fileId }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? '삭제 실패');
      }
      onDeleted(slot);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-zinc-500">
        이미지 {slot}{' '}
        {rowNo && (
          <span className="text-zinc-600 font-mono">({rowNo}-{slot})</span>
        )}
      </span>

      {fileId ? (
        <div className="relative rounded-lg overflow-hidden border border-zinc-700 bg-zinc-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${thumbnailUrl(fileId)}?t=${cacheBust}`}
            alt={`이미지 ${slot}`}
            className="w-full h-28 object-cover"
          />
          <div className="absolute top-1.5 right-1.5 flex gap-1">
            <a
              href={viewUrl(fileId)}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-md transition-colors"
            >
              <ExternalLink size={12} />
            </a>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="p-1.5 bg-black/60 hover:bg-red-500/80 text-white rounded-md transition-colors disabled:opacity-50"
            >
              <Trash2 size={12} />
            </button>
          </div>
          {loading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-xs text-white">처리 중...</span>
            </div>
          )}
        </div>
      ) : (
        <label
          className={`flex flex-col items-center justify-center gap-1.5 h-28 rounded-lg border border-dashed border-zinc-700 bg-zinc-800/50 cursor-pointer hover:border-emerald-400/50 hover:bg-zinc-800 transition-colors ${loading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          {loading ? (
            <span className="text-xs text-zinc-400">업로드 중...</span>
          ) : (
            <>
              <ImagePlus size={18} className="text-zinc-500" />
              <span className="text-xs text-zinc-500">이미지 추가</span>
            </>
          )}
        </label>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default function MeterEditModal({ record, onClose }: Props) {
  const isSameInit =
    !!record.old_meter_number && record.meter_number === record.old_meter_number;

  const initUsageSelect = (val: string | null) => {
    if (!val) return '';
    if (USAGE_TYPES.slice(0, -1).includes(val)) return val;
    return '기타';
  };
  const initUsageCustom = (val: string | null) => {
    if (!val) return '';
    if (USAGE_TYPES.slice(0, -1).includes(val)) return '';
    return val;
  };
  const initLocationSelect = (val: string | null) => {
    if (!val) return '';
    if (LOCATION_OPTIONS.slice(0, -1).includes(val)) return val;
    return '기타';
  };
  const initLocationCustom = (val: string | null) => {
    if (!val) return '';
    if (LOCATION_OPTIONS.slice(0, -1).includes(val)) return '';
    return val;
  };

  const [meterSame, setMeterSame] = useState(isSameInit);
  const [isHopye, setIsHopye] = useState(record.note === '호폐');
  const [usageTypeSelect, setUsageTypeSelect] = useState(initUsageSelect(record.usage_type));
  const [usageTypeCustom, setUsageTypeCustom] = useState(initUsageCustom(record.usage_type));
  const [locationSelect, setLocationSelect] = useState(initLocationSelect(record.location));
  const [locationCustom, setLocationCustom] = useState(initLocationCustom(record.location));
  const [values, setValues] = useState<Partial<MeterInsert>>({
    meter_number: record.meter_number,
    reading: record.reading,
    sealed: record.sealed ?? '유',
    usage_type: record.usage_type,
    floor: record.floor,
    note: record.note,
    survey_date: nowString(),
    cover_type: record.cover_type ?? '',
  });
  const [image1Id, setImage1Id] = useState<string | null>(record.image1_id);
  const [image2Id, setImage2Id] = useState<string | null>(record.image2_id);
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
    set('meter_number', isSameInit ? null : record.meter_number);
  }

  function handleSave() {
    startTransition(async () => {
      const resolvedUsageType =
        usageTypeSelect === '기타' ? (usageTypeCustom || null) : (usageTypeSelect || null);
      const resolvedLocation =
        locationSelect === '기타' ? (locationCustom || null) : (locationSelect || null);
      const payload: Partial<MeterInsert> = {
        ...values,
        meter_number: meterSame ? record.old_meter_number : (values.meter_number || null),
        reading: values.reading || null,
        sealed: values.sealed || null,
        location: resolvedLocation,
        usage_type: resolvedUsageType,
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

  function handleImageUploaded(slot: ImageSlot, newFileId: string) {
    if (slot === 1) setImage1Id(newFileId);
    else setImage2Id(newFileId);
  }

  function handleImageDeleted(slot: ImageSlot) {
    if (slot === 1) setImage1Id(null);
    else setImage2Id(null);
  }

  const imageCount = [image1Id, image2Id].filter(Boolean).length;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-t-2xl md:rounded-xl w-full md:max-w-lg max-h-[92dvh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-zinc-800">
          <div>
            <p className="text-white font-semibold text-sm flex items-center gap-2">
              수정
              {imageCount > 0 && (
                <span className="flex items-center gap-1 text-xs font-normal text-emerald-400">
                  <Camera size={12} />
                  {imageCount}
                </span>
              )}
            </p>
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
        <div className="px-5 py-3 bg-zinc-950/50 border-b border-zinc-800">
          <p className="text-xs text-zinc-500 truncate">{record.address ?? '-'}</p>
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
            <label className="block text-sm font-bold text-white mb-2">기물번호</label>
            <p className="text-xs text-zinc-500 mb-2">
              기존: <span className="font-mono text-zinc-300 text-sm">{record.old_meter_number ?? '-'}</span>
            </p>
            <div className="flex gap-2 mb-2">
              <button
                onClick={selectO}
                className={`flex-1 py-2.5 rounded-lg text-base font-bold border transition-colors ${
                  meterSame
                    ? 'bg-emerald-400 border-emerald-400 text-zinc-950'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
                }`}
              >
                O — 기존과 동일
              </button>
              <button
                onClick={selectX}
                className={`flex-1 py-2.5 rounded-lg text-base font-bold border transition-colors ${
                  !meterSame
                    ? 'bg-zinc-200 border-zinc-200 text-zinc-950'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
                }`}
              >
                X — 직접 입력
              </button>
            </div>
            {meterSame ? (
              <div className="px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-xl font-bold text-emerald-400 font-mono tracking-wider">
                {record.old_meter_number ?? '-'}
              </div>
            ) : (
              <input
                type="text"
                placeholder="기물번호 입력"
                value={(values.meter_number as string) ?? ''}
                onChange={(e) => set('meter_number', e.target.value || null)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-xl font-bold text-white font-mono tracking-wider focus:outline-none focus:border-emerald-400 transition-colors"
              />
            )}
          </div>

          {/* 지침 + 봉인유무 */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelCls}>지침</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="숫자 입력"
                value={(values.reading as string) ?? ''}
                onChange={(e) => set('reading', e.target.value || null)}
                className={inputCls}
              />
            </div>
            <div className="shrink-0">
              <label className={labelCls}>봉인유무</label>
              <div className="flex gap-3 h-[42px] items-center">
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
          </div>

          {/* 위치 */}
          <div>
            <label className={labelCls}>위치</label>
            <select
              value={locationSelect}
              onChange={(e) => {
                setLocationSelect(e.target.value);
                if (e.target.value !== '기타') setLocationCustom('');
              }}
              className={selectCls}
            >
              {LOCATION_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o || '— 선택 —'}
                </option>
              ))}
            </select>
            {locationSelect === '기타' && (
              <input
                type="text"
                placeholder="직접 입력"
                value={locationCustom}
                onChange={(e) => setLocationCustom(e.target.value)}
                className={`${inputCls} mt-2`}
                autoFocus
              />
            )}
          </div>

          {/* 사용형태 */}
          <div>
            <label className={labelCls}>사용형태</label>
            <select
              value={usageTypeSelect}
              onChange={(e) => {
                setUsageTypeSelect(e.target.value);
                if (e.target.value !== '기타') setUsageTypeCustom('');
              }}
              className={selectCls}
            >
              <option value="">— 선택 —</option>
              {USAGE_TYPES.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            {usageTypeSelect === '기타' && (
              <input
                type="text"
                placeholder="직접 입력"
                value={usageTypeCustom}
                onChange={(e) => setUsageTypeCustom(e.target.value)}
                className={`${inputCls} mt-2`}
                autoFocus
              />
            )}
          </div>

          {/* 층수 */}
          <div>
            <label className={labelCls}>층수</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="예: 1, 2, B1"
              value={(values.floor as string) ?? ''}
              onChange={(e) => set('floor', e.target.value || null)}
              className={inputCls}
            />
          </div>

          {/* 비고 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-zinc-400">비고</label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isHopye}
                  onChange={(e) => {
                    setIsHopye(e.target.checked);
                    set('note', e.target.checked ? '호폐' : null);
                  }}
                  className="w-4 h-4 accent-amber-400"
                />
                <span className="text-sm font-semibold text-amber-400">호폐</span>
              </label>
            </div>
            <input
              type="text"
              value={(values.note as string) ?? ''}
              onChange={(e) => {
                set('note', e.target.value || null);
                setIsHopye(e.target.value === '호폐');
              }}
              disabled={isHopye}
              placeholder={isHopye ? '' : '비고 입력'}
              className={`${inputCls} ${isHopye ? 'opacity-50 cursor-not-allowed' : ''}`}
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

          {/* 이미지 */}
          <div>
            <label className={labelCls}>
              이미지
              <span className="ml-1.5 font-normal text-zinc-600">(최대 2장, 즉시 저장)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <ImageSlotCard
                slot={1}
                fileId={image1Id}
                rowNo={record.row_no}
                recordId={record.id}
                onUploaded={handleImageUploaded}
                onDeleted={handleImageDeleted}
              />
              <ImageSlotCard
                slot={2}
                fileId={image2Id}
                rowNo={record.row_no}
                recordId={record.id}
                onUploaded={handleImageUploaded}
                onDeleted={handleImageDeleted}
              />
            </div>
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
