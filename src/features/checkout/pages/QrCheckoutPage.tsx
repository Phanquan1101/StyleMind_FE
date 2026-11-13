import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { paymentApi, paymentErrorMessage } from '@/features/payments/api/paymentClient'
import type { PaymentAttempt, QrCheckout } from '@/features/payments/api/types'
import { rememberOrder } from '@/features/payments/model/orderReferences'
import { loadAccountDraft, saveAccountDraft } from '../model/accountCheckout'
import { loadGuestDraft, saveGuestDraft } from '../model/guestCheckout'
import { readGuestSessionKey } from '@/features/cart/model/guestSession'
import { guestCheckoutApi } from '../data/guestCheckoutApi'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { readQrPayment, rememberQrPayment, type RememberedQrPayment } from '../model/qrPaymentMemory'
import { ROUTES } from '@/app/router/routes'
import { Button } from '@/shared/ui'

export default function QrCheckoutPage({ guest = false }: { guest?: boolean }) {
  const { checkoutId = '' } = useParams()
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [checkout, setCheckout] = useState<QrCheckout | null>(null)
  const [attempt, setAttempt] = useState<PaymentAttempt | null>(null)
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [remembered, setRemembered] = useState<RememberedQrPayment | null>(() => readQrPayment(checkoutId))
  const [copied, setCopied] = useState(false)
  const [reviewRequired, setReviewRequired] = useState(false)
  const closed = useRef(false)
  const lastAttemptCheck = useRef(Date.now())
  const owner = currentUser?.id ?? ''
  const guestKey = guest ? readGuestSessionKey() : null

  function releaseCheckoutDraft() {
    if (guest) {
      const draft = loadGuestDraft()
      if (draft.qrCheckoutId !== checkoutId) return
      saveGuestDraft({ checkoutKey: crypto.randomUUID(), address: draft.address, method: draft.method, selection: draft.selection })
    } else {
      const draft = loadAccountDraft(owner)
      if (draft.qrCheckoutId !== checkoutId) return
      saveAccountDraft(owner, { checkoutKey: crypto.randomUUID(), addressId: draft.addressId, method: draft.method, selection: draft.selection })
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    closed.current = false
    lastAttemptCheck.current = Date.now()
    const refresh = async () => {
      try {
        const state = guest ? await guestCheckoutApi.getQr(guestKey, checkoutId, controller.signal) : await paymentApi.getQrCheckout(checkoutId, { signal: controller.signal })
        if (controller.signal.aborted) return
        // Keep monitoring a closed checkout for late payment without restoring a stale QR.
        if (closed.current) {
          if (state.status === 'RECONCILIATION_REQUIRED') setCheckout(state)
          return
        }
        setCheckout(state)
        if (state.status === 'AWAITING_PAYMENT' && Date.now() - lastAttemptCheck.current >= 15000) {
          lastAttemptCheck.current = Date.now()
          // A payment the shop could not match (wrong amount...) takes the attempt out of PENDING while the checkout is still open:
          // the attempt endpoint then answers 409 CHECKOUT_NOT_PAYABLE even though the time has not run out.
          try {
            const latest = await (guest ? guestCheckoutApi.qrAttempt(guestKey, checkoutId, controller.signal) : paymentApi.getQrAttempt(checkoutId, { signal: controller.signal }))
            if (!controller.signal.aborted && !closed.current && latest.status === 'EXCEPTION') setReviewRequired(true)
          } catch (failure) {
            const code = (failure as { code?: string } | null)?.code
            if (!controller.signal.aborted && code === 'CHECKOUT_NOT_PAYABLE' && new Date(state.expiresAt).getTime() > Date.now()) setReviewRequired(true)
          }
        }
        if (state.status === 'ORDER_CREATED') {
          closed.current = true
          if (guest) {
            rememberOrder({ orderId: state.checkoutId, owner: 'guest' })
            const draft = loadGuestDraft()
            if (draft.qrCheckoutId === checkoutId) saveGuestDraft({ ...draft, qrCheckoutId: undefined, orderId: state.checkoutId })
            navigate(`/guest/orders/${encodeURIComponent(state.checkoutId)}`, { replace: true })
          } else {
            rememberOrder({ orderId: state.checkoutId, owner: 'account', accountId: owner })
            const old = loadAccountDraft(owner)
            if (old.qrCheckoutId === checkoutId) saveAccountDraft(owner, { ...old, qrCheckoutId: undefined, orderId: state.checkoutId })
            navigate(ROUTES.paymentOrder.replace(':orderId', encodeURIComponent(state.checkoutId)), { replace: true })
          }
        } else if (['CANCELLED', 'EXPIRED', 'RECONCILIATION_REQUIRED'].includes(state.status)) {
          closed.current = true
          setAttempt(null)
          if (state.status === 'CANCELLED' || state.status === 'EXPIRED') {
            releaseCheckoutDraft()
          }
        }
      } catch (failure) { if (!controller.signal.aborted && !closed.current) setError(paymentErrorMessage(failure)) }
    }
    void refresh()
    void (guest ? guestCheckoutApi.qrAttempt(guestKey, checkoutId, controller.signal) : paymentApi.getQrAttempt(checkoutId, { signal: controller.signal })).then(value => {
      if (!controller.signal.aborted && !closed.current) setAttempt(value)
      if (!controller.signal.aborted && value?.reference) {
        const payment = { reference: value.reference, amountVnd: value.amountVnd, transferContent: value.transferContent }
        rememberQrPayment(checkoutId, payment)
        setRemembered(payment)
      }
    }).catch(failure => { if (!controller.signal.aborted && !closed.current) { setError(paymentErrorMessage(failure)); void refresh() } })
    const poll = setInterval(() => { setNow(Date.now()); void refresh() }, 3000)
    return () => { controller.abort(); clearInterval(poll) }
  }, [checkoutId, owner, navigate, guest, guestKey])

  const cancel = async () => {
    if (cancelling || closed.current) return
    setCancelling(true); setError('')
    try {
      const state = guest ? await guestCheckoutApi.cancelQr(guestKey, checkoutId) : await paymentApi.cancelQrCheckout(checkoutId)
      if (state.status !== 'CANCELLED') throw new Error('Cancellation not confirmed')
      closed.current = true; setCheckout(state); setAttempt(null)
      releaseCheckoutDraft()
    } catch (failure) {
      setError(paymentErrorMessage(failure))
      try { const state = guest ? await guestCheckoutApi.getQr(guestKey, checkoutId) : await paymentApi.getQrCheckout(checkoutId); setCheckout(state) } catch { /* Keep the uncertain result visible. */ }
    } finally { setCancelling(false) }
  }
  const expired = checkout?.status === 'EXPIRED' || (checkout != null && new Date(checkout.expiresAt).getTime() <= now)
  const seconds = checkout ? Math.max(0, Math.floor((new Date(checkout.expiresAt).getTime() - now) / 1000)) : null
  const waiting = !closed.current && !expired && !reviewRequired && attempt?.status !== 'EXCEPTION'
  const reference = attempt?.reference ?? remembered?.reference ?? null
  const vnpay = checkout?.paymentMethod === 'VNPAY' || attempt?.method === 'VNPAY'
  const phase: 'waiting' | 'cancelled' | 'needsReview' | 'expired' = waiting
    ? 'waiting'
    : checkout?.status === 'CANCELLED'
      ? 'cancelled'
      : checkout?.status === 'RECONCILIATION_REQUIRED' || reviewRequired || attempt?.status === 'EXCEPTION'
        ? 'needsReview'
        : 'expired'

  const copyReference = async () => {
    if (!reference) return
    try { await navigator.clipboard.writeText(reference); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* the code is shown and can be selected */ }
  }
  const referenceBox = reference && (
    <div className="mt-5 rounded-xl bg-ivory p-4 text-left text-sm">
      <p className="text-xs text-secondary">Mã tham chiếu thanh toán</p>
      <p className="mt-1 flex flex-wrap items-center gap-3"><span className="select-all break-all font-mono font-semibold">{reference}</span><button type="button" className="text-xs font-semibold underline" onClick={() => void copyReference()}>{copied ? 'Đã sao chép' : 'Sao chép'}</button></p>
      {checkout && <p className="mt-2 text-xs text-secondary">Số tiền: {formatCurrency(checkout.totalVnd)}</p>}
    </div>
  )

  return <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
    <Link className="text-sm underline" to={ROUTES.shop}>← Trở về cửa hàng</Link>
    <header className="mb-7 mt-7"><p className="text-xs font-bold uppercase tracking-widest text-secondary">Thanh toán an toàn</p><h1 className="mt-2 font-display text-4xl">Thanh toán {vnpay ? 'VNPAY' : 'VietQR'}</h1><p className="mt-3 text-sm text-secondary">Đơn hàng được tạo sau khi hệ thống xác nhận đã nhận tiền.</p></header>
    {error && phase === 'waiting' && <p role="alert" className="mb-5 rounded-xl bg-error-bg p-4 text-sm text-error">{error}</p>}
    <div className="grid gap-5 md:grid-cols-[minmax(0,1.5fr)_minmax(240px,1fr)]">
      <section className="rounded-3xl border border-sand bg-white p-6 text-center sm:p-9">
        <p className="text-sm text-secondary">Số tiền cần thanh toán</p><p className="mt-2 font-display text-4xl">{checkout ? formatCurrency(checkout.totalVnd) : '—'}</p>
        {phase === 'waiting' && (vnpay
          ? <div className="mx-auto my-6 max-w-sm rounded-xl bg-ivory p-5 text-sm text-secondary"><p>Thanh toán qua cổng VNPAY. Bạn có thể quay lại đây để theo dõi hoặc hủy phiên trước khi thanh toán thành công.</p>{attempt?.paymentUrl && <Button className="mt-5 w-full" onClick={() => window.location.assign(attempt.paymentUrl!)}>Tiếp tục thanh toán VNPAY</Button>}</div>
          : attempt?.qrPayload ? <img className="mx-auto my-6 w-full max-w-60 rounded-xl" src={attempt.qrPayload} alt="Mã VietQR để thanh toán" /> : <div className="mx-auto my-6 grid min-h-48 max-w-60 place-content-center rounded-xl bg-ivory p-5 text-sm text-secondary">Đang tạo mã thanh toán…</div>)}
        {phase === 'waiting' && <p className="text-sm text-secondary">Thời gian giữ hàng còn lại: {seconds === null ? '—' : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`}</p>}
        {phase === 'waiting' && <Button variant="secondary" className="mt-6 w-full" disabled={cancelling} onClick={() => void cancel()}>{cancelling ? 'Đang hủy…' : 'Hủy thanh toán'}</Button>}
        {phase === 'waiting' && reference && !vnpay && <p className="mt-5 text-xs leading-5 text-secondary">Đã chuyển khoản nhưng chưa thấy cập nhật sau vài phút? Hãy giữ lại biên lai và liên hệ cửa hàng kèm mã tham chiếu <span className="select-all font-mono font-semibold">{reference}</span>.</p>}
        {phase === 'cancelled' && <div role="status" className="mt-6 text-sm leading-6 text-secondary"><p className="font-semibold text-charcoal">Thanh toán đã được hủy.</p><p className="mt-1">Bạn có thể quay lại giỏ hàng để đặt lại. Nếu đã lỡ chuyển khoản, đừng chuyển thêm và liên hệ cửa hàng kèm mã tham chiếu bên dưới.</p>{referenceBox}</div>}
        {phase === 'expired' && <div role="status" className="mt-6 text-sm leading-6 text-secondary"><p className="font-semibold text-charcoal">Mã thanh toán đã hết hạn.</p><p className="mt-1"><strong>Nếu bạn chưa chuyển khoản:</strong> đừng chuyển nữa, hãy quay lại giỏ hàng để đặt lại.</p><p className="mt-1"><strong>Nếu bạn đã chuyển khoản:</strong> hãy giữ lại biên lai và liên hệ cửa hàng kèm mã tham chiếu dưới đây. Cửa hàng sẽ đối soát và xử lý đơn hàng hoặc hoàn tiền cho bạn.</p>{referenceBox}</div>}
        {phase === 'needsReview' && <div role="status" className="mt-6 text-sm leading-6 text-secondary"><p className="font-semibold text-charcoal">Giao dịch đang được cửa hàng đối soát.</p><p className="mt-1">Hệ thống ghi nhận khoản chuyển của bạn nhưng chưa thể tự động tạo đơn (ví dụ chuyển sau khi hết hạn, sai số tiền hoặc sản phẩm không còn hàng). Vui lòng <strong>không chuyển lại</strong>; cửa hàng sẽ đối soát và liên hệ bạn. Bạn có thể chủ động liên hệ kèm mã tham chiếu dưới đây.</p>{referenceBox}</div>}
        {phase !== 'waiting' && <div className="mt-6 flex flex-wrap justify-center gap-3"><Link to={ROUTES.cart} className="inline-flex min-h-11 items-center rounded-lg bg-[#1C1B1B] px-4 text-sm font-semibold text-white">Quay lại giỏ hàng</Link><Link to={ROUTES.orders} className="inline-flex min-h-11 items-center rounded-lg border border-[#C4C7C7] px-4 text-sm font-semibold">Xem đơn hàng</Link></div>}
      </section>
      <aside className="rounded-3xl border border-sand bg-white p-6"><h2 className="font-display text-2xl">{vnpay ? 'Thông tin thanh toán' : 'Thông tin chuyển khoản'}</h2>{vnpay ? <><p className="mt-3 text-sm leading-6 text-secondary">Hoàn tất thanh toán trên trang VNPAY. Khi cổng thanh toán xác nhận, đơn hàng sẽ xuất hiện trong danh sách đơn.</p><p className="mt-6 text-xs leading-5 text-secondary">Nếu bạn chưa thanh toán, có thể hủy phiên để giải phóng hàng đang giữ.</p></> : <><p className="mt-3 text-sm leading-6 text-secondary">Quét mã bằng ứng dụng ngân hàng và giữ nguyên số tiền, nội dung chuyển khoản.</p><p className="mt-6 text-xs text-secondary">Nội dung chuyển khoản</p><p className="mt-2 break-all font-semibold">{attempt?.transferContent ?? remembered?.transferContent ?? (phase === 'waiting' ? 'Đang chuẩn bị…' : '—')}</p><p className="mt-6 text-xs leading-5 text-secondary">Trạng thái tự cập nhật khi hệ thống nhận được xác nhận. Nếu đã chuyển tiền, vui lòng không chuyển lại.</p></>}</aside>
    </div>
  </main>
}
