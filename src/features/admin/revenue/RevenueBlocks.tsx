import { Download } from 'lucide-react'
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { AdminRevenueMetrics, AdminRevenueReport } from '@/api/commerce.types'
import { BlockEmpty, Thumb } from '@/features/admin/dashboard/DashboardBlocks'
import {
  computeDelta,
  formatAxis,
  formatVnd,
  formatVndShort,
  moneyAxis,
  sparkPath,
  type Delta,
} from '@/features/admin/dashboard/dashboardModel'
import {
  buildChartPoints,
  evenlySpaced,
  GROUPS,
  isEmptyReport,
  methodLabel,
  percentText,
  periodLabel,
  PRESETS,
  rangeLabel,
  withShares,
  type ChartPoint,
  type RangePreset,
  type RevenueFilters,
  type ShareRow,
} from './revenueModel'
import type { AdminRevenueGroup } from '@/api/commerce.types'

const CARD = 'rounded-2xl border border-[#E8E4DE] bg-white p-6'
const CARD_TITLE = 'm-0 font-display text-2xl font-medium'
const MUTED = 'text-[#6B665F]'
const SEGMENT = 'cursor-pointer rounded-lg border-0 px-3.5 py-2.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B19]'
const SEGMENT_ON = 'bg-white font-semibold text-[#1C1B19] shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
const SEGMENT_OFF = 'bg-transparent text-[#4A463F] hover:bg-[#E7E3DC]'

interface FiltersBarProps {
  filters: RevenueFilters
  today: string
  error: string | null
  onPreset: (preset: RangePreset) => void
  onGroup: (group: AdminRevenueGroup) => void
  onCustom: (key: 'from' | 'to', value: string) => void
}

/** Range presets + custom from/to + grouping; everything is reported to the parent, which keeps it in the URL. */
export function FiltersBar({ filters, today, error, onPreset, onGroup, onCustom }: FiltersBarProps) {
  return <div className="flex flex-col gap-3">
    <div className="flex flex-wrap items-center gap-3">
      <div role="group" aria-label="Khoảng thời gian" className="flex flex-wrap rounded-[10px] bg-[#EFECE7] p-1">
        {PRESETS.map(item => <button key={item.value} type="button" aria-pressed={filters.preset === item.value} onClick={() => onPreset(item.value)} className={`${SEGMENT} ${filters.preset === item.value ? SEGMENT_ON : SEGMENT_OFF}`}>{item.label}</button>)}
      </div>
      <div role="group" aria-label="Nhóm theo" className="flex rounded-[10px] bg-[#EFECE7] p-1">
        {GROUPS.map(item => <button key={item.value} type="button" aria-pressed={filters.group === item.value} onClick={() => onGroup(item.value)} className={`${SEGMENT} ${filters.group === item.value ? SEGMENT_ON : SEGMENT_OFF}`}>{item.label}</button>)}
      </div>
    </div>
    {filters.preset === 'custom' && <div className="flex flex-wrap items-end gap-3">
      <label className="grid gap-1 text-sm text-[#4A463F]">Từ ngày
        <input type="date" value={filters.customFrom} max={today} onChange={event => onCustom('from', event.target.value)} aria-invalid={error ? true : undefined}
          className="min-h-10 rounded-[10px] border border-[#D9D4CC] bg-white px-3 text-sm text-[#1C1B19]" />
      </label>
      <label className="grid gap-1 text-sm text-[#4A463F]">Đến ngày
        <input type="date" value={filters.customTo} max={today} onChange={event => onCustom('to', event.target.value)} aria-invalid={error ? true : undefined}
          className="min-h-10 rounded-[10px] border border-[#D9D4CC] bg-white px-3 text-sm text-[#1C1B19]" />
      </label>
      {error && <p role="alert" className="m-0 pb-2 text-sm text-[#9A3324]">{error}</p>}
    </div>}
  </div>
}

const DELTA_STYLES: Record<Delta['kind'], string> = {
  up: 'bg-[#E6EFE8] text-[#2F5A40]',
  down: 'bg-[#F6E4E0] text-[#9A3324]',
  new: 'bg-[#E6EFE8] text-[#2F5A40]',
  flat: 'bg-[#EFECE7] text-[#4A463F]',
  none: 'bg-[#EFECE7] text-[#6B665F]',
}
/** More refunds is bad news: flip the colours (the arrow keeps pointing the way the number moved). */
const INVERTED_STYLES: Record<Delta['kind'], string> = { ...DELTA_STYLES, up: DELTA_STYLES.down, down: DELTA_STYLES.up, new: DELTA_STYLES.down }

interface CardSpec {
  id: string
  label: string
  current: number
  previous: number
  format: (value: number) => string
  spark: number[]
  inverse?: boolean
}

export function RevenueCards({ report }: { report: AdminRevenueReport }) {
  const { current, previous } = report.totals
  const series = (pick: (metrics: AdminRevenueMetrics) => number) => report.periods.map(period => pick(period.current))
  const cards: CardSpec[] = [
    { id: 'revenue', label: 'Doanh thu đã thu', current: current.revenue_vnd, previous: previous.revenue_vnd, format: formatVndShort, spark: series(m => m.revenue_vnd) },
    { id: 'refunded', label: 'Tiền đã hoàn', current: current.refunded_vnd, previous: previous.refunded_vnd, format: formatVndShort, spark: series(m => m.refunded_vnd), inverse: true },
    { id: 'net', label: 'Thực thu', current: current.net_revenue_vnd, previous: previous.net_revenue_vnd, format: formatVndShort, spark: series(m => m.net_revenue_vnd) },
    { id: 'orders', label: 'Số đơn đã thanh toán', current: current.paid_order_count, previous: previous.paid_order_count, format: value => value.toLocaleString('vi-VN'), spark: series(m => m.paid_order_count) },
  ]
  const caption = report.days === 1 ? 'so với hôm qua' : `so với ${report.days} ngày trước`
  return <section aria-label="Chỉ số doanh thu" className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
    {cards.map(card => {
      const delta = computeDelta(card.current, card.previous)
      const bad = card.inverse ? delta.kind === 'up' || delta.kind === 'new' : delta.kind === 'down'
      return <article key={card.id} className="flex flex-col gap-2.5 rounded-2xl border border-[#E8E4DE] bg-white px-[22px] pb-4 pt-[22px]">
        <div className={`text-sm ${MUTED}`}>{card.label}</div>
        <div className="font-display text-[34px] font-medium leading-tight tracking-[-0.5px]">{card.format(card.current)}</div>
        <div className="flex items-center justify-between gap-2">
          <span className={`rounded-full px-2 py-[3px] text-[13px] font-semibold ${(card.inverse ? INVERTED_STYLES : DELTA_STYLES)[delta.kind]}`} aria-label={`Thay đổi ${delta.text}`}>{delta.text}</span>
          <svg width="96" height="28" viewBox="0 0 96 28" aria-hidden="true"><path d={sparkPath(card.spark)} fill="none" stroke={bad ? '#9A3324' : '#3D6B4F'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <div className={`text-xs ${MUTED}`}>{caption}</div>
      </article>
    })}
  </section>
}

function BarTooltip({ active, payload }: { active?: boolean; payload?: { payload?: ChartPoint }[] }) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  return <div className="min-w-[220px] rounded-[10px] bg-[#1C1B19] px-3 py-2.5 text-[13px] leading-normal text-white shadow-lg">
    <div className="text-[#CFCAC2]">{point.label}</div>
    <div className="font-semibold">Thực thu {formatVnd(point.net)}</div>
    <div className="text-[#CFCAC2]">Doanh thu {formatVnd(point.revenue)} · Hoàn {formatVnd(point.refunded)}</div>
    <div className="text-[#CFCAC2]">{point.orders} đơn đã thanh toán</div>
    <div className="mt-1 border-t border-white/20 pt-1 text-[#CFCAC2]">Kỳ trước ({point.previousLabel}): {formatVnd(point.previousNet)}</div>
  </div>
}

export function RevenueBarChart({ report }: { report: AdminRevenueReport }) {
  const points = buildChartPoints(report)
  const axis = moneyAxis(points.flatMap(point => [point.net, point.previousNet]))
  const ticks = evenlySpaced(points).map(point => point.key)
  const tickText = new Map(points.map(point => [point.key, point.tick]))
  const empty = isEmptyReport(report) && report.totals.previous.revenue_vnd === 0
  return <section className={`${CARD} flex min-w-0 flex-col gap-4`}>
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className={CARD_TITLE}>Thực thu theo kỳ</h2>
      <span className={`flex flex-wrap items-center gap-4 text-[13px] ${MUTED}`}>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-sm bg-[#3D6B4F]" />Kỳ này</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="inline-block h-0 w-5 border-t-2 border-dashed border-[#9B958C]" />Kỳ trước</span>
        <span>Chỉ tính tiền đã thu · theo ngày nhận tiền</span>
      </span>
    </div>
    {empty ? <BlockEmpty>Chưa có dữ liệu trong khoảng này</BlockEmpty> : <div role="img" aria-label={`Biểu đồ thực thu theo ${report.group === 'day' ? 'ngày' : report.group === 'week' ? 'tuần' : 'tháng'}, tổng ${formatVnd(report.totals.current.net_revenue_vnd)}`} className="h-[300px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 760, height: 300 }}>
        <ComposedChart data={points} margin={{ top: 8, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="#EFECE7" />
          <XAxis dataKey="key" ticks={ticks} tickFormatter={(key: string) => tickText.get(key) ?? key} tickLine={false} axisLine={false} tick={{ fill: '#6B665F', fontSize: 12 }} interval={0} />
          <YAxis width={48} domain={axis.domain} ticks={axis.ticks} tickFormatter={formatAxis} tickLine={false} axisLine={false} tick={{ fill: '#6B665F', fontSize: 12 }} />
          <Tooltip content={<BarTooltip />} cursor={{ fill: '#F3EFE9' }} />
          <Bar dataKey="net" fill="#3D6B4F" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
          <Line type="linear" dataKey="previousNet" stroke="#9B958C" strokeWidth={2} strokeDasharray="6 4" dot={false} activeDot={{ r: 4, fill: '#FFFFFF', stroke: '#9B958C', strokeWidth: 2 }} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>}
  </section>
}

interface PeriodTableProps {
  report: AdminRevenueReport
  onExport: () => void
  exporting: boolean
  exportError: string | null
}

const TH = 'py-2 text-right font-semibold'

export function PeriodTable({ report, onExport, exporting, exportError }: PeriodTableProps) {
  const total = report.totals.current
  return <section className={`${CARD} flex min-w-0 flex-col gap-3`}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className={CARD_TITLE}>Chi tiết theo kỳ</h2>
        <p className={`mt-1 text-[13px] ${MUTED}`}>{rangeLabel(report.from, report.to)} · {report.periods.length} kỳ</p>
      </div>
      <button type="button" onClick={onExport} disabled={exporting} aria-busy={exporting}
        className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-[#D9D4CC] bg-white px-4 py-2.5 text-sm font-medium transition hover:bg-[#FAF8F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B19] disabled:cursor-wait disabled:opacity-70">
        <Download size={15} aria-hidden="true" />{exporting ? 'Đang xuất…' : 'Xuất CSV'}
      </button>
    </div>
    {exportError && <p role="alert" className="m-0 rounded-xl bg-[#F6E4E0] px-4 py-3 text-sm text-[#9A3324]">{exportError}</p>}
    <div className="max-h-[480px] overflow-auto">
      <table className="w-full min-w-[620px] border-collapse text-sm">
        <thead className="sticky top-0 bg-white"><tr className={`text-xs tracking-[0.4px] ${MUTED}`}>
          <th scope="col" className="py-2 text-left font-semibold">KỲ</th>
          <th scope="col" className={TH}>SỐ ĐƠN</th><th scope="col" className={TH}>DOANH THU</th><th scope="col" className={TH}>HOÀN TIỀN</th><th scope="col" className={TH}>THỰC THU</th>
        </tr></thead>
        <tbody>
          {report.periods.map(period => <tr key={period.from} className="border-t border-[#EFECE7]">
            <th scope="row" className="py-2.5 text-left font-normal">{periodLabel(period, report.group)}</th>
            <td className="py-2.5 text-right tabular-nums">{period.current.paid_order_count}</td>
            <td className="py-2.5 text-right tabular-nums">{formatVnd(period.current.revenue_vnd)}</td>
            <td className="py-2.5 text-right tabular-nums">{formatVnd(period.current.refunded_vnd)}</td>
            <td className="py-2.5 text-right font-semibold tabular-nums">{formatVnd(period.current.net_revenue_vnd)}</td>
          </tr>)}
        </tbody>
        <tfoot><tr className="border-t-2 border-[#1C1B19] font-semibold">
          <th scope="row" className="py-3 text-left">Tổng</th>
          <td className="py-3 text-right tabular-nums">{total.paid_order_count}</td>
          <td className="py-3 text-right tabular-nums">{formatVnd(total.revenue_vnd)}</td>
          <td className="py-3 text-right tabular-nums">{formatVnd(total.refunded_vnd)}</td>
          <td className="py-3 text-right tabular-nums">{formatVnd(total.net_revenue_vnd)}</td>
        </tr></tfoot>
      </table>
    </div>
  </section>
}

interface ShareTableProps {
  title: string
  note: string
  valueHeader: string
  rows: ShareRow[]
  color: (row: ShareRow, index: number) => string
}

const PALETTE = ['#3D6B4F', '#8FAF95', '#C9A66B', '#1C1B19', '#B9B3AA', '#6B8E9B', '#E2D2B0']

function ShareTable({ title, note, valueHeader, rows, color }: ShareTableProps) {
  const empty = rows.length === 0 || rows.every(row => row.value <= 0)
  return <section className={`${CARD} flex min-w-0 flex-col gap-3`}>
    <div><h2 className={CARD_TITLE}>{title}</h2><p className={`mt-1 text-[13px] ${MUTED}`}>{note}</p></div>
    {empty ? <BlockEmpty>Chưa có dữ liệu trong khoảng này</BlockEmpty> : <table className="w-full border-collapse text-sm">
      <thead><tr className={`text-xs tracking-[0.4px] ${MUTED}`}><th scope="col" className="py-2 text-left font-semibold">{valueHeader}</th><th scope="col" className={TH}>GIÁ TRỊ</th><th scope="col" className={TH}>TỶ LỆ</th></tr></thead>
      <tbody>{rows.map((row, index) => <tr key={row.key} className="border-t border-[#EFECE7] align-top">
        <th scope="row" className="py-3 pr-3 text-left font-normal">
          <div>{row.label}</div>
          {row.extra && <div className={`text-xs ${MUTED}`}>{row.extra}</div>}
          <div className="mt-1.5 h-2 rounded-[4px] bg-[#EFECE7]" role="img" aria-label={`${row.label}: ${percentText(row.percent)}`}><div className="h-2 rounded-[4px]" style={{ width: `${row.percent}%`, background: color(row, index) }} /></div>
        </th>
        <td className="py-3 text-right font-semibold tabular-nums">{formatVndShort(row.value)}</td>
        <td className="py-3 pl-3 text-right tabular-nums">{percentText(row.percent)}</td>
      </tr>)}</tbody>
    </table>}
  </section>
}

export function CategoryShares({ report }: { report: AdminRevenueReport }) {
  const rows = withShares(report.by_category, category => ({ key: category.category_id, label: category.name, value: category.revenue_vnd, extra: `${category.quantity} sản phẩm` }))
  return <ShareTable title="Theo danh mục" note="Giá trị các dòng hàng của đơn đã thu · chưa trừ hoàn tiền" valueHeader="DANH MỤC" rows={rows} color={(_, index) => PALETTE[index % PALETTE.length]} />
}

const METHOD_COLORS: Record<string, string> = { VNPAY: '#1C1B19', COD: '#3D6B4F', SEPAY_VIETQR: '#C9A66B' }

export function MethodShares({ report }: { report: AdminRevenueReport }) {
  const rows = withShares(report.by_payment_method, method => ({
    key: method.payment_method, label: methodLabel(method.payment_method), value: method.net_revenue_vnd,
    extra: `${method.paid_order_count} đơn · thu ${formatVnd(method.revenue_vnd)} · hoàn ${formatVnd(method.refunded_vnd)}`,
  }))
  return <ShareTable title="Theo phương thức thanh toán" note="Thực thu (đã trừ hoàn tiền)" valueHeader="PHƯƠNG THỨC" rows={rows} color={row => METHOD_COLORS[row.key] ?? '#B9B3AA'} />
}

export function TopTen({ report }: { report: AdminRevenueReport }) {
  return <section className={`${CARD} flex min-w-0 flex-col gap-3`}>
    <div><h2 className={CARD_TITLE}>Top 10 sản phẩm</h2><p className={`mt-1 text-[13px] ${MUTED}`}>Theo số lượng bán, trong các đơn đã thu</p></div>
    {report.top_products.length === 0 ? <BlockEmpty>Chưa có sản phẩm bán ra trong khoảng này</BlockEmpty> : <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead><tr className={`text-xs tracking-[0.4px] ${MUTED}`}><th scope="col" className="w-8 py-2 text-left font-semibold">#</th><th scope="col" className="py-2 text-left font-semibold">SẢN PHẨM</th><th scope="col" className={TH}>ĐÃ BÁN</th><th scope="col" className={TH}>DOANH THU</th></tr></thead>
        <tbody>{report.top_products.map((product, index) => <tr key={product.product_id} className="border-t border-[#EFECE7]">
          <td className={`py-3 ${MUTED}`}>{index + 1}</td>
          <td className="py-3 pr-3"><div className="flex items-center gap-3"><Thumb url={product.image_url} /><span className="line-clamp-2">{product.name}</span></div></td>
          <td className="py-3 text-right tabular-nums">{product.quantity}</td>
          <td className="py-3 text-right font-semibold tabular-nums">{formatVndShort(product.revenue_vnd)}</td>
        </tr>)}</tbody>
      </table>
    </div>}
  </section>
}

