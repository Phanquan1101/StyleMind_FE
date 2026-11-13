import { RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import {
  BlockBoundary,
  DashboardSkeleton,
  KpiRow,
  PaymentMethods,
  PendingTasks,
  RecentOrders,
  RevenueChart,
  StatusDonut,
  TopProducts,
} from './DashboardBlocks'
import { formatTime, parseRange, RANGE_OPTIONS, type RangeDays } from './dashboardModel'
import { countOpenPaymentExceptions, useAdminDashboard } from './useAdminDashboard'

/** Admin "Tổng quan" (design A): header + range, KPIs, revenue chart + status donut, to-do + top products, payment methods + recent orders. */
export function AdminDashboard({ fetchExceptions = countOpenPaymentExceptions }: { fetchExceptions?: () => Promise<number> }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const days = parseRange(searchParams.get('range'))
  const { state, refresh } = useAdminDashboard(days)
  const [exceptions, setExceptions] = useState<number | null>(null)

  // Payment exceptions come from the payment service: fetched again with every fresh dashboard, keeping the last
  // known value meanwhile; a failure only leaves that one counter as it was ("—" if never known).
  const stamp = state.data?.generated_at
  useEffect(() => {
    let active = true
    Promise.resolve().then(fetchExceptions).then(count => { if (active) setExceptions(count) }).catch(() => undefined)
    return () => { active = false }
  }, [fetchExceptions, stamp])

  const chooseRange = (next: RangeDays) => {
    setSearchParams(current => {
      const params = new URLSearchParams(current)
      params.set('range', String(next))
      return params
    }, { replace: true })
  }

  const data = state.data
  const loading = state.status === 'loading'

  return <div className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] bg-[#F6F4F1] px-4 py-6 text-[#1C1B19] md:-mx-6 md:px-6 lg:-mx-8 lg:px-10 lg:py-9">
    <div className="flex flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="m-0 font-display text-[clamp(32px,4vw,44px)] font-medium leading-tight">Tổng quan quản trị</h1>
          <p className="mt-2 text-base text-[#6B665F]">Theo dõi doanh thu và hoạt động cửa hàng</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label="Khoảng thời gian" className="flex rounded-[10px] bg-[#EFECE7] p-1">
            {RANGE_OPTIONS.map(option => {
              const pressed = option.days === days
              return <button key={option.days} type="button" aria-pressed={pressed} onClick={() => chooseRange(option.days)}
                className={`cursor-pointer rounded-lg border-0 px-3.5 py-2.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B19] ${pressed ? 'bg-white font-semibold text-[#1C1B19] shadow-[0_1px_2px_rgba(0,0,0,0.08)]' : 'bg-transparent text-[#4A463F] hover:bg-[#E7E3DC]'}`}>{option.label}</button>
            })}
          </div>
          {data && <span className="text-[13px] text-[#6B665F]">Cập nhật lúc {formatTime(data.generated_at)}</span>}
          <button type="button" onClick={refresh} disabled={loading} aria-busy={loading}
            className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-[#D9D4CC] bg-white px-4 py-2.5 text-sm font-medium transition hover:bg-[#FAF8F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B19] disabled:cursor-wait disabled:opacity-70">
            <RefreshCw size={15} aria-hidden="true" className={loading ? 'animate-spin motion-reduce:animate-none' : ''} />Làm mới
          </button>
        </div>
      </header>

      {state.status === 'error' && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E7BBBB] bg-[#FCEAEA] px-4 py-3 text-sm text-[#A94B4B]">
        <span>{data ? 'Không cập nhật được số liệu mới — đang hiển thị dữ liệu lần trước. ' : 'Không tải được dữ liệu tổng quan. '}<span className="opacity-80">{state.message}</span></span>
        <button type="button" onClick={refresh} className="rounded-lg border border-[#A94B4B] bg-white px-3 py-1.5 font-semibold hover:bg-[#FCEAEA]">Thử lại</button>
      </div>}

      {!data ? (state.status === 'error' ? null : <DashboardSkeleton />) : <div className={`flex flex-col gap-4 transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
        <BlockBoundary title="Chỉ số chính"><KpiRow data={data} /></BlockBoundary>
        <div className="grid gap-4 xl:grid-cols-3">
          <BlockBoundary title="Doanh thu theo ngày"><RevenueChart data={data} /></BlockBoundary>
          <BlockBoundary title="Trạng thái đơn"><StatusDonut data={data} /></BlockBoundary>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <BlockBoundary title="Việc cần xử lý"><PendingTasks data={data} exceptions={exceptions} /></BlockBoundary>
          <BlockBoundary title="Top 5 sản phẩm bán chạy"><TopProducts data={data} /></BlockBoundary>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <BlockBoundary title="Theo phương thức thanh toán"><PaymentMethods data={data} /></BlockBoundary>
          <BlockBoundary title="Đơn gần đây"><RecentOrders data={data} /></BlockBoundary>
        </div>
      </div>}
    </div>
  </div>
}
