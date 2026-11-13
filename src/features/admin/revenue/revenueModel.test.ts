import { describe, expect, it } from 'vitest'

import {
  buildChartPoints,
  csvFilename,
  daysBetween,
  evenlySpaced,
  isEmptyReport,
  methodLabel,
  parseFilters,
  percentText,
  periodLabel,
  periodTick,
  rangeLabel,
  resolveRange,
  withShares,
} from './revenueModel'
import type { AdminRevenueReport } from '@/api/commerce.types'

const NOW = new Date('2026-11-13T09:00:00Z') // 13/11/2026 16:00 in the shop

const filters = (query: string) => parseFilters(new URLSearchParams(query))

describe('parseFilters', () => {
  it('defaults to 30 days grouped by day', () => {
    expect(filters('')).toEqual({ preset: '30', group: 'day', customFrom: '', customTo: '' })
  })

  it('reads every filter from the URL and ignores junk', () => {
    expect(filters('range=custom&from=2026-10-01&to=2026-10-31&group=week')).toEqual({ preset: 'custom', group: 'week', customFrom: '2026-10-01', customTo: '2026-10-31' })
    expect(filters('range=last-month&group=month').preset).toBe('last-month')
    expect(filters('range=year&group=hour')).toEqual({ preset: '30', group: 'day', customFrom: '', customTo: '' })
    expect(filters('range=custom&from=2026-13-45&to=abc').customFrom).toBe('')
  })
})

describe('resolveRange', () => {
  const resolve = (query: string) => resolveRange(filters(query), NOW)

  it('resolves the presets in shop time', () => {
    expect(resolve('range=7')).toEqual({ ok: true, from: '2026-11-07', to: '2026-11-13' })
    expect(resolve('')).toEqual({ ok: true, from: '2026-10-15', to: '2026-11-13' })
    expect(resolve('range=90')).toEqual({ ok: true, from: '2026-08-16', to: '2026-11-13' })
    expect(resolve('range=month')).toEqual({ ok: true, from: '2026-11-01', to: '2026-11-13' })
    expect(resolve('range=last-month')).toEqual({ ok: true, from: '2026-10-01', to: '2026-10-31' })
  })

  it('handles the first days of a month and the January wrap', () => {
    expect(resolveRange(filters('range=month'), new Date('2026-10-31T17:30:00Z'))).toEqual({ ok: true, from: '2026-11-01', to: '2026-11-01' })
    expect(resolveRange(filters('range=last-month'), new Date('2026-01-10T05:00:00Z'))).toEqual({ ok: true, from: '2025-12-01', to: '2025-12-31' })
    expect(resolveRange(filters('range=last-month'), new Date('2026-03-05T05:00:00Z'))).toEqual({ ok: true, from: '2026-02-01', to: '2026-02-28' })
  })

  it('validates a custom range before anything is requested', () => {
    expect(resolve('range=custom&from=2026-10-01&to=2026-10-31')).toEqual({ ok: true, from: '2026-10-01', to: '2026-10-31' })
    expect(resolve('range=custom&from=2026-10-01')).toMatchObject({ ok: false, message: 'Chọn cả ngày bắt đầu và ngày kết thúc.' })
    expect(resolve('range=custom&from=2026-10-31&to=2026-10-01')).toMatchObject({ ok: false, message: 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.' })
    expect(resolve('range=custom&from=2026-11-01&to=2026-11-14')).toMatchObject({ ok: false, message: 'Ngày kết thúc không được ở tương lai.' })
    expect(resolve('range=custom&from=2025-11-12&to=2026-11-13')).toMatchObject({ ok: false, message: 'Khoảng thời gian tối đa 366 ngày.' })
    expect(resolve('range=custom&from=2025-11-13&to=2026-11-13')).toMatchObject({ ok: true })
    expect(daysBetween('2025-11-13', '2026-11-13')).toBe(366)
  })
})

describe('labels', () => {
  it('uses the same period text as the CSV', () => {
    expect(periodLabel({ from: '2026-11-13', to: '2026-11-13' }, 'day')).toBe('13/11/2026')
    expect(periodLabel({ from: '2026-11-09', to: '2026-11-15' }, 'week')).toBe('09/11/2026 – 15/11/2026')
    expect(periodLabel({ from: '2026-11-01', to: '2026-11-30' }, 'month')).toBe('Tháng 11/2026')
    expect(periodTick({ from: '2026-11-09' }, 'week')).toBe('09/11')
    expect(periodTick({ from: '2026-11-01' }, 'month')).toBe('11/2026')
    expect(rangeLabel('2026-11-13', '2026-11-13')).toBe('13/11/2026')
    expect(rangeLabel('2026-10-15', '2026-11-13')).toBe('15/10/2026 – 13/11/2026')
    expect(csvFilename('2026-10-15', '2026-11-13', 'week')).toBe('doanh-thu_2026-10-15_2026-11-13_week.csv')
    expect(methodLabel('COD')).toBe('COD đã thu')
    expect(methodLabel('X')).toBe('X')
    expect(percentText(44.04)).toBe('44,0%')
  })
})

describe('helpers', () => {
  it('computes shares of the positive total and survives zero totals', () => {
    const rows = withShares([{ n: 'a', v: 300 }, { n: 'b', v: 100 }, { n: 'c', v: -50 }], row => ({ key: row.n, label: row.n, value: row.v }))
    expect(rows.map(row => row.percent)).toEqual([75, 25, 0])
    expect(withShares([{ n: 'a', v: 0 }], row => ({ key: row.n, label: row.n, value: row.v }))[0].percent).toBe(0)
  })

  it('picks evenly spaced ticks including both ends', () => {
    const items = Array.from({ length: 31 }, (_, index) => index)
    expect(evenlySpaced(items, 6)).toEqual([0, 6, 12, 18, 24, 30])
    expect(evenlySpaced([1, 2, 3], 6)).toEqual([1, 2, 3])
  })

  it('builds chart points aligned with the previous period', () => {
    const metrics = (net: number) => ({ paid_order_count: 1, revenue_vnd: net + 10, refunded_vnd: 10, net_revenue_vnd: net })
    const report = {
      group: 'week',
      periods: [{ from: '2026-11-09', to: '2026-11-15', previous_from: '2026-10-26', previous_to: '2026-11-01', current: metrics(500), previous: metrics(300) }],
    } as unknown as AdminRevenueReport
    expect(buildChartPoints(report)).toEqual([{ key: '2026-11-09', tick: '09/11', label: '09/11/2026 – 15/11/2026', net: 500, revenue: 510, refunded: 10, orders: 1, previousNet: 300, previousLabel: '26/10/2026 – 01/11/2026' }])
  })

  it('knows an empty report', () => {
    const zero = { paid_order_count: 0, revenue_vnd: 0, refunded_vnd: 0, net_revenue_vnd: 0 }
    expect(isEmptyReport({ totals: { current: zero, previous: zero } } as AdminRevenueReport)).toBe(true)
    expect(isEmptyReport({ totals: { current: { ...zero, refunded_vnd: 5 }, previous: zero } } as AdminRevenueReport)).toBe(false)
  })
})
