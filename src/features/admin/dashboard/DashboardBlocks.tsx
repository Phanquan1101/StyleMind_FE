import { Component, useState, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { AdminDashboard } from '@/api/commerce.types'
import {
  axisTicks,
  buildKpis,
  buildMethodBars,
  buildStatusSlices,
  dayLabel,
  exceptionsText,
  formatAxis,
  formatVnd,
  formatVndShort,
  orderPill,
  periodLabel,
  PILL_STYLES,
  recentTimeLabel,
  revenueAxis,
  sparkPath,
  weekdayLabel,
  type Delta,
} from './dashboardModel'

const CARD = 'rounded-2xl border border-[#E8E4DE] bg-white p-6'
const CARD_TITLE = 'm-0 font-display text-2xl font-medium'
const MUTED = 'text-[#6B665F]'

export function BlockEmpty({ children }: { children: ReactNode }) {
  return <p role="status" className={`grid min-h-32 place-items-center rounded-xl bg-[#FAF8F5] px-4 py-8 text-center text-sm ${MUTED}`}>{children}</p>
}

/** One broken block must not take the whole dashboard down. */
export class BlockBoundary extends Component<{ title: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Dashboard block failed:', this.props.title, error, info.componentStack) }
  render() {
    if (!this.state.failed) return this.props.children
    return <section className={CARD}><h2 className={CARD_TITLE}>{this.props.title}</h2><p role="alert" className="mt-4 rounded-xl bg-[#F6E4E0] px-4 py-3 text-sm text-[#9A3324]">Không hiển thị được khối này. Bấm "Làm mới" để thử lại.</p></section>
  }
}

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-2xl bg-[#ECE8E2] ${className}`} />
}

export function DashboardSkeleton() {
  return <div role="status" aria-label="Đang tải tổng quan" className="grid gap-4">
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">{[0, 1, 2].map(index => <SkeletonBlock key={index} className="h-[168px]" />)}</div>
    <div className="grid gap-4 xl:grid-cols-3"><SkeletonBlock className="h-[372px] xl:col-span-2" /><SkeletonBlock className="h-[372px]" /></div>
    <div className="grid gap-4 xl:grid-cols-3"><SkeletonBlock className="h-72" /><SkeletonBlock className="h-72 xl:col-span-2" /></div>
    <div className="grid gap-4 xl:grid-cols-3"><SkeletonBlock className="h-64" /><SkeletonBlock className="h-64 xl:col-span-2" /></div>
  </div>
}

const DELTA_STYLES: Record<Delta['kind'], string> = {
  up: 'bg-[#E6EFE8] text-[#2F5A40]',
  down: 'bg-[#F6E4E0] text-[#9A3324]',
  new: 'bg-[#E6EFE8] text-[#2F5A40]',
  flat: 'bg-[#EFECE7] text-[#4A463F]',
  none: 'bg-[#EFECE7] text-[#6B665F]',
}

export function KpiRow({ data }: { data: AdminDashboard }) {
  const kpis = buildKpis(data)
  return <section aria-label="Chỉ số chính" className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
    {kpis.map(kpi => {
      const down = kpi.delta.kind === 'down'
      return <article key={kpi.id} className="flex flex-col gap-2.5 rounded-2xl border border-[#E8E4DE] bg-white px-[22px] pb-4 pt-[22px]">
        <div className={`text-sm ${MUTED}`}>{kpi.label}</div>
        <div className="font-display text-[34px] font-medium leading-tight tracking-[-0.5px]">{kpi.value}</div>
        <div className="flex items-center justify-between gap-2">
          <span className={`rounded-full px-2 py-[3px] text-[13px] font-semibold ${DELTA_STYLES[kpi.delta.kind]}`} aria-label={`Thay đổi ${kpi.delta.text}`}>{kpi.delta.text}</span>
          <svg width="96" height="28" viewBox="0 0 96 28" aria-hidden="true"><path d={sparkPath(kpi.spark)} fill="none" stroke={down ? '#9A3324' : '#3D6B4F'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <div className={`text-xs ${MUTED}`}>{periodLabel(data.days)}</div>
      </article>
    })}
  </section>
}

interface TooltipPayload { payload?: { date: string; revenue: number; orders: number } }

function RevenueTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  return <div className="rounded-[10px] bg-[#1C1B19] px-3 py-2.5 text-[13px] leading-normal text-white shadow-lg">
    <div className="text-[#CFCAC2]">{weekdayLabel(point.date)}</div>
    <div className="font-semibold">{formatVnd(point.revenue)} · {point.orders} đơn</div>
  </div>
}

export function RevenueChart({ data }: { data: AdminDashboard }) {
  const points = data.revenue_by_day.map(day => ({ date: day.date, revenue: day.revenue_vnd, orders: day.paid_order_count }))
  const empty = data.revenue_by_day.every(day => day.revenue_vnd === 0 && day.paid_order_count === 0)
  const ticks = axisTicks(data.revenue_by_day)
  const axis = revenueAxis(data.revenue_by_day)
  return <section className={`${CARD} flex min-w-0 flex-col gap-4 xl:col-span-2`}>
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className={CARD_TITLE}>Doanh thu theo ngày</h2>
      <span className={`text-[13px] ${MUTED}`}>Chỉ tính tiền đã thu · theo ngày nhận tiền</span>
    </div>
    {empty ? <BlockEmpty>Chưa có dữ liệu trong khoảng này</BlockEmpty> : <div role="img" aria-label={`Biểu đồ doanh thu ${data.days} ngày, tổng ${formatVnd(data.kpis.current.revenue_vnd)}`} className="min-h-[260px] w-full min-w-0 flex-1">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 760, height: 260 }}>
        <AreaChart data={points} margin={{ top: 8, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="#EFECE7" />
          <XAxis dataKey="date" ticks={ticks} tickFormatter={dayLabel} tickLine={false} axisLine={false} tick={{ fill: '#6B665F', fontSize: 12 }} interval={0} />
          <YAxis width={48} domain={axis.domain} ticks={axis.ticks} tickFormatter={formatAxis} tickLine={false} axisLine={false} tick={{ fill: '#6B665F', fontSize: 12 }} />
          <Tooltip content={<RevenueTooltip />} cursor={{ stroke: '#D9D4CC' }} />
          <Area type="linear" dataKey="revenue" baseValue={0} stroke="#3D6B4F" strokeWidth={2.5} strokeLinejoin="round" fill="#3D6B4F" fillOpacity={0.1} dot={false} activeDot={{ r: 5, fill: '#FFFFFF', stroke: '#3D6B4F', strokeWidth: 2.5 }} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>}
  </section>
}

const DONUT_RADIUS = 64
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS

export function StatusDonut({ data }: { data: AdminDashboard }) {
  const slices = buildStatusSlices(data)
  const total = slices.reduce((sum, slice) => sum + slice.count, 0)
  let offset = 0
  const arcs = slices.map(slice => {
    const length = (slice.count / total) * DONUT_CIRCUMFERENCE
    const arc = { slice, dash: `${length.toFixed(1)} ${(DONUT_CIRCUMFERENCE - length).toFixed(1)}`, offset: -offset }
    offset += length
    return arc
  })
  return <section className={`${CARD} flex flex-col gap-4`}>
    <h2 className={CARD_TITLE}>Trạng thái đơn</h2>
    {total === 0 ? <BlockEmpty>Chưa có dữ liệu trong khoảng này</BlockEmpty> : <>
      <div className="relative mx-auto grid h-[180px] w-[180px] place-items-center">
        <svg width="180" height="180" viewBox="0 0 180 180" role="img" aria-label={`Tỷ lệ trạng thái đơn, tổng ${total} đơn`}>
          {arcs.map(({ slice, dash, offset: dashOffset }) => <circle key={slice.key} cx="90" cy="90" r={DONUT_RADIUS} fill="none" stroke={slice.color} strokeWidth="22" strokeDasharray={dash} strokeDashoffset={dashOffset} transform="rotate(-90 90 90)" />)}
        </svg>
        <div className="pointer-events-none absolute text-center"><div className="font-display text-[32px] leading-none">{total.toLocaleString('vi-VN')}</div><div className={`text-xs ${MUTED}`}>đơn</div></div>
      </div>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {slices.map(slice => <li key={slice.key} className="flex items-center gap-2.5 text-sm"><span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: slice.color }} /><span className="grow">{slice.label}</span><span className="font-semibold">{slice.count}</span></li>)}
      </ul>
    </>}
  </section>
}

export function PendingTasks({ data, exceptions }: { data: AdminDashboard; exceptions: number | null }) {
  const tasks = [
    { id: 'confirm', count: String(data.pending.awaiting_confirmation_orders), label: 'Đơn chờ xác nhận', to: '/admin?section=orders&queue=confirmation', chip: 'bg-[#1C1B19] text-white' },
    { id: 'cancel', count: String(data.pending.pending_cancellation_requests), label: 'Yêu cầu hủy đơn', to: '/admin?section=requests', chip: 'bg-[#F6E4E0] text-[#9A3324]' },
    { id: 'exceptions', count: exceptionsText(exceptions), label: 'Ngoại lệ thanh toán', to: '/admin?section=payments', chip: 'bg-[#F4EBD9] text-[#7A5A1E]' },
    { id: 'stock', count: String(data.pending.low_stock_variants), label: 'Biến thể sắp hết hàng', to: '/admin?section=products', chip: 'bg-[#EFECE7] text-[#3A3732]' },
  ]
  return <section className={`${CARD} flex flex-col gap-1.5`}>
    <h2 className={`${CARD_TITLE} mb-2.5`}>Việc cần xử lý</h2>
    {tasks.map(task => <Link key={task.id} to={task.to} className="flex items-center gap-3.5 rounded-xl bg-[#FAF8F5] p-3 no-underline transition hover:bg-[#F3EFE9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B19]">
      <span className={`inline-flex h-10 min-w-10 items-center justify-center rounded-[10px] px-1 font-semibold ${task.chip}`}>{task.count}</span>
      <span className="grow text-[15px] text-[#1C1B19]">{task.label}</span>
      <span aria-hidden="true" className={MUTED}>→</span>
    </Link>)}
  </section>
}

export function Thumb({ url }: { url: string | null }) {
  const [broken, setBroken] = useState(false)
  if (!url || broken) return <span aria-hidden="true" className={`inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#EFECE7] text-xs ${MUTED}`}>Ảnh</span>
  return <img src={url} alt="" loading="lazy" onError={() => setBroken(true)} className="size-10 shrink-0 rounded-lg bg-[#EFECE7] object-cover" />
}

export function TopProducts({ data }: { data: AdminDashboard }) {
  return <section className={`${CARD} flex min-w-0 flex-col gap-3 xl:col-span-2`}>
    <h2 className={CARD_TITLE}>Top 5 sản phẩm bán chạy</h2>
    {data.top_products.length === 0 ? <BlockEmpty>Chưa có sản phẩm bán ra trong khoảng này</BlockEmpty> : <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead><tr className={`text-left text-xs tracking-[0.4px] ${MUTED}`}><th className="py-2 font-semibold">SẢN PHẨM</th><th className="py-2 text-right font-semibold">ĐÃ BÁN</th><th className="py-2 text-right font-semibold">DOANH THU</th></tr></thead>
        <tbody>{data.top_products.map(product => <tr key={product.product_id} className="border-t border-[#EFECE7]">
          <td className="py-3 pr-3"><div className="flex items-center gap-3"><Thumb url={product.image_url} /><span className="line-clamp-2">{product.name}</span></div></td>
          <td className="py-3 text-right tabular-nums">{product.quantity}</td>
          <td className="py-3 text-right font-semibold tabular-nums">{formatVndShort(product.revenue_vnd)}</td>
        </tr>)}</tbody>
      </table>
    </div>}
  </section>
}

export function PaymentMethods({ data }: { data: AdminDashboard }) {
  const bars = buildMethodBars(data)
  const empty = bars.every(bar => bar.value <= 0)
  return <section className={`${CARD} flex flex-col gap-4`}>
    <h2 className={CARD_TITLE}>Theo phương thức thanh toán</h2>
    {empty ? <BlockEmpty>Chưa có dữ liệu trong khoảng này</BlockEmpty> : bars.map(bar => <div key={bar.key} className="flex flex-col gap-1.5">
      <div className="flex justify-between text-sm"><span>{bar.label}</span><span className="font-semibold">{formatVndShort(bar.value)}</span></div>
      <div className="h-2.5 rounded-[5px] bg-[#EFECE7]" role="img" aria-label={`${bar.label}: ${Math.round(bar.percent)}%`}><div className="h-2.5 rounded-[5px]" style={{ width: `${bar.percent}%`, background: bar.color }} /></div>
    </div>)}
  </section>
}

export function RecentOrders({ data }: { data: AdminDashboard }) {
  return <section className={`${CARD} flex min-w-0 flex-col gap-2 xl:col-span-2`}>
    <div className="flex items-baseline justify-between"><h2 className={CARD_TITLE}>Đơn gần đây</h2><Link to="/admin?section=orders" className="text-sm text-[#1C1B19] hover:text-[#3D6B4F]">Xem tất cả →</Link></div>
    {data.recent_orders.length === 0 ? <BlockEmpty>Chưa có đơn hàng nào</BlockEmpty> : data.recent_orders.map(order => {
      const pill = orderPill(order)
      return <Link key={order.order_id} to={`/admin?section=orders&orderId=${order.order_id}`} className="flex flex-wrap items-center gap-3 border-t border-[#EFECE7] py-3 text-sm no-underline hover:bg-[#FAF8F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B19]">
        <span className="w-[120px] font-mono text-[#1C1B19]">{order.order_number}</span>
        <span className="min-w-0 grow truncate text-[#1C1B19]">{order.customer_name || 'Khách hàng'}</span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PILL_STYLES[pill.tone]}`}>{pill.label}</span>
        <span className="w-[110px] text-right font-semibold text-[#1C1B19] tabular-nums">{formatVnd(order.total_vnd)}</span>
        <span className={`w-[70px] text-right ${MUTED}`}>{recentTimeLabel(order.placed_at)}</span>
      </Link>
    })}
  </section>
}
