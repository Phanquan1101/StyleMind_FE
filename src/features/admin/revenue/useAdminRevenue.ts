import { useCallback, useEffect, useRef, useState } from 'react'

import { commerceApi } from '@/api/commerce'
import type { AdminRevenueGroup, AdminRevenueQuery, AdminRevenueReport } from '@/api/commerce.types'
import { csvFilename } from './revenueModel'

export type RevenueState =
  | { status: 'loading'; data: AdminRevenueReport | null }
  | { status: 'ready'; data: AdminRevenueReport }
  | { status: 'error'; data: AdminRevenueReport | null; message: string }

type Fetcher = (query: AdminRevenueQuery) => Promise<AdminRevenueReport>
const defaultFetcher: Fetcher = query => commerceApi.revenue.get(query)

/**
 * Loads the report for a resolved range + grouping (null = filters not usable yet, nothing is requested). Changing the
 * filters or refreshing keeps the previous numbers on screen while loading; a late answer for older filters is dropped.
 */
export function useAdminRevenue(query: { from: string; to: string; group: AdminRevenueGroup } | null, fetcher: Fetcher = defaultFetcher) {
  const [state, setState] = useState<RevenueState>({ status: 'loading', data: null })
  const [version, setVersion] = useState(0)
  const latest = useRef(0)
  const from = query?.from
  const to = query?.to
  const group = query?.group

  useEffect(() => {
    if (!from || !to || !group) return
    const request = ++latest.current
    setState(current => ({ status: 'loading', data: current.data }))
    // Promise.resolve().then(...) so a throwing/missing API client becomes the error state instead of crashing the page.
    Promise.resolve()
      .then(() => fetcher({ from, to, group }))
      .then(data => { if (request === latest.current) setState({ status: 'ready', data }) })
      .catch((error: unknown) => {
        if (request !== latest.current) return
        const message = error instanceof Error && error.message ? error.message : 'Không tải được báo cáo doanh thu.'
        setState(current => ({ status: 'error', data: current.data, message }))
      })
  }, [from, to, group, fetcher, version])

  const refresh = useCallback(() => setVersion(value => value + 1), [])
  return { state, refresh }
}

type Exporter = (query: AdminRevenueQuery) => Promise<Blob>
const defaultExporter: Exporter = query => commerceApi.revenue.exportCsv(query)

/** Downloads the CSV through the authenticated client (a plain link would not carry the token). */
export async function downloadRevenueCsv(
  query: { from: string; to: string; group: AdminRevenueGroup },
  exporter: Exporter = defaultExporter,
): Promise<void> {
  const blob = await exporter(query)
  const url = URL.createObjectURL(blob)
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = csvFilename(query.from, query.to, query.group)
    document.body.appendChild(link)
    link.click()
    link.remove()
  } finally {
    // Give the browser a moment to start the download before releasing the object URL.
    window.setTimeout(() => URL.revokeObjectURL(url), 4000)
  }
}
