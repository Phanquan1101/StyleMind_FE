import type { AdminDashboard, AdminDashboardDay, AdminDashboardStatusKey } from '@/api/commerce.types'
import { formatCurrency } from '@/shared/lib/formatCurrency'

/** Dashboard days are shop-local calendar days; the browser's own time zone must not shift them. */
export const SHOP_TIME_ZONE = 'Asia/Ho_Chi_Minh'

export type RangeDays = 1 | 7 | 30 | 90
export const RANGE_OPTIONS: { days: RangeDays; label: string }[] = [
  { days: 1, label: 'Hôm nay' },
  { days: 7, label: '7 ngày' },
  { days: 30, label: '30 ngày' },
  { days: 90, label: '90 ngày' },
]
export const DEFAULT_RANGE: RangeDays = 30

export function parseRange(value: string | null): RangeDays {
  const days = Number(value)
  return RANGE_OPTIONS.some(option => option.days === days) ? (days as RangeDays) : DEFAULT_RANGE
}

const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: SHOP_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
const timeFormatter = new Intl.DateTimeFormat('vi-VN', { timeZone: SHOP_TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: false })

/** yyyy-MM-dd of `now` in the shop time zone. */
export function shopDay(now: Date = new Date()): string {
  return dayFormatter.format(now)
}

export function addDays(day: string, delta: number): string {
  const [year, month, date] = day.split('-').map(Number)
  const result = new Date(Date.UTC(year, month - 1, date + delta))
  return result.toISOString().slice(0, 10)
}

export function rangeQuery(days: RangeDays, now: Date = new Date()): { from: string; to: string } {
  const to = shopDay(now)
  return { from: addDays(to, -(days - 1)), to }
}

export function formatTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return Number.isNaN(date.getTime()) ? '' : timeFormatter.format(date)
}

/** "28/10" */
export function dayLabel(day: string): string {
  const [, month, date] = day.split('-')
  return `${date}/${month}`
}

const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
/** "Thứ Bảy, 31/10" */
export function weekdayLabel(day: string): string {
  const [year, month, date] = day.split('-').map(Number)
  return `${WEEKDAYS[new Date(Date.UTC(year, month - 1, date)).getUTCDay()]}, ${dayLabel(day)}`
}

export const formatVnd = (value: number) => formatCurrency(Math.round(value))

const decimal = (value: number, digits: number) => value.toFixed(digits).replace('.', ',')

/** "48,65 tr ₫" for big figures, plain "784.700 ₫" below one million. */
export function formatVndShort(value: number): string {
  const amount = Math.round(value)
  const abs = Math.abs(amount)
  if (abs >= 1_000_000_000) {
    const billions = Math.round((amount / 1_000_000_000) * 100) / 100
    return `${decimal(billions, Number.isInteger(billions * 10) ? 1 : 2)} tỷ ₫`
  }
  if (abs >= 1_000_000) {
    const millions = Math.round((amount / 1_000_000) * 100) / 100
    return `${decimal(millions, Number.isInteger(millions * 10) ? 1 : 2)} tr ₫`
  }
  return formatVnd(amount)
}

/** Compact axis labels: "1,5 tr", "800 k", "0". */
export function formatAxis(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${decimal(Math.round((value / 1_000_000) * 10) / 10, 1).replace(',0', '')} tr`
  if (abs >= 1_000) return `${Math.round(value / 1_000)} k`
  return String(Math.round(value))
}

export type DeltaKind = 'up' | 'down' | 'flat' | 'new' | 'none'
export interface Delta {
  kind: DeltaKind
  text: string
}

/** % change against the previous period. Previous = 0: "Mới" if there is something now, otherwise nothing to compare. */
export function computeDelta(current: number, previous: number): Delta {
  if (previous === 0) return current > 0 ? { kind: 'new', text: 'Mới' } : { kind: 'none', text: '—' }
  const percent = ((current - previous) / previous) * 100
  if (Math.abs(percent) < 0.05) return { kind: 'flat', text: '0%' }
  return percent > 0
    ? { kind: 'up', text: `▲ ${decimal(percent, 1)}%` }
    : { kind: 'down', text: `▼ ${decimal(Math.abs(percent), 1)}%` }
}

/** Path for a tiny sparkline (viewBox 96×28), same scaling as the design sample. */
export function sparkPath(values: number[], width = 96, height = 28): string {
  if (values.length === 0) return ''
  if (values.length === 1) return `M0 ${height / 2} L${width} ${height / 2}`
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min || 1
  const pad = 2
  return values
    .map((value, index) => {
      const x = (index * width) / (values.length - 1)
      const y = height - pad - ((value - min) / span) * (height - pad * 2)
      return `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

export const periodLabel = (days: number) => (days === 1 ? 'so với hôm qua' : `so với ${days} ngày trước`)

export interface KpiView {
  id: 'revenue' | 'orders' | 'average'
  label: string
  value: string
  delta: Delta
  spark: number[]
}

function averageSeries(days: AdminDashboardDay[]) {
  return days.map(day => (day.paid_order_count > 0 ? Math.round(day.revenue_vnd / day.paid_order_count) : 0))
}

export function buildKpis(data: AdminDashboard): KpiView[] {
  const { current, previous } = data.kpis
  return [
    {
      id: 'revenue',
      label: 'Doanh thu đã thu',
      value: formatVndShort(current.revenue_vnd),
      delta: computeDelta(current.revenue_vnd, previous.revenue_vnd),
      spark: data.revenue_by_day.map(day => day.revenue_vnd),
    },
    {
      id: 'orders',
      label: 'Số đơn',
      value: current.placed_order_count.toLocaleString('vi-VN'),
      delta: computeDelta(current.placed_order_count, previous.placed_order_count),
      spark: data.revenue_by_day.map(day => day.placed_order_count),
    },
    {
      id: 'average',
      label: 'Giá trị đơn trung bình',
      value: formatVnd(current.average_order_value_vnd),
      delta: computeDelta(current.average_order_value_vnd, previous.average_order_value_vnd),
      spark: averageSeries(data.revenue_by_day),
    },
  ]
}

export interface StatusSlice {
  key: string
  label: string
  color: string
  count: number
}

const STATUS_GROUPS: { key: string; label: string; color: string; members: AdminDashboardStatusKey[] }[] = [
  { key: 'completed', label: 'Hoàn tất', color: '#3D6B4F', members: ['COMPLETED'] },
  { key: 'shipping', label: 'Đang giao', color: '#8FAF95', members: ['SHIPPED'] },
  { key: 'processing', label: 'Đang xử lý', color: '#BFD3C4', members: ['CONFIRMED', 'PROCESSING'] },
  { key: 'awaiting', label: 'Chờ xác nhận', color: '#C9A66B', members: ['AWAITING_CONFIRMATION'] },
  { key: 'payment', label: 'Chờ thanh toán', color: '#E2D2B0', members: ['PENDING_PAYMENT'] },
  { key: 'cancelled', label: 'Đã hủy', color: '#B9B3AA', members: ['CANCELLED'] },
]

/** Non-empty slices in a fixed order; unknown server statuses are ignored rather than crashing the chart. */
export function buildStatusSlices(data: AdminDashboard): StatusSlice[] {
  return STATUS_GROUPS.map(group => ({
    key: group.key,
    label: group.label,
    color: group.color,
    count: data.orders_by_status.filter(row => group.members.includes(row.status)).reduce((sum, row) => sum + row.count, 0),
  })).filter(slice => slice.count > 0)
}

export const METHOD_META: Record<string, { label: string; color: string }> = {
  VNPAY: { label: 'VNPAY', color: '#1C1B19' },
  COD: { label: 'COD đã thu', color: '#3D6B4F' },
  SEPAY_VIETQR: { label: 'VietQR (SePay)', color: '#C9A66B' },
}

export interface MethodBar {
  key: string
  label: string
  color: string
  value: number
  percent: number
}

export function buildMethodBars(data: AdminDashboard): MethodBar[] {
  const total = data.revenue_by_payment_method.reduce((sum, row) => sum + Math.max(0, row.revenue_vnd), 0)
  return data.revenue_by_payment_method.map(row => {
    const meta = METHOD_META[row.payment_method] ?? { label: row.payment_method, color: '#B9B3AA' }
    return {
      key: row.payment_method,
      label: meta.label,
      color: meta.color,
      value: row.revenue_vnd,
      percent: total > 0 ? Math.max(0, row.revenue_vnd) / total * 100 : 0,
    }
  })
}

export type PillTone = 'green' | 'blue' | 'gold' | 'gray'
export const PILL_STYLES: Record<PillTone, string> = {
  green: 'bg-[#E6EFE8] text-[#2F5A40]',
  blue: 'bg-[#EAF0F6] text-[#2B4A6B]',
  gold: 'bg-[#F4EBD9] text-[#7A5A1E]',
  gray: 'bg-[#EFECE7] text-[#4A463F]',
}

export function orderPill(order: { order_status: string; confirmation_state: string; paid: boolean }): { label: string; tone: PillTone } {
  switch (order.order_status) {
    case 'CANCELLED':
      return { label: 'Đã hủy', tone: 'gray' }
    case 'COMPLETED':
      return { label: 'Hoàn tất', tone: 'green' }
    case 'SHIPPED':
      return { label: 'Đang giao', tone: 'blue' }
    case 'PROCESSING':
      return { label: 'Đang xử lý', tone: 'blue' }
    case 'PENDING_PAYMENT':
      return { label: 'Chờ thanh toán', tone: 'gold' }
    default:
      if (order.confirmation_state === 'CONFIRMED') return { label: 'Đã xác nhận', tone: 'green' }
      return order.paid ? { label: 'Đã thanh toán', tone: 'green' } : { label: 'Chờ xác nhận', tone: 'gold' }
  }
}

/** "15:50" today, "Hôm qua", otherwise "dd/MM" — all in shop time. */
export function recentTimeLabel(placedAt: string, now: Date = new Date()): string {
  const placed = new Date(placedAt)
  if (Number.isNaN(placed.getTime())) return ''
  const day = shopDay(placed)
  const today = shopDay(now)
  if (day === today) return formatTime(placed)
  if (day === addDays(today, -1)) return 'Hôm qua'
  return dayLabel(day)
}

/** Ticks for the date axis: first and last day plus evenly spaced days in between (about five labels). */
export function axisTicks(days: AdminDashboardDay[], target = 5): string[] {
  if (days.length <= target) return days.map(day => day.date)
  const step = (days.length - 1) / (target - 1)
  return Array.from({ length: target }, (_, index) => days[Math.round(index * step)].date)
}

export const MAX_EXCEPTIONS_SHOWN = 100
export function exceptionsText(count: number | null): string {
  if (count === null) return '—'
  return count >= MAX_EXCEPTIONS_SHOWN ? '99+' : String(count)
}

/** Smallest "round" number (1, 2, 2.5, 5 × 10^k) that is >= value; 0 stays 0. */
export function niceCeil(value: number): number {
  if (value <= 0) return 0
  const power = 10 ** Math.floor(Math.log10(value))
  const fraction = value / power
  const step = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10
  return step * power
}

/**
 * Y axis for money charts: three equal "nice" steps above zero (like the design's three grid lines) and, only when a
 * value is negative (refunds exceeded collections), one tick below zero so nothing is drawn outside the plot.
 */
export function moneyAxis(values: number[]): { domain: [number, number]; ticks: number[] } {
  const max = Math.max(0, ...values)
  const min = Math.min(0, ...values)
  const step = niceCeil(max / 3) || 1_000_000
  const bottom = min < 0 ? -niceCeil(-min) : 0
  const ticks = [0, step, step * 2, step * 3]
  if (bottom < 0) ticks.unshift(bottom)
  return { domain: [bottom, step * 3], ticks }
}

export function revenueAxis(days: AdminDashboardDay[]): { domain: [number, number]; ticks: number[] } {
  return moneyAxis(days.map(day => day.revenue_vnd))
}
