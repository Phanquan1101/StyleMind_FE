import { Button, Modal } from '@/shared/ui'

interface ConfirmDeleteOutfitDialogProps {
  open: boolean
  outfitName: string
  deleting: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDeleteOutfitDialog({ open, outfitName, deleting, onConfirm, onClose }: ConfirmDeleteOutfitDialogProps) {
  return (
    <Modal
      open={open}
      title="Xóa outfit"
      description={`Bạn có chắc muốn xóa "${outfitName}"? Thao tác này không thể hoàn tác.`}
      onClose={deleting ? () => undefined : onClose}
      footer={
        <>
          <Button variant="secondary" disabled={deleting} onClick={onClose}>
            Hủy
          </Button>
          <Button variant="danger" loading={deleting} onClick={onConfirm}>
            Xóa outfit
          </Button>
        </>
      }
    >
      <p className="text-sm leading-6 text-[#3A3632]">Tất cả món trong outfit này sẽ bị gỡ khỏi tủ đồ của bạn.</p>
    </Modal>
  )
}
