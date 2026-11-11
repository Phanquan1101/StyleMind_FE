  import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { ImagePlus, RefreshCw, RotateCcw, X } from 'lucide-react'
import { Button } from '@/shared/ui'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import RefundPanel from './RefundPanel'
import ReturnDetails, { ReturnStatusBadge } from './ReturnDetails'
import { flowErrorMessage, normalizeReason, returnReasonLimit, returnsApi, returnVariantLabel, type OrderReturns, type ReturnRequest } from './returnsApi'

const reasonSuggestions = ['Sản phẩm lỗi', 'Giao sai mẫu, màu hoặc kích cỡ', 'Thiếu sản phẩm', 'Kích cỡ không phù hợp', 'Lý do khác']
const imageSizeLimit = 1024 * 1024

function PhotoPreview({ file, disabled, onRemove }: { file: File; disabled: boolean; onRemove: () => void }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (typeof URL.createObjectURL !== 'function') return
    const previewUrl = URL.createObjectURL(file)
    setUrl(previewUrl)
    return () => URL.revokeObjectURL(previewUrl)
  }, [file])

  return (
    <li className="relative min-w-0 overflow-hidden rounded-lg border border-divider bg-white">
      <div className="grid aspect-square place-items-center bg-ivory">
        {url ? <img src={url} alt="" className="size-full object-cover" /> : <ImagePlus size={20} aria-hidden="true" />}
      </div>
      <p className="truncate px-2 py-1.5 text-xs text-secondary" title={file.name}>{file.name}</p>
      <button type="button" disabled={disabled} onClick={onRemove} aria-label={'Bỏ ảnh ' + file.name}
        className="absolute top-1.5 right-1.5 grid size-8 place-items-center rounded-full border border-divider bg-white text-accent focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50">
        <X size={15} aria-hidden="true" />
      </button>
    </li>
  )
}

function PhotosInput({ label, files, limit = 5, disabled, onChange }: {
  label: string; files: File[]; limit?: number; disabled: boolean; onChange: (files: File[]) => void
}) {
  const [error, setError] = useState('')
  const hintId = useId()
  return (
    <div className="space-y-2">
      <label className="flex min-h-24 cursor-pointer flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-dashed border-sand-dark bg-ivory px-4 py-3 text-sm transition-colors hover:bg-sand focus-within:ring-2 focus-within:ring-accent has-disabled:cursor-default has-disabled:opacity-60">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-divider bg-white"><ImagePlus size={19} aria-hidden="true" /></span>
        <span className="min-w-0">
          <span className="block font-semibold">{label}</span>
          <span id={hintId} className="mt-1 block text-xs text-secondary">JPG hoặc PNG · Tối đa {limit} ảnh, 1 MB mỗi ảnh</span>
        </span>
        <span className="ml-auto rounded-lg border border-divider bg-white px-3 py-1.5 text-xs font-semibold" aria-hidden="true">Chọn ảnh</span>
        <input type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" multiple disabled={disabled}
          aria-label={label} aria-describedby={hintId} className="sr-only"
          onChange={event => {
            const selected = Array.from(event.target.files ?? [])
            const invalid = files.length + selected.length > limit ? 'Chọn tối đa ' + limit + ' ảnh.' :
              selected.some(file => !['image/jpeg', 'image/png'].includes(file.type) || file.size < 1 || file.size > imageSizeLimit)
                ? 'Mỗi ảnh phải là JPG hoặc PNG và có dung lượng tối đa 1 MB.' : ''
            setError(invalid)
            if (!invalid && selected.length) onChange([...files, ...selected])
            event.target.value = ''
          }} />
      </label>
      {files.length > 0 && <ul className="grid max-w-lg grid-cols-3 gap-2 sm:grid-cols-5" aria-label="Ảnh đã chọn">
        {files.map((file, index) => <PhotoPreview key={file.name + '-' + index} file={file} disabled={disabled}
          onRemove={() => { setError(''); onChange(files.filter((_, position) => position !== index)) }} />)}
      </ul>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  )
}

function SupplementalEvidence({ request, onUpdated }: { request: ReturnRequest; onUpdated: (request: ReturnRequest) => void }) {
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submitting = useRef(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!files.length || submitting.current) return
    submitting.current = true
    setBusy(true)
    setError('')
    try {
      onUpdated(await returnsApi.addEvidence(request.return_id, files))
      setFiles([])
    } catch (failure) {
      setError(flowErrorMessage(failure, 'Không thể gửi ảnh bổ sung.'))
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl bg-[#FBF9F9] p-4">
      <PhotosInput label="Ảnh bổ sung" files={files} disabled={busy} onChange={setFiles} />
      <div><Button type="submit" size="sm" disabled={busy || !files.length}>{busy ? 'Đang gửi ảnh…' : 'Gửi ảnh bổ sung'}</Button></div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </form>
  )
}

export default function CustomerReturns({ orderId }: { orderId: string }) {
  const [data, setData] = useState<OrderReturns | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [reload, setReload] = useState(0)
  const [open, setOpen] = useState(false)
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [reason, setReason] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)
  const requestKey = useRef<{ key: string; body: string; files: File[] } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setLoadError('')
    returnsApi.order(orderId, controller.signal).then(result => {
      if (!controller.signal.aborted) setData(result)
    }).catch(failure => {
      if (!controller.signal.aborted) setLoadError(flowErrorMessage(failure, 'Không thể tải yêu cầu trả hàng.'))
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [orderId, reload])

  const selectedLines = data?.available_items.filter(item => Object.prototype.hasOwnProperty.call(quantities, item.order_item_id)) ?? []
  const items = selectedLines.map(item => ({ order_item_id: item.order_item_id, quantity: Number(quantities[item.order_item_id]) }))
  const invalidQuantity = items.some((item, index) => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > selectedLines[index].quantity)
  const estimatedAmount = invalidQuantity ? null : items.reduce((total, item, index) => total + item.quantity * selectedLines[index].unit_price_vnd, 0)
  const canSubmit = data?.eligible && !loading && !loadError && items.length > 0 && !invalidQuantity && normalizeReason(reason) && files.length > 0

  function setSelectedQuantity(id: string, value?: string) {
    setQuantities(current => {
      const next = { ...current }
      if (value === undefined) delete next[id]
      else next[id] = value
      return next
    })
  }

  function updateRequest(request: ReturnRequest) {
    setData(current => {
      if (!current) return current
      if (current.items.some(item => item.return_id === request.return_id)) {
        return { ...current, items: current.items.map(item => item.return_id === request.return_id ? request : item) }
      }
      return { ...current, items: [request, ...current.items] }
    })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current || !canSubmit) return
    submitting.current = true
    setBusy(true)
    setError('')
    const draft = { reason: normalizeReason(reason), items }
    const body = JSON.stringify(draft)
    const previous = requestKey.current
    const key = previous?.body === body && previous.files.length === files.length && previous.files.every((file, index) => file === files[index])
      ? previous.key : crypto.randomUUID()
    requestKey.current = { key, body, files }
    try {
      updateRequest(await returnsApi.submit(orderId, { request_key: key, ...draft }, files))
      requestKey.current = null
      setOpen(false)
      setQuantities({})
      setReason('')
      setFiles([])
      setReload(value => value + 1)
    } catch (failure) {
      setError(flowErrorMessage(failure, 'Không thể gửi yêu cầu trả hàng.'))
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  return (
    <section className="space-y-5 rounded-2xl border border-divider bg-white p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-canvas text-accent"><RotateCcw size={19} aria-hidden="true" /></span>
          <div>
            <h2 className="font-display text-2xl">Trả hàng</h2>
            <p className="mt-1 text-sm leading-6 text-secondary">Gửi yêu cầu trong vòng 7 ngày kể từ khi đơn giao thành công.</p>
          </div>
        </div>
        {!loading && !loadError && data?.eligible && !open && (
          <Button type="button" size="sm" onClick={() => setOpen(true)}>Yêu cầu trả hàng</Button>
        )}
      </header>
      {loading && <p role="status" className="text-sm text-secondary">Đang tải thông tin trả hàng…</p>}
      {loadError && <p role="alert" className="text-sm text-red-700">{loadError}</p>}
      {!loading && !loadError && data && !data.eligible && <p className="rounded-xl bg-ivory px-4 py-3 text-sm text-secondary">{data.ineligible_reason === 'PAYMENT_NOT_CONFIRMED' ? 'Đơn đã giao nhưng hệ thống chưa xác nhận khoản thu. Vui lòng liên hệ cửa hàng xác nhận thu COD, sau đó tải lại trang.' : data.ineligible_reason === 'RETURN_WINDOW_EXPIRED' ? 'Đơn hàng đã quá thời hạn trả hàng 7 ngày.' : data.ineligible_reason === 'NOT_DELIVERED' ? 'Bạn có thể yêu cầu trả hàng sau khi đơn được giao thành công.' : 'Đơn hàng hiện không còn sản phẩm đủ điều kiện trả.'}</p>}
      {open && data?.eligible && !loadError && (
        <form onSubmit={submit} className="grid gap-5 rounded-xl border border-divider p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(230px,0.46fr)]">
          <div className="grid min-w-0 gap-5">
          <fieldset className="grid min-w-0 gap-2" disabled={busy || loading}>
            <legend className="mb-3 text-base font-semibold">Chọn sản phẩm cần trả</legend>
            {data.available_items.map(item => {
              const selected = Object.prototype.hasOwnProperty.call(quantities, item.order_item_id)
              const variant = returnVariantLabel(item)
              return (
                <div key={item.order_item_id} className={'flex flex-wrap items-center gap-3 rounded-xl border p-3 text-sm ' + (selected ? 'border-sand-dark bg-ivory' : 'border-divider')}>
                  <label className="flex min-w-0 flex-1 basis-48 cursor-pointer items-start gap-3">
                    <input type="checkbox" checked={selected} onChange={event => setSelectedQuantity(item.order_item_id, event.target.checked ? '1' : undefined)}
                      aria-label={variant ? item.product_name + ' (' + variant + ')' : item.product_name}
                      className="mt-0.5 size-4 shrink-0 accent-accent" />
                    <span className="min-w-0">
                      <span className="block break-words font-semibold">{item.product_name}</span>
                      {variant && <span className="mt-1 block break-words text-xs text-secondary">{variant}</span>}
                      <span className="mt-1 block text-xs text-secondary">{formatCurrency(item.unit_price_vnd)} · Có thể trả {item.quantity}</span>
                    </span>
                  </label>
                  {selected && <label className="flex items-center gap-2 text-xs font-medium text-secondary">
                    Số lượng
                    <input type="number" min={1} max={item.quantity} step={1} value={quantities[item.order_item_id]}
                      aria-label={'Số lượng ' + item.product_name + (variant ? ' (' + variant + ')' : '')} onChange={event => setSelectedQuantity(item.order_item_id, event.target.value)}
                      className="w-16 rounded-lg border border-sand-dark bg-white px-2 py-1.5 text-sm text-charcoal" required />
                  </label>}
                </div>
              )
            })}
          </fieldset>
          <div className="grid min-w-0 gap-2">
            <p className="text-xs font-medium text-secondary" aria-hidden="true">Gợi ý lý do</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Gợi ý lý do">
              {reasonSuggestions.map(suggestion => <button key={suggestion} type="button" disabled={busy}
                aria-pressed={reason === suggestion} onClick={() => setReason(suggestion)}
                className="rounded-full border border-divider px-3 py-1.5 text-sm hover:bg-sand focus-visible:ring-2 focus-visible:ring-accent aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-white">
                {suggestion}
              </button>)}
            </div>
            <label className="grid gap-2 text-sm font-semibold">Lý do trả hàng
              <textarea className="min-h-24 rounded-lg border border-sand-dark bg-white p-3 font-normal" maxLength={returnReasonLimit} required disabled={busy}
                value={reason} onChange={event => setReason(event.target.value)} />
            </label>
          </div>
          <PhotosInput label="Ảnh sản phẩm" files={files} disabled={busy} onChange={setFiles} />
          </div>
          <div className="space-y-4 self-start rounded-xl border border-divider bg-ivory p-4">
          <h3 className="font-semibold">Tóm tắt yêu cầu</h3>
          <p className="text-sm text-secondary">{items.length ? `Đã chọn ${items.length} dòng sản phẩm` : 'Chưa chọn sản phẩm'}</p>
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-divider pt-3">
            <span className="text-sm text-secondary">Tiền hoàn dự kiến</span>
            <output className="font-semibold tabular-nums">{items.length > 0 && estimatedAmount !== null ? formatCurrency(estimatedAmount) : '—'}</output>
          </div>
          <p className="text-xs leading-5 text-secondary">Cửa hàng sẽ đến lấy và kiểm tra hàng trước khi hoàn tiền.</p>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="grid gap-2">
            <Button type="submit" size="sm" disabled={!canSubmit || busy}>{busy ? 'Đang gửi…' : 'Gửi yêu cầu trả hàng'}</Button>
            <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => { setOpen(false); setFiles([]); setError('') }}>Đóng</Button>
          </div>
          </div>
        </form>
      )}
      {data?.items.map(request => (
        <article key={request.return_id} className="space-y-4 rounded-xl border border-divider p-4 sm:p-5">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-divider pb-3">
            <h3><ReturnStatusBadge status={request.status} /></h3>
            <time dateTime={request.created_at} className="text-xs text-secondary">{new Date(request.created_at).toLocaleString('vi-VN')}</time>
          </header>
          <ReturnDetails request={request} />
          {request.status === 'MORE_IMAGES_REQUESTED' && <SupplementalEvidence request={request} onUpdated={updateRequest} />}
          {['PENDING_REFUND', 'REFUNDED'].includes(request.status) && <RefundPanel source="RETURN" sourceId={request.return_id} />}
        </article>
      ))}
      {!loading && !busy && (loadError || !!data?.items.length) && (
        <Button type="button" variant="secondary" size="sm" onClick={() => setReload(value => value + 1)}>
          <RefreshCw size={14} aria-hidden="true" /> Tải lại yêu cầu trả hàng
        </Button>
      )}
    </section>
  )
}
