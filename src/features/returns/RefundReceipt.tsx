import { useEffect, useRef, useState } from 'react'
import { Button } from '@/shared/ui'
import { flowErrorMessage, refundsApi, type Refund, type RefundSource } from './returnsApi'

export default function RefundReceipt({ source, sourceId, refund, admin, onSaved }: {
  source: RefundSource; sourceId: string; refund: Refund; admin: boolean; onSaved: (value: Refund) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [show, setShow] = useState(false)
  const [image, setImage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)
  const lifetime = useRef<AbortController | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    lifetime.current = controller
    return () => controller.abort()
  }, [])
  useEffect(() => {
    if (!file) { setPreview(''); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  useEffect(() => {
    if (!show || !refund.has_receipt) { setImage(''); return }
    const controller = new AbortController()
    let url = ''
    setError('')
    refundsApi.receipt(source, sourceId, controller.signal).then(blob => {
      if (controller.signal.aborted) return
      if (!['image/jpeg', 'image/png'].includes(blob.type)) throw new Error('Máy chủ trả về ảnh không hợp lệ.')
      url = URL.createObjectURL(blob)
      setImage(url)
    }).catch(failure => { if (!controller.signal.aborted) setError(flowErrorMessage(failure, 'Không tải được ảnh biên nhận.')) })
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url) }
  }, [show, refund.has_receipt, source, sourceId])

  async function save() {
    if (!file || inFlight.current) return
    inFlight.current = true; setBusy(true); setError('')
    try {
      const result = await refundsApi.uploadReceipt(source, sourceId, file)
      if (!lifetime.current?.signal.aborted) { onSaved(result); setFile(null) }
    } catch (failure) {
      if (!lifetime.current?.signal.aborted) setError(flowErrorMessage(failure, 'Không lưu được ảnh biên nhận.'))
    } finally {
      inFlight.current = false
      if (!lifetime.current?.signal.aborted) setBusy(false)
    }
  }

  const canUpload = admin && ['PROCESSING', 'REFUNDED'].includes(refund.status) && !refund.has_receipt
  if (!canUpload && !refund.has_receipt) return null
  return <section className="space-y-3 rounded-xl border border-divider bg-white p-4" aria-label="Biên nhận hoàn tiền">
    <h5 className="font-semibold">Ảnh biên nhận chuyển khoản</h5>
    {canUpload && <>
      <p className="text-xs text-secondary">Một ảnh JPG hoặc PNG, tối đa 5 MB. Chỉ admin phụ trách được lưu ảnh; khách xem sau khi đã hoàn tiền.</p>
      <label className="grid gap-2 text-sm font-medium">Ảnh biên nhận chuyển khoản
        <input type="file" accept="image/jpeg,image/png" disabled={busy} onChange={event => {
          const selected = event.target.files?.[0]
          event.target.value = ''
          if (!selected) return
          if (!['image/jpeg', 'image/png'].includes(selected.type) || selected.size === 0 || selected.size > 5242880) {
            setError('Chọn ảnh JPG hoặc PNG, tối đa 5 MB.'); return
          }
          setError(''); setFile(selected)
        }} className="max-w-full rounded-lg border border-divider p-2 text-sm" />
      </label>
      {preview && <img src={preview} alt="Ảnh biên nhận đang chọn" className="max-h-64 max-w-full rounded-lg object-contain" />}
      {file && <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={busy} onClick={() => void save()}>{busy ? 'Đang lưu ảnh…' : 'Lưu ảnh biên nhận'}</Button>
        <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => setFile(null)}>Bỏ ảnh đang chọn</Button>
      </div>}
    </>}
    {refund.has_receipt && <>
      <Button type="button" size="sm" variant="secondary" onClick={() => setShow(value => !value)}>{show ? 'Ẩn ảnh biên nhận' : 'Xem ảnh biên nhận'}</Button>
      {show && !image && !error && <p role="status">Đang tải ảnh biên nhận…</p>}
      {show && image && <a href={image} target="_blank" rel="noreferrer" aria-label="Mở ảnh biên nhận kích thước đầy đủ"><img src={image} alt="Biên nhận chuyển khoản hoàn tiền" className="max-h-96 max-w-full rounded-lg object-contain" /></a>}
    </>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </section>
}
