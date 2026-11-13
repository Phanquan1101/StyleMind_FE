import { describe, expect, it } from 'vitest'

import {
  addDays,
  axisTicks,
  computeDelta,
  exceptionsText,
  formatAxis,
  formatVndShort,
  niceCeil,
  orderPill,
  parseRange,
  periodLabel,
  rangeQuery,
  recentTimeLabel,
  revenueAxis,
  shopDay,
  sparkPath,
  weekdayLabel,
} from './dashboardModel'

const nbsp = (value: string) => value.replace(/ /g, ' ')

describe('formatVndShort', () => {
  it('shortens millions like the design sample and keeps small amounts in full', () => {
    expect(nbsp(formatVndShort(48_650_000))).toBe('48,65 tr ₫')
    expect(nbsp(formatVndShort(9_000_000))).toBe('9,0 tr ₫')
    expect(nbsp(formatVndShort(9_350_000))).toBe('9,35 tr ₫')
    expect(nbsp(formatVndShort(21_400_000))).toBe('21,4 tr ₫')
    expect(nbsp(formatVndShort(1_250_000_000))).toBe('1,25 tỷ ₫')
    expect(nbsp(formatVndShort(784_700))).toBe('784.700 ₫')
    expect(nbsp(formatVndShort(0))).toBe('0 ₫')
  })

  it('formats axis ticks compactly', () => {
    expect(formatAxis(0)).toBe('0')
    expect(formatAxis(800_000)).toBe('800 k')
    expect(formatAxis(1_500_000)).toBe('1,5 tr')
    expect(formatAxis(3_000_000)).toBe('3 tr')
  })
})

describe('computeDelta', () => {
  it('shows the percentage against the previous period', () => {
    expect(computeDelta(112, 100)).toEqual({ kind: 'up', text: '▲ 12,0%' })
    expect(computeDelta(94.7, 100)).toEqual({ kind: 'down', text: '▼ 5,3%' })
    expect(computeDelta(100, 100)).toEqual({ kind: 'flat', text: '0%' })
  })

  it('shows "Mới" when there was nothing before and nothing to compare when both are zero', () => {
    expect(computeDelta(5, 0)).toEqual({ kind: 'new', text: 'Mới' })
    expect(computeDelta(0, 0)).toEqual({ kind: 'none', text: '—' })
    expect(computeDelta(0, 10)).toEqual({ kind: 'down', text: '▼ 100,0%' })
  })
})

describe('date helpers', () => {
  it('uses shop-local days no matter the browser zone', () => {
    // 2026-11-12 18:30 UTC is already 13/11 01:30 in Ho Chi Minh.
    expect(shopDay(new Date('2026-11-12T18:30:00Z'))).toBe('2026-11-13')
    expect(shopDay(new Date('2026-11-12T16:59:00Z'))).toBe('2026-11-12')
    expect(rangeQuery(30, new Date('2026-11-12T18:30:00Z'))).toEqual({ from: '2026-10-15', to: '2026-11-13' })
    expect(rangeQuery(1, new Date('2026-11-12T18:30:00Z'))).toEqual({ from: '2026-11-13', to: '2026-11-13' })
    expect(rangeQuery(7, new Date('2026-11-12T18:30:00Z')).from).toBe('2026-11-07')
  })

  it('adds days across month and year ends', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('parses the range from the URL and falls back to 30 days', () => {
    expect(parseRange('7')).toBe(7)
    expect(parseRange('90')).toBe(90)
    expect(parseRange('1')).toBe(1)
    expect(parseRange('15')).toBe(30)
    expect(parseRange(null)).toBe(30)
    expect(parseRange('abc')).toBe(30)
  })

  it('labels weekdays and relative times', () => {
    expect(weekdayLabel('2026-10-31')).toBe('Thứ Bảy, 31/10')
    expect(periodLabel(30)).toBe('so với 30 ngày trước')
    expect(periodLabel(1)).toBe('so với hôm qua')
    const now = new Date('2026-11-13T09:00:00Z') // 16:00 on 13/11 in shop time
    expect(recentTimeLabel('2026-11-13T08:50:00Z', now)).toBe('15:50')
    expect(recentTimeLabel('2026-11-12T08:50:00Z', now)).toBe('Hôm qua')
    expect(recentTimeLabel('2026-11-09T08:50:00Z', now)).toBe('09/11')
    expect(recentTimeLabel('not a date', now)).toBe('')
  })
})

describe('chart helpers', () => {
  it('builds a sparkline path and survives flat or single-point series', () => {
    expect(sparkPath([])).toBe('')
    expect(sparkPath([5])).toBe('M0 14 L96 14')
    expect(sparkPath([1, 1, 1])).toMatch(/^M0\.0 26\.0 L48\.0 26\.0 L96\.0 26\.0$/)
    const rising = sparkPath([1, 2, 3, 4])
    expect(rising.startsWith('M0.0 26.0')).toBe(true)
    expect(rising.endsWith('L96.0 2.0')).toBe(true)
  })

  it('picks about five evenly spaced axis ticks including both ends', () => {
    const days = Array.from({ length: 30 }, (_, index) => ({ date: addDays('2026-10-15', index), revenue_vnd: 0, paid_order_count: 0, placed_order_count: 0 }))
    const ticks = axisTicks(days)
    expect(ticks).toHaveLength(5)
    expect(ticks[0]).toBe('2026-10-15')
    expect(ticks[4]).toBe('2026-11-13')
    expect(axisTicks(days.slice(0, 3))).toEqual(['2026-10-15', '2026-10-16', '2026-10-17'])
  })
})

describe('labels', () => {
  it('maps order status to the pill shown in recent orders', () => {
    expect(orderPill({ order_status: 'CANCELLED', confirmation_state: 'UNCONFIRMED', paid: false }).label).toBe('Đã hủy')
    expect(orderPill({ order_status: 'COMPLETED', confirmation_state: 'CONFIRMED', paid: true }).label).toBe('Hoàn tất')
    expect(orderPill({ order_status: 'SHIPPED', confirmation_state: 'CONFIRMED', paid: true }).label).toBe('Đang giao')
    expect(orderPill({ order_status: 'PAID', confirmation_state: 'UNCONFIRMED', paid: true }).label).toBe('Đã thanh toán')
    expect(orderPill({ order_status: 'PLACED', confirmation_state: 'UNCONFIRMED', paid: false })).toEqual({ label: 'Chờ xác nhận', tone: 'gold' })
    expect(orderPill({ order_status: 'PAID', confirmation_state: 'CONFIRMED', paid: true }).label).toBe('Đã xác nhận')
    expect(orderPill({ order_status: 'PENDING_PAYMENT', confirmation_state: 'UNCONFIRMED', paid: false }).label).toBe('Chờ thanh toán')
  })

  it('caps the payment exception counter at 99+', () => {
    expect(exceptionsText(null)).toBe('—')
    expect(exceptionsText(0)).toBe('0')
    expect(exceptionsText(7)).toBe('7')
    expect(exceptionsText(100)).toBe('99+')
  })
})

describe('revenueAxis', () => {
  const days = (values: number[]) => values.map((value, index) => ({ date: `2026-11-${String(index + 1).padStart(2, '0')}`, revenue_vnd: value, paid_order_count: 0, placed_order_count: 0 }))

  it('rounds to a nice number', () => {
    expect(niceCeil(0)).toBe(0)
    expect(niceCeil(2_940_000)).toBe(5_000_000)
    expect(niceCeil(10_405_000)).toBe(20_000_000)
    expect(niceCeil(2_300_000)).toBe(2_500_000)
  })

  it('uses three equal nice steps above zero', () => {
    expect(revenueAxis(days([1_000_000, 2_940_000, 0]))).toEqual({ domain: [0, 3_000_000], ticks: [0, 1_000_000, 2_000_000, 3_000_000] })
    expect(revenueAxis(days([10_405_000, 0])).ticks).toEqual([0, 5_000_000, 10_000_000, 15_000_000])
  })

  it('adds one tick below zero only when refunds made a day negative', () => {
    const axis = revenueAxis(days([3_000_000, -300_000, 1_200_000]))
    expect(axis.domain).toEqual([-500_000, 3_000_000])
    expect(axis.ticks).toEqual([-500_000, 0, 1_000_000, 2_000_000, 3_000_000])
  })

  it('still returns a usable axis when there is no revenue at all', () => {
    expect(revenueAxis(days([0, 0])).domain).toEqual([0, 3_000_000])
  })
})
