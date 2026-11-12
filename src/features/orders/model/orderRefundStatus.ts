export function orderRefundLabel(status?: string | null): string | null {
  if (status === 'REFUNDED') return 'Đã hoàn tiền'
  if (status === 'PARTIALLY_REFUNDED') return 'Đã hoàn tiền một phần'
  if (status === 'PENDING_REFUND') return 'Đang chờ hoàn tiền'
  return null
}
