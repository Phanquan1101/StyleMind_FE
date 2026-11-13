type AttentionTone = 'warning' | 'success' | 'neutral' | 'accent'

interface AttentionInput {
  fulfillment: string
  pendingCancellation?: boolean
  returnStatus?: string | null
  refundStatus?: string | null
  needsConfirmation?: boolean
}

export function projectAdminOrderAttention(input: AttentionInput): { label: string; tone: AttentionTone } {
  if (input.pendingCancellation) return { label: 'Chờ duyệt hủy', tone: 'warning' }
  if (input.refundStatus === 'REFUNDED') return { label: 'Đã hoàn tiền', tone: 'success' }
  if (input.refundStatus === 'PARTIALLY_REFUNDED') return { label: 'Đã hoàn tiền một phần', tone: 'success' }
  if (input.returnStatus === 'REFUNDED' && input.refundStatus === 'PARTIALLY_REFUNDED') {
    return { label: 'Đã hoàn tiền một phần', tone: 'success' }
  }

  const returnLabels: Record<string, string> = {
    REQUESTED: 'Chờ duyệt trả hàng',
    MORE_IMAGES_REQUESTED: 'Chờ khách bổ sung ảnh',
    PICKUP_APPROVED: 'Chờ lấy hàng',
    PENDING_REFUND: 'Chờ hoàn tiền',
    REFUNDED: 'Đã hoàn tiền',
  }
  const returnLabel = input.returnStatus ? returnLabels[input.returnStatus] : undefined
  if (returnLabel) return { label: returnLabel, tone: input.returnStatus === 'REFUNDED' ? 'success' : 'warning' }

  if (input.refundStatus === 'PENDING_REFUND') return { label: 'Chờ hoàn tiền', tone: 'warning' }
  if (input.needsConfirmation) return { label: 'Chờ xác nhận', tone: 'warning' }
  return { label: input.fulfillment, tone: input.fulfillment === 'Đã giao hàng' || input.fulfillment === 'Hoàn tất' ? 'success' : 'neutral' }
}
