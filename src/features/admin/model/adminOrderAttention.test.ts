import { expect, it } from 'vitest'
import { projectAdminOrderAttention } from './adminOrderAttention'

it('prioritizes a pending cancellation over fulfillment and return work', () => {
  expect(projectAdminOrderAttention({
    fulfillment: 'Đang xử lý', pendingCancellation: true, returnStatus: 'PICKUP_APPROVED',
    refundStatus: 'PENDING_REFUND',
  })).toEqual({ label: 'Chờ duyệt hủy', tone: 'warning' })
})

it('shows active return and refund work without erasing fulfilled status', () => {
  expect(projectAdminOrderAttention({ fulfillment: 'Đã giao hàng', returnStatus: 'REQUESTED' }).label).toBe('Chờ duyệt trả hàng')
  expect(projectAdminOrderAttention({ fulfillment: 'Đã giao hàng', returnStatus: 'PICKUP_APPROVED' }).label).toBe('Chờ lấy hàng')
  expect(projectAdminOrderAttention({ fulfillment: 'Đã giao hàng', returnStatus: 'PENDING_REFUND' }).label).toBe('Chờ hoàn tiền')
  expect(projectAdminOrderAttention({ fulfillment: 'Đã giao hàng', returnStatus: 'REJECTED' }).label).toBe('Đã giao hàng')
})

it('keeps a confirmed refund visible when the return list still has an older status', () => {
  expect(projectAdminOrderAttention({ fulfillment: 'Hoàn tất', returnStatus: 'PENDING_REFUND', refundStatus: 'REFUNDED' }))
    .toEqual({ label: 'Đã hoàn tiền', tone: 'success' })
})
