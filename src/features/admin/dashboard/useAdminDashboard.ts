import { useCallback, useEffect, useRef, useState } from 'react'

import { commerceApi } from '@/api/commerce'
import type { AdminDashboard } from '@/api/commerce.types'
import { paymentApi } from '@/features/payments'
import { rangeQuery, type RangeDays } from './dashboardModel'

export type DashboardState =
  | { status: 'loading'; data: AdminDashboard | null }
  | { status: 'ready'; data: AdminDashboard }
  | { status: 'error'; data: AdminDashboard | null; message: string }

type Fetcher = (query: { from: string; to: string }) => Promise<AdminDashboard>

const defaultFetcher: Fetcher = query => commerceApi.dashboard.get(query)

/**
 * Loads the dashboard for the chosen range. Switching range or pressing refresh keeps the previous numbers on screen
 * (status stays "loading" with data) so the page does not collapse into skeletons; a late response of an older request
 * never overwrites a newer one.
 */
export function useAdminDashboard(days: RangeDays, fetcher: Fetcher = defaultFetcher) {
  const [state, setState] = useState<DashboardState>({ status: 'loading', data: null })
  const [version, setVersion] = useState(0)
  const latest = useRef(0)

  useEffect(() => {
    const request = ++latest.current
    setState(current => ({ status: 'loading', data: current.data }))
    // Promise.resolve().then(...) so that a throwing/missing API client becomes the error state instead of crashing the page.
    Promise.resolve()
      .then(() => fetcher(rangeQuery(days)))
      .then(data => { if (request === latest.current) setState({ status: 'ready', data }) })
      .catch((error: unknown) => {
        if (request !== latest.current) return
        const message = error instanceof Error && error.message ? error.message : 'Không tải được dữ liệu tổng quan.'
        setState(current => ({ status: 'error', data: current.data, message }))
      })
  }, [days, fetcher, version])

  const refresh = useCallback(() => setVersion(value => value + 1), [])
  return { state, refresh }
}

/** Open payment exceptions (the payment API does not return a total, so count one page of up to 100). */
export async function countOpenPaymentExceptions(): Promise<number> {
  const result = await paymentApi.listPaymentExceptions({ status: 'OPEN', limit: 100, offset: 0 })
  return result.items.length
}

export interface NavBadges {
  orders: number
  payments: number
  requests: number
}

export interface BadgeOptions {
  enabled?: boolean
  intervalMs?: number
  fetchPending?: () => Promise<AdminDashboard['pending']>
  fetchExceptions?: () => Promise<number>
}

const NO_BADGES: NavBadges = { orders: 0, payments: 0, requests: 0 }

const defaultPending = async () => (await commerceApi.dashboard.get(rangeQuery(1))).pending

/**
 * Counts for the admin sidebar: orders waiting for confirmation, pending cancellation requests and open payment
 * exceptions. Refreshes every ~30 s and when the tab becomes visible again; a failing source keeps its last value.
 * Disabled under test unless a test asks for it explicitly.
 */
export function useAdminNavBadges(options: BadgeOptions = {}): NavBadges {
  const {
    enabled = import.meta.env.MODE !== 'test',
    intervalMs = 30_000,
    fetchPending = defaultPending,
    fetchExceptions = countOpenPaymentExceptions,
  } = options
  const [badges, setBadges] = useState<NavBadges>(NO_BADGES)

  useEffect(() => {
    if (!enabled) return
    let active = true
    const load = () => {
      void fetchPending()
        .then(pending => {
          if (active) setBadges(current => ({ ...current, orders: pending.awaiting_confirmation_orders, requests: pending.pending_cancellation_requests }))
        })
        .catch(() => undefined)
      void fetchExceptions()
        .then(count => { if (active) setBadges(current => ({ ...current, payments: count })) })
        .catch(() => undefined)
    }
    load()
    const timer = window.setInterval(load, intervalMs)
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled, intervalMs, fetchPending, fetchExceptions])

  return enabled ? badges : NO_BADGES
}
