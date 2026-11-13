import type { AdminRevenueGroup, AdminRevenuePeriod, AdminRevenueReport } from '@/api/commerce.types'
import { addDays, dayLabel, shopDay } from '@/features/admin/dashboard/dashboardModel'

/** Everything the page filters by lives in the URL: ?range=30|7|90|month|last-month|custom&from=&to=&group=day|week|month */
export type RangePreset = '7' | '30' | '90' | 'month' | 'last-month' | 'custom'
export const MAX_REPORT_DAYS = 366

export const PRESETS: { value: RangePreset; label: string }[] = [
  { value: '7', label: '7 ngày' },
  { value: '30', label: '30 ngày' },
  { value: '90', label: '90 ngày' },
  { value: 'month', label: 'Tháng này' },
  { value: 'last-month', label: 'Tháng trước' },
  { value: 'custom', label: 'Tùy chọn' },
]

export const GROUPS: { value: AdminRevenueGroup; label: string }[] = [
  { value: 'day', label: 'Ngày' },
  { value: 'week', label: 'Tuần' },
  { value: 'month', label: 'Tháng' },
]

export interface RevenueFilters {
  preset: RangePreset
  group: AdminRevenueGroup
  customFrom: string
  customTo: string
}

const isDay = (value: string | null): value is string => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))

export function parseFilters(params: URLSearchParams): RevenueFilters {
  const range = params.get('range')
  const preset = PRESETS.some(item => item.value === range) ? (range as RangePreset) : '30'
  const group = params.get('group')
  const from = params.get('from')
  const to = params.get('to')
  return {
    preset,
    group: GROUPS.some(item => item.value === group) ? (group as AdminRevenueGroup) : 'day',
    customFrom: isDay(from) ? from : '',
    customTo: isDay(to) ? to : '',
  }
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1
}

export type ResolvedRange = { ok: true; from: string; to: string } | { ok: false; message: string }

/** Turns the filters into shop-local from/to, or a message when a custom range is unusable (no request is sent then). */
export function resolveRange(filters: RevenueFilters, now: Date = new Date()): ResolvedRange {
  const today = shopDay(now)
  switch (filters.preset) {
    case '7':
    case '30':
    case '90':
      return { ok: true, from: addDays(today, -(Number(filters.preset) - 1)), to: today }
    case 'month':
      return { ok: true, from: `${today.slice(0, 7)}-01`, to: today }
    case 'last-month': {
      const lastOfPrevious = addDays(`${today.slice(0, 7)}-01`, -1)
      return { ok: true, from: `${lastOfPrevious.slice(0, 7)}-01`, to: lastOfPrevious }
    }
    case 'custom': {
      const { customFrom: from, customTo: to } = filters
      if (!from || !to) return { ok: false, message: 'Chọn cả ngày bắt đầu và ngày kết thúc.' }
      if (from > to) return { ok: false, message: 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.' }
      if (to > today) return { ok: false, message: 'Ngày kết thúc không được ở tương lai.' }
      if (daysBetween(from, to) > MAX_REPORT_DAYS) return { ok: false, message: `Khoảng thời gian tối đa ${MAX_REPORT_DAYS} ngày.` }
      return { ok: true, from, to }
    }
  }
}

const full = (day: string) => `${dayLabel(day)}/${day.slice(0, 4)}`

/** Same text as the CSV "Kỳ" column: "13/11/2026", "09/11/2026 – 15/11/2026", "Tháng 11/2026". */
export function periodLabel(period: Pick<AdminRevenuePeriod, 'from' | 'to'>, group: AdminRevenueGroup): string {
  if (group === 'day') return full(period.from)
  if (group === 'week') return `${full(period.from)} – ${full(period.to)}`
  return `Tháng ${period.from.slice(5, 7)}/${period.from.slice(0, 4)}`
}

/** Short label under a bar: "13/11", "09/11", "11/2026". */
export function periodTick(period: Pick<AdminRevenuePeriod, 'from'>, group: AdminRevenueGroup): string {
  return group === 'month' ? `${period.from.slice(5, 7)}/${period.from.slice(0, 4)}` : dayLabel(period.from)
}

export function rangeLabel(from: string, to: string): string {
  return from === to ? full(from) : `${full(from)} – ${full(to)}`
}

export interface ChartPoint {
  key: string
  tick: string
  label: string
  net: number
  revenue: number
  refunded: number
  orders: number
  previousNet: number
  previousLabel: string
}

export function buildChartPoints(report: AdminRevenueReport): ChartPoint[] {
  return report.periods.map(period => ({
    key: period.from,
    tick: periodTick(period, report.group),
    label: periodLabel(period, report.group),
    net: period.current.net_revenue_vnd,
    revenue: period.current.revenue_vnd,
    refunded: period.current.refunded_vnd,
    orders: period.current.paid_order_count,
    previousNet: period.previous.net_revenue_vnd,
    previousLabel: periodLabel({ from: period.previous_from, to: period.previous_to }, report.group),
  }))
}

/** Evenly spaced picks including first and last (for axis labels). */
export function evenlySpaced<T>(items: T[], target = 6): T[] {
  if (items.length <= target) return items
  const step = (items.length - 1) / (target - 1)
  return Array.from({ length: target }, (_, index) => items[Math.round(index * step)])
}

export interface ShareRow {
  key: string
  label: string
  value: number
  percent: number
  extra?: string
}

/** Percent of the (positive) total; rows keep the server order. */
export function withShares<T>(rows: T[], pick: (row: T) => { key: string; label: string; value: number; extra?: string }): ShareRow[] {
  const items = rows.map(pick)
  const total = items.reduce((sum, item) => sum + Math.max(0, item.value), 0)
  return items.map(item => ({ ...item, percent: total > 0 ? (Math.max(0, item.value) / total) * 100 : 0 }))
}

export const methodLabel = (method: string) => ({ VNPAY: 'VNPAY', COD: 'COD đã thu', SEPAY_VIETQR: 'VietQR (SePay)' }[method] ?? method)

export const percentText = (percent: number) => `${percent.toFixed(1).replace('.', ',')}%`

export function csvFilename(from: string, to: string, group: AdminRevenueGroup): string {
  return `doanh-thu_${from}_${to}_${group}.csv`
}


export function isEmptyReport(report: AdminRevenueReport): boolean {
  const { current } = report.totals
  return current.revenue_vnd === 0 && current.refunded_vnd === 0 && current.paid_order_count === 0
}
