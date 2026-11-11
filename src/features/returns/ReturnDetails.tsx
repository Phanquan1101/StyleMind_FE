import { useEffect, useState } from 'react'
import { ChevronDown, History, Images } from 'lucide-react'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { returnsApi, returnStatusLabels, returnVariantLabel, type ReturnRequest, type ReturnStatus } from './returnsApi'

const statusColors: Record<ReturnStatus, string> = {
  REQUESTED: 'bg-warning-bg text-warning-ink',
  MORE_IMAGES_REQUESTED: 'bg-warning-bg text-warning-ink',
  PICKUP_APPROVED: 'bg-sand text-charcoal',
  REJECTED: 'bg-error-bg text-red-800',
  PENDING_REFUND: 'bg-warning-bg text-warning-ink',
  REFUNDED: 'bg-success-bg text-emerald-800',
}

export function ReturnStatusBadge({ status }: { status: ReturnStatus }) {
  return (
    <span className={'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ' + statusColors[status]}>
      <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
      {returnStatusLabels[status]}
    </span>
  )
}

function EvidenceImage({ returnId, imageId, index }: { returnId: string; imageId: string; index: number }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    let objectUrl = ''
    setUrl('')
    setError(false)
    returnsApi.evidence(returnId, imageId, controller.signal).then(blob => {
      if (controller.signal.aborted) return
      if (!['image/jpeg', 'image/png'].includes(blob?.type)) throw new Error('Unsupported image')
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    }).catch(() => {
      if (!controller.signal.aborted) setError(true)
    })
    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [returnId, imageId])

  const label = 'Ảnh sản phẩm ' + (index + 1)
  if (error) return <p role="alert" className="text-sm text-red-700">Không tải được {label.toLowerCase()}.</p>
  if (!url) return <p role="status" className="text-sm text-secondary">Đang tải {label.toLowerCase()}…</p>
  return (
    <a href={url} target="_blank" rel="noreferrer" aria-label={'Mở ' + label.toLowerCase()} className="block rounded-lg focus-visible:ring-2 focus-visible:ring-accent">
      <img src={url} alt={label} className="h-32 w-full rounded-lg border border-sand bg-white object-contain" />
    </a>
  )
}

export default function ReturnDetails({ request }: { request: ReturnRequest }) {
  const [showImages, setShowImages] = useState(false)
  return (
    <div className="min-w-0 space-y-3 text-sm">
      {request.items.length > 0 && <ul aria-label="Sản phẩm trả" className="divide-y divide-divider rounded-xl border border-divider bg-ivory px-3 sm:px-4">
        {request.items.map(item => {
          const variant = returnVariantLabel(item)
          return (
            <li key={item.order_item_id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
              <div className="min-w-0">
                <p className="break-words font-medium">{item.product_name}</p>
                <p className="mt-1 break-words text-xs text-secondary">{variant && variant + ' · '}Số lượng {item.quantity}</p>
              </div>
              <span className="font-semibold tabular-nums">{formatCurrency(item.unit_price_vnd * item.quantity)}</span>
            </li>
          )
        })}
      </ul>}
      <dl className={request.decision_reason ? 'grid gap-3 sm:grid-cols-2' : undefined}>
        <div className="min-w-0 rounded-xl border border-divider p-3">
          <dt className="font-semibold">Lý do trả hàng</dt>
          <dd className="mt-1 whitespace-pre-wrap break-words text-secondary">{request.reason}</dd>
        </div>
        {request.decision_reason && <div className="min-w-0 rounded-xl bg-ivory p-3">
          <dt className="font-semibold">Phản hồi từ cửa hàng</dt>
          <dd className="mt-1 whitespace-pre-wrap break-words text-secondary">{request.decision_reason}</dd>
        </div>}
      </dl>
      {request.evidence.length > 0 && (
        <div>
          <button type="button" aria-expanded={showImages} onClick={() => setShowImages(!showImages)}
            className="inline-flex items-center gap-2 rounded-lg px-2 py-2 font-semibold text-accent hover:bg-sand focus-visible:ring-2 focus-visible:ring-accent">
            <Images size={16} aria-hidden="true" />
            {showImages ? 'Ẩn ảnh sản phẩm' : 'Xem ảnh sản phẩm (' + request.evidence.length + ')'}
          </button>
          {showImages && <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {request.evidence.map(({ image_id }, index) => <EvidenceImage key={image_id} returnId={request.return_id} imageId={image_id} index={index} />)}
          </div>}
        </div>
      )}
      {!!request.history?.length && <details className="group rounded-xl border border-divider px-3">
        <summary className="flex cursor-pointer list-none items-center gap-2 py-3 font-semibold focus-visible:ring-2 focus-visible:ring-accent [&::-webkit-details-marker]:hidden">
          <History size={16} aria-hidden="true" /> Lịch sử yêu cầu
          <ChevronDown size={16} className="ml-auto group-open:rotate-180" aria-hidden="true" />
        </summary>
        <ol className="mb-3 ml-2 space-y-3 border-l border-sand-dark pl-4">
          {request.history.map((event, index) => (
            <li key={event.changed_at + '-' + index} className="relative before:absolute before:top-1.5 before:-left-5 before:size-2 before:rounded-full before:bg-sand-dark">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-medium">{returnStatusLabels[event.status]}</span>
                <time dateTime={event.changed_at} className="text-xs text-secondary">{new Date(event.changed_at).toLocaleString('vi-VN')}</time>
              </div>
              {event.reason && <p className="whitespace-pre-wrap break-words text-secondary">{event.reason}</p>}
            </li>
          ))}
        </ol>
      </details>}
    </div>
  )
}
