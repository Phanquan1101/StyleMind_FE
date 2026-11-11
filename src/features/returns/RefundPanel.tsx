import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Landmark, RefreshCw } from 'lucide-react'
import { Button } from '@/shared/ui'
import RefundReceipt from './RefundReceipt'
import { ApiError } from '@/shared/api/http'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { flowErrorMessage, normalizeReason, refundsApi, refundStatusLabel, type Refund, type RefundDestination, type RefundSource } from './returnsApi'

const blankDestination: RefundDestination = { bank_name: '', account_number: '', account_holder: '' }
const inputClass = 'mt-1 w-full rounded-lg border border-sand-dark bg-white px-3 py-2.5 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
const destinationFields = [
  { name: 'bank_name', label: 'Tên ngân hàng', maxLength: 100 },
  { name: 'account_number', label: 'Số tài khoản', maxLength: 64 },
  { name: 'account_holder', label: 'Chủ tài khoản', maxLength: 150 },
] as const

interface RefundPanelProps {
  source: RefundSource
  sourceId: string
  admin?: boolean
}

export default function RefundPanel({ source, sourceId, admin = false }: RefundPanelProps) {
  const [refund, setRefund] = useState<Refund | null>(null)
  const [missing, setMissing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [bankForm, setBankForm] = useState(blankDestination)
  const [editBank, setEditBank] = useState(false)
  const [destination, setDestination] = useState<RefundDestination | null>(null)
  const [transfer, setTransfer] = useState('')
  const [proof, setProof] = useState('')
  const [showFailureForm, setShowFailureForm] = useState(false)
  const [failureReason, setFailureReason] = useState('')
  const busyRef = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    setMissing(false)
    setDestination(null)
    setBankForm(blankDestination)
    setEditBank(false)
    setTransfer('')
    setProof('')
    setShowFailureForm(false)
    setFailureReason('')
    refundsApi.read(source, sourceId, controller.signal).then(result => {
      if (!controller.signal.aborted) setRefund(result)
    }).catch(failure => {
      if (controller.signal.aborted) return
      setRefund(null)
      if (failure instanceof ApiError && failure.status === 404) setMissing(true)
      else setError(flowErrorMessage(failure, 'Không thể tải thông tin hoàn tiền.'))
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [source, sourceId, reload])

  async function run<T>(operation: () => Promise<T>, onSuccess: (result: T) => void) {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError('')
    try {
      onSuccess(await operation())
    } catch (failure) {
      setError(flowErrorMessage(failure, 'Không thể xử lý yêu cầu hoàn tiền.'))
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  function updateRefund(result: Refund) {
    setRefund(result)
    setMissing(false)
    setDestination(null)
    setBankForm(blankDestination)
    setEditBank(false)
    setTransfer('')
    setProof('')
    setShowFailureForm(false)
    setFailureReason('')
  }

  function saveBank(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = {
      bank_name: bankForm.bank_name.trim(),
      account_number: bankForm.account_number.trim(),
      account_holder: bankForm.account_holder.trim(),
    }
    if (!body.bank_name || !body.account_number || !body.account_holder) return
    void run(() => refundsApi.saveDestination(source, sourceId, body), updateRefund)
  }

  function revealDestination() {
    void run(async () => {
      try {
        return await refundsApi.destination(source, sourceId)
      } catch (failure) {
        if (failure instanceof ApiError && failure.status === 403) {
          throw new Error('Chỉ quản trị viên đang phụ trách khoản hoàn tiền có thể xem tài khoản nhận tiền.')
        }
        throw failure
      }
    }, setDestination)
  }

  function markComplete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!destination || !transfer.trim() || !proof.trim()) return
    void run(() => refundsApi.complete(source, sourceId, {
      transfer_reference: transfer.trim(), proof_reference: proof.trim(),
    }), updateRefund)
  }

  function markFailed(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!destination || !normalizeReason(failureReason)) return
    void run(() => refundsApi.fail(source, sourceId, normalizeReason(failureReason)), updateRefund)
  }

  const status = refund?.status
  const canReload = !loading && !error && status && status !== 'REFUNDED' && !destination && !editBank && !Object.values(bankForm).some(Boolean)
  const statusColor = status === 'REFUNDED' ? 'bg-success-bg text-emerald-800' : status === 'FAILED' ? 'bg-error-bg text-red-800' : 'bg-warning-bg text-warning-ink'
  return (
    <section className="mt-3 min-w-0 space-y-4 rounded-xl border border-divider bg-ivory p-4 text-sm sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-divider pb-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-divider bg-white"><Landmark size={18} aria-hidden="true" /></span>
          <div className="min-w-0">
            <h4 className="font-semibold">Hoàn tiền qua chuyển khoản</h4>
            {!loading && status && <p role="status" className={'mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ' + statusColor}>{refundStatusLabel(status)}</p>}
          </div>
        </div>
        {!loading && refund && <div className="sm:text-right">
          <p className="text-xs text-secondary">Số tiền hoàn</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(refund.amount_vnd)}</p>
        </div>}
      </header>
      {loading && <p role="status">Đang tải khoản hoàn tiền…</p>}
      {error && <div className="space-y-2">
        <p role="alert" className="text-red-700">{error}</p>
        <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => setReload(value => value + 1)}>Tải lại trạng thái hoàn tiền</Button>
      </div>}
      {!loading && missing && <>
        <p>Chưa tạo hồ sơ hoàn tiền cho yêu cầu này.</p>
        <Button type="button" size="sm" disabled={busy} onClick={() => void run(() => refundsApi.prepare(source, sourceId), updateRefund)}>
          {busy ? 'Đang chuẩn bị…' : 'Chuẩn bị hồ sơ hoàn tiền'}
        </Button>
      </>}
      {!loading && status && <>
        {(refund.transfer_reference || refund.refunded_at) && <dl className="grid gap-3 rounded-xl border border-divider bg-white p-4 sm:grid-cols-2">
          {refund.transfer_reference && <div className="min-w-0"><dt className="text-xs text-secondary">Mã giao dịch</dt><dd className="mt-1 break-all font-medium">{refund.transfer_reference}</dd></div>}
          {refund.refunded_at && <div><dt className="text-xs text-secondary">Thời gian hoàn tiền</dt><dd className="mt-1 font-medium"><time dateTime={refund.refunded_at}>{new Date(refund.refunded_at).toLocaleString('vi-VN')}</time></dd></div>}
        </dl>}
        {refund.failure_reason && <p className="whitespace-pre-wrap break-words rounded-lg bg-error-bg p-3 text-red-800">{refund.failure_reason}</p>}
        <RefundReceipt key={source + sourceId} source={source} sourceId={sourceId} refund={refund} admin={admin} onSaved={setRefund} />
        {admin && status === 'PENDING' && <p className="text-secondary">Khách đã gửi tài khoản nhận tiền. Bấm Bắt đầu hoàn tiền, sau đó Xem tài khoản nhận tiền để đọc thông tin chuyển khoản.</p>}

        {!admin && status === 'PENDING' && !editBank && <Button type="button" size="sm" variant="secondary" onClick={() => setEditBank(true)}>Cập nhật tài khoản nhận tiền</Button>}
        {!admin && (status === 'AWAITING_DETAILS' || (status === 'PENDING' && editBank)) && (
          <form className="grid max-w-2xl gap-3 rounded-xl border border-divider bg-white p-4 sm:grid-cols-2" onSubmit={saveBank}>
            <p className="text-secondary sm:col-span-2">Nhập tài khoản ngân hàng để cửa hàng chuyển khoản hoàn tiền.</p>
            {destinationFields.map(({ name, label, maxLength }) => (
              <label key={name} className={name === 'account_holder' ? 'min-w-0 font-semibold sm:col-span-2' : 'min-w-0 font-semibold'}>
                {label}
                <input className={inputClass} autoComplete="off" required maxLength={maxLength} disabled={busy} value={bankForm[name]}
                  onChange={event => setBankForm({ ...bankForm, [name]: event.target.value })} />
              </label>
            ))}
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button type="submit" size="sm" disabled={busy || !Object.values(bankForm).every(value => value.trim())}>
                {busy ? 'Đang lưu…' : 'Lưu tài khoản nhận tiền'}
              </Button>
              {editBank && <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => { setEditBank(false); setBankForm(blankDestination) }}>Đóng</Button>}
            </div>
          </form>
        )}

        {admin && (status === 'PENDING' || status === 'FAILED') && <>
          {status === 'FAILED' && <p className="text-secondary">Đối chiếu giao dịch tại ngân hàng trước khi thử chuyển khoản lại.</p>}
          <Button type="button" size="sm" disabled={busy} onClick={() => void run(() => refundsApi.start(source, sourceId), updateRefund)}>
            {busy ? 'Đang xử lý…' : status === 'FAILED' ? 'Xử lý lại hoàn tiền' : 'Bắt đầu hoàn tiền'}
          </Button>
        </>}
        {admin && status === 'PROCESSING' && !destination && (
          <Button type="button" size="sm" variant="secondary" disabled={busy}
            onClick={revealDestination}>
            {busy ? 'Đang xác minh quyền xem…' : 'Xem tài khoản nhận tiền'}
          </Button>
        )}
        {admin && status === 'PROCESSING' && destination && <div className="grid gap-3 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-3 self-start rounded-xl border border-divider bg-white p-4">
          <h5 className="font-semibold">Tài khoản nhận tiền</h5>
          <dl className="grid gap-3">
            {destinationFields.map(({ name, label }) => (
              <div key={name}>
                <dt className="text-xs text-secondary">{label}</dt>
                <dd className="mt-1 break-words font-medium">{destination[name]}</dd>
              </div>
            ))}
          </dl>
          <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => {
            setDestination(null); setTransfer(''); setProof(''); setShowFailureForm(false); setFailureReason('')
          }}>Ẩn tài khoản nhận tiền</Button>
          </div>
          {showFailureForm ? (
            <form className="grid min-w-0 content-start gap-3 rounded-xl border border-divider bg-white p-4" onSubmit={markFailed}>
              <label className="font-semibold">Lý do chuyển khoản thất bại
                <textarea className={inputClass} maxLength={500} required disabled={busy} value={failureReason}
                  onChange={event => setFailureReason(event.target.value)} />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" size="sm" variant="danger-soft" disabled={busy || !normalizeReason(failureReason)}>Xác nhận chuyển khoản thất bại</Button>
                <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => setShowFailureForm(false)}>Đóng</Button>
              </div>
            </form>
          ) : (
            <form className="grid min-w-0 content-start gap-3 rounded-xl border border-divider bg-white p-4" onSubmit={markComplete}>
              <h5 className="font-semibold">Ghi nhận kết quả chuyển khoản</h5>
              <p className="text-secondary">Sau khi chuyển khoản tại ngân hàng, nhập mã giao dịch và mã chứng từ để ghi nhận kết quả.</p>
              <label className="font-semibold">Mã giao dịch chuyển khoản
                <input className={inputClass} maxLength={160} required disabled={busy} value={transfer} onChange={event => setTransfer(event.target.value)} />
              </label>
              <label className="font-semibold">Mã chứng từ
                <input className={inputClass} maxLength={160} required disabled={busy} value={proof} onChange={event => setProof(event.target.value)} />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" size="sm" disabled={busy || !transfer.trim() || !proof.trim()}>
                  {busy ? 'Đang ghi nhận…' : 'Xác nhận đã chuyển khoản'}
                </Button>
                <Button type="button" size="sm" variant="danger-soft" disabled={busy} onClick={() => setShowFailureForm(true)}>Ghi nhận chuyển khoản thất bại</Button>
              </div>
            </form>
          )}
        </div>}
      </>}
      {canReload && (
        <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => setReload(value => value + 1)}>
          <RefreshCw size={14} aria-hidden="true" /> Tải lại trạng thái hoàn tiền
        </Button>
      )}
    </section>
  )
}
