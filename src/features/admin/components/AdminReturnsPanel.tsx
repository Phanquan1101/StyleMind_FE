import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { PackageOpen, RefreshCw, RotateCcw } from 'lucide-react'
import { Button } from '@/shared/ui'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import RefundPanel from '@/features/returns/RefundPanel'
import ReturnDetails, { ReturnStatusBadge } from '@/features/returns/ReturnDetails'
import { flowErrorMessage, normalizeReason, returnReasonLimit, returnsApi, type ReturnAction, type ReturnPage, type ReturnRequest } from '@/features/returns/returnsApi'

const actions = {
  REQUEST_IMAGES: { label: 'Yêu cầu thêm ảnh', confirm: 'Xác nhận yêu cầu thêm ảnh', reasonRequired: true },
  APPROVE_PICKUP: { label: 'Duyệt lấy hàng', confirm: 'Xác nhận duyệt lấy hàng', reasonRequired: false },
  REJECT: { label: 'Từ chối trả hàng', confirm: 'Xác nhận từ chối trả hàng', reasonRequired: true },
  PASS_INSPECTION: { label: 'Kiểm định đạt', confirm: 'Xác nhận kiểm định đạt', reasonRequired: false },
  FAIL_INSPECTION: { label: 'Kiểm định không đạt', confirm: 'Xác nhận kiểm định không đạt', reasonRequired: true },
} satisfies Record<ReturnAction, { label: string; confirm: string; reasonRequired: boolean }>

function availableActions(status: ReturnRequest['status']): ReturnAction[] {
  switch (status) {
    case 'REQUESTED': return ['APPROVE_PICKUP', 'REQUEST_IMAGES', 'REJECT']
    case 'PICKUP_APPROVED': return ['PASS_INSPECTION', 'FAIL_INSPECTION']
    default: return []
  }
}

function ReturnReview({ request, onUpdated }: { request: ReturnRequest; onUpdated: (request: ReturnRequest) => void }) {
  const [decision, setDecision] = useState<ReturnAction | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const locked = useRef(false)
  const allowed = availableActions(request.status)
  const action = decision && allowed.includes(decision) ? actions[decision] : null
  const showRefund = request.status === 'PENDING_REFUND' || request.status === 'REFUNDED'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (locked.current || !decision || !action || (action.reasonRequired && !normalizeReason(reason))) return
    locked.current = true
    setBusy(true)
    setError('')
    try {
      onUpdated(await returnsApi.decide(request.return_id, decision, normalizeReason(reason)))
      setDecision(null)
      setReason('')
    } catch (failure) {
      setError(flowErrorMessage(failure, 'Không thể xử lý yêu cầu trả hàng.'))
    } finally {
      locked.current = false
      setBusy(false)
    }
  }

  return (
    <article className="grid min-w-0 gap-4 rounded-2xl border border-divider bg-white p-4 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-divider pb-4">
        <div className="min-w-0">
          <p className="text-xs text-secondary">Đơn hàng</p>
          <h3 className="font-semibold">
            <Link to={'/admin?section=orders&orderId=' + encodeURIComponent(request.order_id)} className="break-words text-accent underline-offset-2 hover:underline">
              {request.order_number || request.order_id}
            </Link>
          </h3>
          <time className="mt-1 block text-xs text-secondary" dateTime={request.created_at}>{new Date(request.created_at).toLocaleString('vi-VN')}</time>
        </div>
        <ReturnStatusBadge status={request.status} />
      </header>
      <div className={showRefund ? undefined : 'grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(230px,0.52fr)]'}>
        <ReturnDetails request={request} />
        {!showRefund && <div className="min-w-0 space-y-3 self-start rounded-xl border border-divider bg-ivory p-4">
          <p className="text-sm text-secondary">Giá trị hàng trả</p>
          <p className="text-xl font-semibold tabular-nums">{formatCurrency(request.amount_vnd)}</p>
          {allowed.length > 0 && <div className="flex flex-wrap gap-2 border-t border-divider pt-3">
            {allowed.map(key => (
              <Button type="button" size="sm" variant={key === allowed[0] ? 'primary' : 'secondary'} key={key}
                aria-expanded={decision === key} disabled={busy}
                onClick={() => { setDecision(key); setReason(''); setError('') }}>
                {actions[key].label}
              </Button>
            ))}
          </div>}
          {request.status === 'MORE_IMAGES_REQUESTED' && <p className="text-sm text-secondary">Đang chờ khách gửi thêm ảnh.</p>}
        </div>}
      </div>
      {action && <form className="grid gap-3 rounded-xl border border-divider bg-ivory p-4" onSubmit={submit}>
        <h4 className="font-semibold">{action.label}</h4>
        <label className="grid gap-2 text-sm font-semibold">
          {action.reasonRequired ? 'Lý do' : 'Ghi chú (tùy chọn)'}
          <textarea className="min-h-20 rounded-lg border border-[#E3E2E2] bg-white px-3 py-2 font-normal"
            value={reason} maxLength={returnReasonLimit} required={action.reasonRequired} disabled={busy} onChange={event => setReason(event.target.value)} />
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={busy || (action.reasonRequired && !normalizeReason(reason))}>{busy ? 'Đang cập nhật…' : action.confirm}</Button>
          <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => setDecision(null)}>Đóng</Button>
        </div>
      </form>}
      {showRefund && <RefundPanel source="RETURN" sourceId={request.return_id} admin />}
    </article>
  )
}

export default function AdminReturnsPanel() {
  const [data, setData] = useState<ReturnPage | null>(null)
  const [page, setPage] = useState(0)
  const [reload, setReload] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    returnsApi.adminList(page, controller.signal).then(result => {
      if (!controller.signal.aborted) setData(result)
    }).catch(failure => {
      if (!controller.signal.aborted) setError(flowErrorMessage(failure, 'Không thể tải yêu cầu trả hàng.'))
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [page, reload])

  function updateRequest(request: ReturnRequest) {
    setData(current => current ? { ...current, items: current.items.map(item => item.return_id === request.return_id ? request : item) } : current)
  }

  return (
    <section className="grid min-w-0 gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E3E2E2] pb-4">
        <h2 className="flex items-center gap-2 font-display text-2xl"><RotateCcw size={20} aria-hidden="true" /> Trả hàng &amp; Hoàn tiền</h2>
        <Button type="button" variant="secondary" size="sm" disabled={loading} onClick={() => setReload(value => value + 1)}><RefreshCw size={14} aria-hidden="true" /> Tải lại yêu cầu</Button>
      </div>
      {loading && <p role="status" className="text-sm text-secondary">Đang tải yêu cầu trả hàng…</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {!loading && !error && data && <>
        {data.items.length ? <div className="grid gap-3">{data.items.map(request => <ReturnReview key={request.return_id} request={request} onUpdated={updateRequest} />)}</div>
          : <div className="grid justify-items-center gap-2 rounded-xl border border-dashed border-sand-dark bg-white px-5 py-8 text-center text-sm text-secondary">
            <PackageOpen size={24} aria-hidden="true" /> Chưa có yêu cầu trả hàng.
          </div>}
        {data.total_pages > 1 && <nav aria-label="Trang yêu cầu trả hàng" className="flex flex-wrap items-center justify-end gap-3">
          <Button type="button" size="sm" variant="secondary" disabled={data.page <= 0} onClick={() => setPage(data.page - 1)}>Trang trước</Button>
          <span className="text-sm text-secondary">Trang {data.page + 1} / {data.total_pages}</span>
          <Button type="button" size="sm" variant="secondary" disabled={data.page + 1 >= data.total_pages} onClick={() => setPage(data.page + 1)}>Trang sau</Button>
        </nav>}
      </>}
    </section>
  )
}
