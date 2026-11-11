import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/app/router/routes'
import { paymentApi, paymentErrorMessage } from '@/features/payments/api/paymentClient'
import type { OrderResponse, QrCheckoutSummary } from '@/features/payments/api/types'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { orderStatusLabel, orderStatusLabels } from '../model/orderStatus'

const UNPAID_BADGE: Record<string, { label: string; className: string }> = {
  open: { label: 'Chờ thanh toán', className: 'bg-[#FFF4D6] text-[#7A5A1E]' },
  expired: { label: 'Đã hết hạn', className: 'bg-[#EFEDED] text-[#5E5F5D]' },
  review: { label: 'Đang kiểm tra thanh toán', className: 'bg-[#E6EEF8] text-[#2D4A73]' },
}

function unpaidState(item: QrCheckoutSummary, now: number): 'open' | 'expired' | 'review' {
  if (item.status === 'RECONCILIATION_REQUIRED') return 'review'
  if (item.status === 'EXPIRED' || item.status === 'CANCELLED' || Date.parse(item.expiresAt) <= now) return 'expired'
  return 'open'
}

function remaining(expiresAt: string, now: number) {
  const seconds = Math.max(0, Math.floor((Date.parse(expiresAt) - now) / 1000))
  return `${Math.floor(seconds / 60)} phút ${String(seconds % 60).padStart(2, '0')} giây`
}

/** Checkouts that are waiting for the QR payment: they are not orders yet, so they are listed above the real orders. */
function UnpaidCheckouts({ items }: { items: QrCheckoutSummary[] }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer) }, [])
  if (!items.length) return null
  return <div className="mt-5 grid gap-3" aria-label="Thanh toán đang chờ">
    {items.map(item => {
      const state = unpaidState(item, now)
      const badge = UNPAID_BADGE[state]
      return <div key={item.checkoutId} className="grid gap-2 rounded-xl border border-dashed border-[#C4A862] bg-[#FFFBF0] p-5 sm:grid-cols-2">
        <span className="font-semibold">Thanh toán QR #{item.checkoutId.slice(0, 8).toUpperCase()}</span>
        <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold sm:justify-self-end ${badge.className}`}>{badge.label}</span>
        <span className="text-sm text-secondary">{state === 'open' ? `Còn ${remaining(item.expiresAt, now)} để thanh toán` : state === 'review' ? 'Chúng tôi đang đối soát khoản thanh toán của bạn.' : 'Phiên thanh toán đã hết hạn, hàng đã được trả về kho. Hãy đặt lại từ giỏ hàng.'}</span>
        <span className="font-semibold sm:text-right">{formatCurrency(item.totalVnd)}</span>
        {state === 'open' && <Link to={`${ROUTES.checkoutQr}/${encodeURIComponent(item.checkoutId)}`} className="inline-flex min-h-11 w-fit items-center rounded-lg bg-[#1C1B1B] px-4 text-sm font-semibold text-white sm:col-span-2">Tiếp tục thanh toán</Link>}
      </div>
    })}
  </div>
}

export default function AccountOrdersPage() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const [version, setVersion] = useState(0)
  const [data, setData] = useState<{ items: OrderResponse[]; total_pages: number; total_elements: number } | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [unpaid, setUnpaid] = useState<QrCheckoutSummary[]>([])
  // Unpaid QR checkouts: only on the first page of the unfiltered list. A failure here must not hide the real orders.
  useEffect(() => {
    const controller = new AbortController()
    if (status || page !== 0) { setUnpaid([]); return () => controller.abort() }
    void Promise.resolve().then(() => paymentApi.listUnpaidQrCheckouts({ signal: controller.signal }))
      .then(result => { if (!controller.signal.aborted) setUnpaid(result.items) })
      .catch(() => { if (!controller.signal.aborted) setUnpaid([]) })
    return () => controller.abort()
  }, [status, page, version])
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(''); setData(null)
    void paymentApi.listOrders({ page, size: 10, ...(status ? { status } : {}) }, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setData(result) })
      .catch(failure => { if (!controller.signal.aborted) setError(paymentErrorMessage(failure)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [status, page, version])
  return <section className="mx-auto max-w-5xl px-5 py-10 md:px-8 md:py-12">
    <header className="border-b border-[#E3E2E2] pb-7"><p className="text-sm text-secondary">Tài khoản của tôi</p><h1 className="mt-2 font-display text-4xl font-semibold">Đơn hàng</h1><p className="mt-3 text-sm text-secondary">Theo dõi các đơn hàng của bạn.</p></header>
    <div className="mt-7 flex flex-wrap items-center justify-between gap-4"><h2 className="font-display text-2xl font-semibold">Đơn hàng của tôi</h2><label className="grid gap-1 text-sm">Lọc trạng thái đơn<select aria-label="Lọc trạng thái đơn" value={status} onChange={event => { setStatus(event.target.value); setPage(0) }} className="min-h-11 rounded-lg border border-[#C4C7C7] bg-white px-3"><option value="">Tất cả trạng thái</option>{Object.entries(orderStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
    {loading && <p role="status" className="mt-5">Đang tải đơn hàng…</p>}
    {error && <div role="alert" className="mt-5 rounded-lg bg-red-50 p-4">{error} <button className="underline" onClick={() => setVersion(v => v + 1)}>Thử lại</button></div>}
    <UnpaidCheckouts items={unpaid} />
    {data && !data.items.length && !unpaid.length && <p className="mt-5 rounded-lg border bg-white p-8 text-center">Chưa có đơn hàng phù hợp.</p>}
    <div className="mt-5 grid gap-4">{data?.items.map(order => <Link key={order.order_id} to={ROUTES.orderDetail.replace(':orderId', encodeURIComponent(order.order_id))} className="grid gap-2 rounded-xl border border-[#E3E2E2] bg-white p-5 hover:border-[#777] sm:grid-cols-2"><span className="font-semibold">{order.order_number}</span><span className="sm:text-right">{orderStatusLabel(order.order_status)}</span><span className="text-sm text-secondary">{order.placed_at ? new Date(order.placed_at).toLocaleDateString('vi-VN') : 'Chưa có ngày đặt'}</span><span className="font-semibold sm:text-right">{formatCurrency(order.accepted_total_vnd)}</span></Link>)}</div>
    {data && data.total_pages > 1 && <nav aria-label="Phân trang đơn hàng" className="mt-6 flex items-center gap-3"><button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="rounded border px-3 py-2 disabled:opacity-40">Trang trước</button><span>Trang {page + 1} / {data.total_pages}</span><button disabled={page + 1 >= data.total_pages} onClick={() => setPage(p => p + 1)} className="rounded border px-3 py-2 disabled:opacity-40">Trang sau</button></nav>}
    <Link to={ROUTES.shop} className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold underline">Tiếp tục mua sắm</Link>
  </section>
}
