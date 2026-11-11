import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Clock3, RefreshCw } from 'lucide-react'
import { ROUTES } from '@/app/router/routes'
import { paymentApi, paymentErrorMessage } from '@/features/payments/api/paymentClient'
import type { OrderResponse, PendingQrCheckoutPage } from '@/features/payments/api/types'
import { Button } from '@/shared/ui'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { orderStatusLabel, orderStatusLabels } from '../model/orderStatus'

export default function AccountOrdersPage() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const [version, setVersion] = useState(0)
  const [data, setData] = useState<{ items: OrderResponse[]; total_pages: number; total_elements: number } | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [qrPage, setQrPage] = useState(0)
  const [qrData, setQrData] = useState<PendingQrCheckoutPage | null>(null)
  const [qrLoading, setQrLoading] = useState(true)
  const [qrError, setQrError] = useState('')
  const showQr = !status || status === 'PENDING_PAYMENT'
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(''); setData(null)
    void paymentApi.listOrders({ page, size: 10, ...(status ? { status } : {}) }, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setData(result) })
      .catch(failure => { if (!controller.signal.aborted) setError(paymentErrorMessage(failure)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [status, page, version])

  useEffect(() => {
    if (!showQr) return
    const controller = new AbortController()
    setQrLoading(true)
    setQrError('')
    setQrData(null)
    void paymentApi.listPendingQrCheckouts({ page: qrPage, size: 10 }, { signal: controller.signal })
      .then(result => {
        if (!Array.isArray(result?.items)) throw new Error('Invalid QR checkout list')
        if (controller.signal.aborted) return
        if (qrPage > 0 && !result.items.length) {
          setQrPage(0)
          return
        }
        setQrData(result)
      })
      .catch(failure => {
        if (!controller.signal.aborted) setQrError(paymentErrorMessage(failure))
      })
      .finally(() => {
        if (!controller.signal.aborted) setQrLoading(false)
      })
    return () => controller.abort()
  }, [showQr, qrPage, version])

  useEffect(() => {
    const refresh = () => setVersion(value => value + 1)
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])

  const empty = data && !data.items.length && (!showQr || (!qrLoading && !qrError && qrData?.items.length === 0))
  return <section className="mx-auto max-w-5xl px-5 py-10 md:px-8 md:py-12">
    <header className="border-b border-[#E3E2E2] pb-7"><p className="text-sm text-secondary">Tài khoản của tôi</p><h1 className="mt-2 font-display text-4xl font-semibold">Đơn hàng</h1><p className="mt-3 text-sm text-secondary">Theo dõi các đơn hàng của bạn.</p></header>
    <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
      <h2 className="font-display text-2xl font-semibold">Đơn hàng của tôi</h2>
      <div className="flex flex-wrap items-end gap-3">
        <Button type="button" variant="secondary" size="sm" disabled={loading || (showQr && qrLoading)}
          icon={<RefreshCw size={14} aria-hidden="true" />} onClick={() => setVersion(value => value + 1)}>Tải lại</Button>
        <label className="grid gap-1 text-sm">Lọc trạng thái đơn<select aria-label="Lọc trạng thái đơn" value={status}
          onChange={event => { setStatus(event.target.value); setPage(0); setQrPage(0) }}
          className="min-h-11 rounded-lg border border-[#C4C7C7] bg-white px-3">
          <option value="">Tất cả trạng thái</option>
          {Object.entries(orderStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
      </div>
    </div>
    {loading && <p role="status" className="mt-5">Đang tải đơn hàng…</p>}
    {error && <div role="alert" className="mt-5 rounded-lg bg-red-50 p-4">{error} <button className="underline" onClick={() => setVersion(v => v + 1)}>Thử lại</button></div>}
    {showQr && qrLoading && <p role="status" className="mt-5 text-sm text-secondary">Đang tải phiên VietQR chờ thanh toán…</p>}
    {showQr && qrError && <div role="alert" className="mt-5 rounded-lg bg-error-bg p-4 text-sm text-error">
      Chưa tải được phiên VietQR chờ thanh toán. {qrError}
      <button type="button" className="ml-2 underline" onClick={() => setVersion(value => value + 1)}>Thử lại phiên VietQR</button>
    </div>}
    {showQr && !!qrData?.items.length && <section className="mt-5 grid gap-3" aria-label="Phiên VietQR chờ thanh toán">
      <h3 className="flex items-center gap-2 text-sm font-semibold"><Clock3 size={17} aria-hidden="true" /> Chờ thanh toán VietQR</h3>
      {qrData.items.map(checkout => (
        <Link key={checkout.checkoutId} to={'/checkout/qr/' + encodeURIComponent(checkout.checkoutId)}
          className="grid gap-3 rounded-xl border border-warning/30 bg-white p-5 transition hover:border-warning focus-visible:outline-2 focus-visible:outline-accent sm:grid-cols-2">
          <span className="font-semibold">Phiên QR-{checkout.checkoutId.slice(0, 8).toUpperCase()}</span>
          <span className="justify-self-start rounded-full bg-warning-bg px-3 py-1 text-xs font-semibold text-warning-ink sm:justify-self-end">Chờ thanh toán</span>
          <span className="text-sm text-secondary">Tạo lúc <time dateTime={checkout.createdAt}>{new Date(checkout.createdAt).toLocaleString('vi-VN')}</time></span>
          <span className="font-semibold tabular-nums sm:text-right">{formatCurrency(checkout.totalVnd)}</span>
          <span className="text-xs text-secondary">Hạn thanh toán <time dateTime={checkout.expiresAt}>{new Date(checkout.expiresAt).toLocaleString('vi-VN')}</time></span>
          <span className="inline-flex items-center gap-2 text-sm font-semibold sm:justify-self-end">Tiếp tục thanh toán <ArrowRight size={15} aria-hidden="true" /></span>
        </Link>
      ))}
      {qrData.total_pages > 1 && <nav aria-label="Phân trang phiên VietQR" className="flex flex-wrap items-center gap-3 text-sm">
        <Button type="button" variant="secondary" size="sm" disabled={qrPage === 0} onClick={() => setQrPage(value => value - 1)}>Phiên trước</Button>
        <span>Trang phiên {qrPage + 1} / {qrData.total_pages}</span>
        <Button type="button" variant="secondary" size="sm" disabled={qrPage + 1 >= qrData.total_pages} onClick={() => setQrPage(value => value + 1)}>Phiên sau</Button>
      </nav>}
    </section>}
    {empty && <p className="mt-5 rounded-lg border bg-white p-8 text-center">Chưa có đơn hàng phù hợp.</p>}
    <div className="mt-5 grid gap-4">{data?.items.map(order => <Link key={order.order_id} to={ROUTES.orderDetail.replace(':orderId', encodeURIComponent(order.order_id))} className="grid gap-2 rounded-xl border border-[#E3E2E2] bg-white p-5 hover:border-[#777] sm:grid-cols-2"><span className="font-semibold">{order.order_number}</span><span className="sm:text-right">{orderStatusLabel(order.order_status)}</span><span className="text-sm text-secondary">{order.placed_at ? new Date(order.placed_at).toLocaleDateString('vi-VN') : 'Chưa có ngày đặt'}</span><span className="font-semibold sm:text-right">{formatCurrency(order.accepted_total_vnd)}</span></Link>)}</div>
    {data && data.total_pages > 1 && <nav aria-label="Phân trang đơn hàng" className="mt-6 flex items-center gap-3"><button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="rounded border px-3 py-2 disabled:opacity-40">Trang trước</button><span>Trang {page + 1} / {data.total_pages}</span><button disabled={page + 1 >= data.total_pages} onClick={() => setPage(p => p + 1)} className="rounded border px-3 py-2 disabled:opacity-40">Trang sau</button></nav>}
    <Link to={ROUTES.shop} className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold underline">Tiếp tục mua sắm</Link>
  </section>
}
