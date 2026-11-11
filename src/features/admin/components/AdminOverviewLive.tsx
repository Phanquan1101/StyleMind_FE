import { Package, ShoppingCart, Users, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { commerceApi } from '@/api/commerce'
import { identityApi } from '@/shared/api/identityApi'

interface SummaryCardProps {
  label: string
  value: number | string
  icon: LucideIcon
  to?: string
  note?: string
}

function SummaryCard({ label, value, icon: Icon, to, note }: SummaryCardProps) {
  const content = <><div className="flex items-start justify-between gap-4"><span className="text-sm text-secondary">{label}</span><Icon size={19} aria-hidden="true" /></div><p className="mt-5 font-display text-3xl">{value}</p>{note && <p className="mt-2 text-xs text-secondary">{note}</p>}</>
  const styles = 'block min-w-0 rounded-xl border border-[#E3E2E2] bg-white p-5'
  return to ? <Link to={to} className={`${styles} transition hover:border-[#999]`}>{content}</Link> : <div className={styles}>{content}</div>
}

interface Totals {
  orders: number | null
  products: number | null
  accounts: number | null
}

/** Reads the totals the servers report (total_elements of a 1-row page); nothing is counted from downloaded rows. */
async function loadTotals(): Promise<Totals> {
  const count = async (request: () => Promise<{ total_elements: number }>) => {
    try {
      const result = await request()
      return Number.isSafeInteger(result.total_elements) ? result.total_elements : null
    } catch {
      return null
    }
  }
  const [orders, products, accounts] = await Promise.all([
    count(() => commerceApi.orders.listAdmin({ page: 0, size: 1 })),
    count(() => commerceApi.products.listAdmin({ status: 'ACTIVE', page: 0, size: 1 })),
    count(() => identityApi.listUsers({ page: 0, size: 1 })),
  ])
  return { orders, products, accounts }
}

export function AdminOverviewLive() {
  const [totals, setTotals] = useState<Totals | null>(null)
  const refresh = useCallback(() => {
    let active = true
    void loadTotals().then(result => { if (active) setTotals(result) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const stop = refresh()
    // Numbers can change while the tab is in the background (new orders, new accounts): refresh when it is shown again.
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { stop(); document.removeEventListener('visibilitychange', onVisible) }
  }, [refresh])

  const show = (value: number | null | undefined) => (totals === null ? '…' : value ?? '—')

  return <section className="space-y-8">
    <header><h1 className="font-display text-4xl">Tổng quan quản trị</h1><p className="mt-2 text-sm text-secondary">Theo dõi hoạt động cửa hàng và quản lý dữ liệu.</p></header>

    <section aria-labelledby="admin-orders-heading" className="space-y-4">
      <h2 id="admin-orders-heading" className="font-display text-2xl">Đơn hàng</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Tổng đơn hàng" value={show(totals?.orders)} icon={ShoppingCart} to="/admin?section=orders" note="Xem đơn hàng →" />
      </div>
    </section>

    <section aria-labelledby="admin-store-heading" className="space-y-4">
      <h2 id="admin-store-heading" className="font-display text-2xl">Cửa hàng &amp; người dùng</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Sản phẩm đang hiển thị" value={show(totals?.products)} icon={Package} to="/admin?section=products" note="Xem sản phẩm →" />
        <SummaryCard label="Tài khoản" value={show(totals?.accounts)} icon={Users} to="/admin?section=customers" note="Xem tài khoản →" />
      </div>
    </section>
  </section>
}
