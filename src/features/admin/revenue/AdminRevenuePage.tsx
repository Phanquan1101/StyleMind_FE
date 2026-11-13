import { RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { BlockBoundary, SkeletonBlock } from '@/features/admin/dashboard/DashboardBlocks'
import { formatTime, shopDay } from '@/features/admin/dashboard/dashboardModel'
import { CategoryShares, FiltersBar, MethodShares, PeriodTable, RevenueBarChart, RevenueCards, TopTen } from './RevenueBlocks'
import { parseFilters, rangeLabel, resolveRange, type RangePreset } from './revenueModel'
import { downloadRevenueCsv, useAdminRevenue } from './useAdminRevenue'

function RevenueSkeleton() {
  return <div role="status" aria-label="Đang tải báo cáo doanh thu" className="grid gap-4">
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">{[0, 1, 2, 3].map(index => <SkeletonBlock key={index} className="h-[168px]" />)}</div>
    <SkeletonBlock className="h-[380px]" />
    <SkeletonBlock className="h-80" />
    <div className="grid gap-4 xl:grid-cols-2"><SkeletonBlock className="h-72" /><SkeletonBlock className="h-72" /></div>
    <SkeletonBlock className="h-80" />
  </div>
}

/** Admin "Doanh thu": revenue report in the style of the overview. All filters live in the URL. */
export function AdminRevenuePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlFilters = parseFilters(searchParams)
  // The two custom dates are edited locally and written to the URL together once they form a usable range; writing
  // each date separately would let a second quick change start from a stale copy of the URL and lose the first.
  const [draft, setDraft] = useState({ from: urlFilters.customFrom, to: urlFilters.customTo })
  const draftRef = useRef(draft)
  useEffect(() => {
    draftRef.current = { from: urlFilters.customFrom, to: urlFilters.customTo }
    setDraft(draftRef.current)
  }, [urlFilters.customFrom, urlFilters.customTo])
  const filters = { ...urlFilters, customFrom: draft.from, customTo: draft.to }
  const resolved = useMemo(() => resolveRange(filters), [filters.preset, filters.customFrom, filters.customTo])  // eslint-disable-line react-hooks/exhaustive-deps
  const query = resolved.ok ? { from: resolved.from, to: resolved.to, group: filters.group } : null
  const { state, refresh } = useAdminRevenue(query)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const update = (change: (params: URLSearchParams) => void) => setSearchParams(current => {
    const params = new URLSearchParams(current)
    change(params)
    return params
  }, { replace: true })

  const choosePreset = (preset: RangePreset) => update(params => {
    params.set('range', preset)
    if (preset === 'custom') {
      // Start the custom range from what is on screen so the inputs are never empty.
      if (resolved.ok) { params.set('from', resolved.from); params.set('to', resolved.to) }
    } else {
      params.delete('from')
      params.delete('to')
    }
  })

  const exportCsv = async () => {
    if (!query) return
    setExporting(true)
    setExportError(null)
    try {
      await downloadRevenueCsv(query)
    } catch (error) {
      setExportError(error instanceof Error && error.message ? `Không xuất được CSV: ${error.message}` : 'Không xuất được CSV. Vui lòng thử lại.')
    } finally {
      setExporting(false)
    }
  }

  const data = state.data
  const loading = query !== null && state.status === 'loading'
  const rangeError = resolved.ok ? null : resolved.message

  return <div className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] bg-[#F6F4F1] px-4 py-6 text-[#1C1B19] md:-mx-6 md:px-6 lg:-mx-8 lg:px-10 lg:py-9">
    <div className="flex flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="m-0 font-display text-[clamp(32px,4vw,44px)] font-medium leading-tight">Doanh thu</h1>
          <p className="mt-2 text-base text-[#6B665F]">
            Báo cáo tiền đã thu theo ngày nhận tiền{data && resolved.ok ? ` · ${rangeLabel(resolved.from, resolved.to)}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {data && <span className="text-[13px] text-[#6B665F]">Cập nhật lúc {formatTime(data.generated_at)}</span>}
          <button type="button" onClick={refresh} disabled={loading || !query} aria-busy={loading}
            className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-[#D9D4CC] bg-white px-4 py-2.5 text-sm font-medium transition hover:bg-[#FAF8F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B19] disabled:cursor-wait disabled:opacity-70">
            <RefreshCw size={15} aria-hidden="true" className={loading ? 'animate-spin motion-reduce:animate-none' : ''} />Làm mới
          </button>
        </div>
      </header>

      <FiltersBar filters={filters} today={shopDay()} error={rangeError}
        onPreset={choosePreset}
        onGroup={group => update(params => params.set('group', group))}
        onCustom={(key, value) => {
          const next = { ...draftRef.current, [key]: value }
          draftRef.current = next
          setDraft(next)
          if (resolveRange({ ...urlFilters, preset: 'custom', customFrom: next.from, customTo: next.to }).ok) {
            update(params => { params.set('range', 'custom'); params.set('from', next.from); params.set('to', next.to) })
          }
        }} />

      {state.status === 'error' && query && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E7BBBB] bg-[#FCEAEA] px-4 py-3 text-sm text-[#A94B4B]">
        <span>{data ? 'Không cập nhật được báo cáo — đang hiển thị dữ liệu lần trước. ' : 'Không tải được báo cáo doanh thu. '}<span className="opacity-80">{state.message}</span></span>
        <button type="button" onClick={refresh} className="rounded-lg border border-[#A94B4B] bg-white px-3 py-1.5 font-semibold hover:bg-[#FCEAEA]">Thử lại</button>
      </div>}

      {!data ? (state.status === 'error' || !query ? null : <RevenueSkeleton />) : <div className={`flex flex-col gap-4 transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
        <BlockBoundary title="Chỉ số doanh thu"><RevenueCards report={data} /></BlockBoundary>
        <BlockBoundary title="Thực thu theo kỳ"><RevenueBarChart report={data} /></BlockBoundary>
        <BlockBoundary title="Chi tiết theo kỳ"><PeriodTable report={data} onExport={() => void exportCsv()} exporting={exporting} exportError={exportError} /></BlockBoundary>
        <div className="grid gap-4 xl:grid-cols-2">
          <BlockBoundary title="Theo danh mục"><CategoryShares report={data} /></BlockBoundary>
          <BlockBoundary title="Theo phương thức thanh toán"><MethodShares report={data} /></BlockBoundary>
        </div>
        <BlockBoundary title="Top 10 sản phẩm"><TopTen report={data} /></BlockBoundary>
      </div>}
    </div>
  </div>
}
