import { ApiModal } from '@/shared/api/ApiUi'
import { Button } from '@/shared/ui'

interface ConfirmDeleteDialogProps {
  open: boolean
  title: string
  message: string
  busy: boolean
  error: string
  onClose: () => void
  onConfirm: () => void
}

/** Confirmation box shared by "Xóa outfit" (list and detail page) and "Xóa món". */
export function ConfirmDeleteDialog({ open, title, message, busy, error, onClose, onConfirm }: ConfirmDeleteDialogProps) {
  return <ApiModal open={open} title={title} onClose={onClose}>
    <p className="text-sm">{message}</p>
    {error && <p role="alert" className="mt-3 text-sm text-[#A94B4B]">{error}</p>}
    <div className="mt-5 flex justify-end gap-3"><Button variant="ghost" disabled={busy} onClick={onClose}>Hủy</Button><Button variant="danger" loading={busy} onClick={onConfirm}>Xác nhận xóa</Button></div>
  </ApiModal>
}
