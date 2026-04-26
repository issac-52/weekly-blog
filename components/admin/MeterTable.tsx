'use client';

import { useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Pencil, Upload, ChevronLeft, ChevronRight, Search, X, Camera, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { type MeterRecord, type SortCol, type SortDir } from '@/app/admin/meter/_actions';
import MeterExcelUpload from './MeterExcelUpload';
import MeterEditModal from './MeterEditModal';

type Props = {
  records: MeterRecord[];
  blocks: string[];
  selectedBlock: string | null;
  search: string;
  total: number;
  page: number;
  pageSize: number;
  sortCol: SortCol;
  sortDir: SortDir;
};

function getPaginationRange(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '…', current - 1, current, current + 1, '…', total];
}

function Val({ value }: { value: string | null }) {
  if (!value) return <span className="text-zinc-600">-</span>;
  return <span className="text-zinc-300">{value}</span>;
}


export default function MeterTable({
  records,
  blocks,
  selectedBlock,
  search,
  total,
  page,
  pageSize,
  sortCol,
  sortDir,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [editingRecord, setEditingRecord] = useState<MeterRecord | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [searchInput, setSearchInput] = useState(search);
  const searchRef = useRef<HTMLInputElement>(null);

  const totalPages = Math.ceil(total / pageSize);
  const paginationRange = getPaginationRange(page, totalPages);

  function navigate(
    newPage: number,
    newBlock?: string | null,
    newSearch?: string,
    newSortCol?: SortCol,
    newSortDir?: SortDir,
  ) {
    const params = new URLSearchParams();
    const b = newBlock !== undefined ? newBlock : selectedBlock;
    const q = newSearch !== undefined ? newSearch : search;
    const sc = newSortCol !== undefined ? newSortCol : sortCol;
    const sd = newSortDir !== undefined ? newSortDir : sortDir;
    if (b) params.set('block', b);
    if (q) params.set('q', q);
    if (newPage > 1) params.set('page', String(newPage));
    if (sc !== 'row_no' || sd !== 'asc') {
      params.set('sort', sc);
      params.set('dir', sd);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function handleSort(col: SortCol) {
    const newDir: SortDir = sortCol === col && sortDir === 'asc' ? 'desc' : 'asc';
    navigate(1, undefined, undefined, col, newDir);
  }

  function SortIcon({ col }: { col: SortCol }) {
    if (sortCol !== col) return <ChevronsUpDown size={12} className="text-zinc-600" />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-emerald-400" />
      : <ChevronDown size={12} className="text-emerald-400" />;
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(1, undefined, searchInput.trim());
  }

  function clearSearch() {
    setSearchInput('');
    navigate(1, undefined, '');
  }

  const isEmpty = records.length === 0;

  return (
    <div>
      {/* 블록 필터 + 업로드 */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        <button
          onClick={() => navigate(1, null)}
          className={`px-2.5 py-1.5 text-xs rounded-lg font-mono transition-colors ${
            !selectedBlock
              ? 'bg-emerald-400 text-zinc-950 font-semibold'
              : 'bg-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          전체
        </button>
        {blocks.map((b) => (
          <button
            key={b}
            onClick={() => navigate(1, b)}
            className={`px-2.5 py-1.5 text-xs rounded-lg font-mono transition-colors ${
              selectedBlock === b
                ? 'bg-emerald-400 text-zinc-950 font-semibold'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {b}
          </button>
        ))}
        <button
          onClick={() => setShowUpload(true)}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-emerald-400 text-zinc-950 font-semibold text-sm rounded-lg hover:bg-emerald-300 transition-colors"
        >
          <Upload size={14} />
          <span className="hidden sm:inline">엑셀 업로드</span>
          <span className="sm:hidden">업로드</span>
        </button>
      </div>

      {/* 검색창 */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            placeholder="도면번호 · 도로명주소 · 기물번호(기존) 검색"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-8 pr-8 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-400 transition-colors"
          />
          {searchInput && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-sm rounded-lg transition-colors"
        >
          검색
        </button>
      </form>

      {search && (
        <p className="text-xs text-zinc-500 mb-3">
          <span className="text-emerald-400">"{search}"</span> 검색 결과 {total}개
        </p>
      )}

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 border border-zinc-800 rounded-lg">
          <p className="text-sm">데이터가 없습니다.</p>
          <p className="text-xs mt-1">엑셀 파일을 업로드하여 데이터를 가져오세요.</p>
        </div>
      ) : (
        <>
          {/* ─── 데스크톱 테이블 ─── */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-xs min-w-max">
              <thead>
                <tr className="bg-zinc-900 border-b border-zinc-800">
                  <th className="sticky left-0 z-10 bg-zinc-900 px-3 py-2.5 w-12" />
                  <th
                    className="px-3 py-2.5 text-left font-semibold text-zinc-500 whitespace-nowrap cursor-pointer hover:text-zinc-300 select-none"
                    onClick={() => handleSort('row_no')}
                  >
                    <span className="flex items-center gap-1">도면번호 <SortIcon col="row_no" /></span>
                  </th>
                  <th className="px-3 py-2.5 text-left font-semibold text-zinc-500 whitespace-nowrap">성명</th>
                  <th
                    className="px-3 py-2.5 text-left font-semibold text-zinc-500 whitespace-nowrap cursor-pointer hover:text-zinc-300 select-none"
                    onClick={() => handleSort('address')}
                  >
                    <span className="flex items-center gap-1">도로명주소 <SortIcon col="address" /></span>
                  </th>
                  <th className="px-3 py-2.5 text-left font-semibold text-zinc-500 whitespace-nowrap">기물번호(기존)</th>
                  <th className="w-px bg-zinc-700" />
                  <th className="px-3 py-2.5 text-left font-semibold text-zinc-300 whitespace-nowrap">기물번호</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-zinc-300 whitespace-nowrap">지침</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-zinc-300 whitespace-nowrap">봉인유무</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-zinc-300 whitespace-nowrap">위치</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-zinc-300 whitespace-nowrap">사용형태</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-zinc-300 whitespace-nowrap">층수</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-zinc-300 whitespace-nowrap">비고</th>
                  <th
                    className="px-3 py-2.5 text-left font-semibold text-zinc-300 whitespace-nowrap cursor-pointer hover:text-white select-none"
                    onClick={() => handleSort('survey_date')}
                  >
                    <span className="flex items-center gap-1">조사일자 <SortIcon col="survey_date" /></span>
                  </th>
                  <th className="px-3 py-2.5 text-left font-semibold text-zinc-300 whitespace-nowrap">보호통뚜껑양식</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-zinc-800 last:border-0 hover:bg-zinc-900/60 transition-colors"
                  >
                    {/* 수정 버튼 — sticky */}
                    <td className="sticky left-0 z-10 bg-zinc-950 group-hover:bg-zinc-900/60 px-2 py-2 border-r border-zinc-800">
                      <button
                        onClick={() => setEditingRecord(r)}
                        className="flex items-center gap-1 px-2 py-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors whitespace-nowrap"
                      >
                        <Pencil size={12} />
                        <span className="text-xs">수정</span>
                      </button>
                      {(r.image1_id || r.image2_id) && (
                        <div className="flex items-center gap-1 px-2 mt-0.5">
                          <Camera size={10} className="text-emerald-400" />
                          <span className="text-[10px] text-emerald-400">
                            {[r.image1_id, r.image2_id].filter(Boolean).length}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-zinc-500 font-mono">{r.row_no ?? '-'}</td>
                    <td className="px-3 py-2 text-zinc-500 whitespace-nowrap">{r.name ?? '-'}</td>
                    <td className="px-3 py-2 text-zinc-500 whitespace-nowrap max-w-[180px] truncate">{r.address ?? '-'}</td>
                    <td className="px-3 py-2 text-zinc-500 font-mono whitespace-nowrap">{r.old_meter_number ?? '-'}</td>
                    <td className="w-px bg-zinc-800" />
                    <td className="px-3 py-2 font-mono whitespace-nowrap"><Val value={r.meter_number} /></td>
                    <td className="px-3 py-2"><Val value={r.reading} /></td>
                    <td className="px-3 py-2"><Val value={r.sealed} /></td>
                    <td className="px-3 py-2 whitespace-nowrap"><Val value={r.location} /></td>
                    <td className="px-3 py-2 whitespace-nowrap"><Val value={r.usage_type} /></td>
                    <td className="px-3 py-2"><Val value={r.floor} /></td>
                    <td className="px-3 py-2 whitespace-nowrap"><Val value={r.note} /></td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap"><Val value={r.survey_date} /></td>
                    <td className="px-3 py-2 whitespace-nowrap"><Val value={r.cover_type} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ─── 모바일 정렬 바 ─── */}
          <div className="md:hidden flex items-center gap-1.5 mb-3 text-xs">
            <span className="text-zinc-600 shrink-0">정렬:</span>
            {([
              { col: 'row_no' as SortCol, label: '도면번호' },
              { col: 'address' as SortCol, label: '도로명주소' },
              { col: 'survey_date' as SortCol, label: '조사일자' },
            ]).map(({ col, label }) => (
              <button
                key={col}
                onClick={() => handleSort(col)}
                className={`flex items-center gap-0.5 px-2.5 py-1 rounded-lg transition-colors ${
                  sortCol === col
                    ? 'bg-emerald-400/20 text-emerald-400 font-semibold'
                    : 'bg-zinc-800 text-zinc-500'
                }`}
              >
                {label}
                {sortCol === col && (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
              </button>
            ))}
          </div>

          {/* ─── 모바일 카드 ─── */}
          <div className="md:hidden space-y-2">
            {records.map((r) => {
              const hasSurvey = !!(r.meter_number || r.reading || r.sealed || r.survey_date);
              return (
                <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                  {/* 카드 상단 정보 */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      {r.row_no && (
                        <span className="text-zinc-600 text-xs font-mono">도면{r.row_no}</span>
                      )}
                      <span className="text-white text-sm font-semibold truncate">
                        {r.name ?? '-'}
                      </span>
                      {(r.image1_id || r.image2_id) && (
                        <span className="ml-auto flex items-center gap-1 text-emerald-400 shrink-0">
                          <Camera size={12} />
                          <span className="text-xs">{[r.image1_id, r.image2_id].filter(Boolean).length}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-500 text-xs truncate mb-1">{r.address ?? '-'}</p>
                    <p className="text-zinc-500 text-xs font-mono">
                      기물번호(기존): {r.old_meter_number ?? '-'}
                    </p>

                    {/* 입력된 데이터 */}
                    {hasSurvey && (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-zinc-800">
                        {[
                          { label: '기물번호', value: r.meter_number },
                          { label: '지침', value: r.reading },
                          { label: '봉인유무', value: r.sealed },
                          { label: '위치', value: r.location },
                          { label: '사용형태', value: r.usage_type },
                          { label: '층수', value: r.floor },
                          { label: '비고', value: r.note },
                          { label: '보호통뚜껑양식', value: r.cover_type },
                        ].map(({ label, value }) =>
                          value ? (
                            <div key={label}>
                              <p className="text-zinc-600 text-xs">{label}</p>
                              <p className="text-zinc-300 text-xs font-medium">{value}</p>
                            </div>
                          ) : null
                        )}
                        {r.survey_date && (
                          <div className="col-span-2">
                            <p className="text-zinc-600 text-xs">조사일자</p>
                            <p className="text-zinc-400 text-xs font-mono">{r.survey_date}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 수정 버튼 — 카드 하단 풀너비 */}
                  <button
                    onClick={() => setEditingRecord(r)}
                    className="w-full flex items-center justify-center gap-2 py-3 border-t border-zinc-800 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    <Pencil size={14} />
                    수정
                  </button>
                </div>
              );
            })}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-zinc-500 text-xs">
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} / {total}개
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigate(page - 1)}
                  disabled={page <= 1}
                  className="p-1.5 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="md:hidden px-3 py-1.5 text-xs text-zinc-400">
                  {page} / {totalPages}
                </span>
                <div className="hidden md:flex items-center gap-1">
                  {paginationRange.map((p, i) =>
                    p === '…' ? (
                      <span key={`ell-${i}`} className="px-2 text-zinc-600 text-xs">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => navigate(p as number)}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                          p === page
                            ? 'bg-emerald-400 text-zinc-950 font-semibold'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                </div>
                <button
                  onClick={() => navigate(page + 1)}
                  disabled={page >= totalPages}
                  className="p-1.5 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg disabled:opacity-30 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {editingRecord && (
        <MeterEditModal record={editingRecord} onClose={() => setEditingRecord(null)} />
      )}
      {showUpload && <MeterExcelUpload onClose={() => setShowUpload(false)} />}
    </div>
  );
}
