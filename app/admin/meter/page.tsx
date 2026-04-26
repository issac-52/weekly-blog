import { getMeterRecords, getBlockList, type SortCol, type SortDir } from './_actions';
import MeterTable from '@/components/admin/MeterTable';

export const metadata = { title: '야장관리' };

const PAGE_SIZE = 20;
const VALID_SORT_COLS: SortCol[] = ['row_no', 'address', 'survey_date'];
const VALID_SORT_DIRS: SortDir[] = ['asc', 'desc'];

export default async function MeterPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; block?: string; q?: string; sort?: string; dir?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10));
  const block = params.block;
  const search = params.q?.trim() || undefined;
  const sortCol = (VALID_SORT_COLS.includes(params.sort as SortCol) ? params.sort : 'row_no') as SortCol;
  const sortDir = (VALID_SORT_DIRS.includes(params.dir as SortDir) ? params.dir : 'asc') as SortDir;

  const [{ data, count }, blocks] = await Promise.all([
    getMeterRecords(page, PAGE_SIZE, block, search, sortCol, sortDir),
    getBlockList(),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">야장관리</h1>
          <p className="text-sm text-zinc-500 mt-1">총 {count}개</p>
        </div>
      </div>
      <MeterTable
        records={data}
        blocks={blocks}
        selectedBlock={block ?? null}
        search={search ?? ''}
        total={count}
        page={page}
        pageSize={PAGE_SIZE}
        sortCol={sortCol}
        sortDir={sortDir}
      />
    </div>
  );
}
