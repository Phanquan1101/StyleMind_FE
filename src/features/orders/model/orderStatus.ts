export const orderStatusLabels: Record<string, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán', PLACED: 'Đã đặt hàng', PAID: 'Đã thanh toán',
  PROCESSING: 'Đang chuẩn bị', SHIPPED: 'Đang giao hàng', COMPLETED: 'Đã hoàn tất', CANCELLED: 'Đã hủy',
}
export const orderStatusLabel = (status: string) => orderStatusLabels[status] ?? 'Trạng thái chưa xác định'

export const customerOrderStatusLabels: Record<string, string> = { ...orderStatusLabels, COMPLETED: 'Đã giao hàng' }
export const customerOrderStatusLabel = (status: string) => customerOrderStatusLabels[status] ?? 'Trạng thái chưa xác định'
