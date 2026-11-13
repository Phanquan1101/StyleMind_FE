import { ApiError, apiRequest, isUuid } from '@/shared/api/http'

export type ReturnStatus = 'REQUESTED' | 'MORE_IMAGES_REQUESTED' | 'PICKUP_APPROVED' | 'REJECTED' | 'PENDING_REFUND' | 'REFUNDED'
export type ReturnAction = 'REQUEST_IMAGES' | 'APPROVE_PICKUP' | 'REJECT' | 'PASS_INSPECTION' | 'FAIL_INSPECTION'
export type RefundSource = 'RETURN' | 'CANCELLATION'
export type RefundStatus = 'AWAITING_DETAILS' | 'PENDING' | 'PROCESSING' | 'REFUNDED' | 'FAILED'

export interface ReturnLine {
  order_item_id: string
  product_name: string
  sku_snapshot?: string | null
  color_snapshot?: string | null
  size_snapshot?: string | null
  quantity: number
  unit_price_vnd: number
}

export function returnVariantLabel(item: ReturnLine) {
  const options = [item.color_snapshot, item.size_snapshot].filter(Boolean)
  return options.join(' / ') || item.sku_snapshot || ''
}

export interface ReturnRequest {
  return_id: string
  order_id: string
  order_number: string
  status: ReturnStatus
  reason: string
  decision_reason?: string | null
  amount_vnd: number
  created_at: string
  items: ReturnLine[]
  evidence: { image_id: string }[]
  history?: { status: ReturnStatus; reason?: string | null; changed_at: string }[]
}

export interface OrderReturns {
  eligible: boolean
  ineligible_reason?: string | null
  available_items: ReturnLine[]
  items: ReturnRequest[]
}

export interface ReturnPage {
  items: ReturnRequest[]
  page: number
  size: number
  total_elements: number
  total_pages: number
}

export interface Refund {
  has_receipt?: boolean
  refund_id: string
  completion_id?: string | null
  source_type: RefundSource
  source_id: string
  order_id: string
  amount_vnd: number
  status: RefundStatus
  transfer_reference?: string | null
  failure_reason?: string | null
  refunded_at?: string | null
}

export interface RefundDestination {
  bank_name: string
  account_number: string
  account_holder: string
}

export const returnStatusLabels: Record<ReturnStatus, string> = {
  REQUESTED: 'Đang chờ duyệt trả hàng',
  MORE_IMAGES_REQUESTED: 'Cần bổ sung ảnh',
  PICKUP_APPROVED: 'Đã duyệt lấy hàng',
  REJECTED: 'Đã từ chối trả hàng',
  PENDING_REFUND: 'Đang chờ hoàn tiền sau kiểm định',
  REFUNDED: 'Đã hoàn tiền trả hàng',
}

const refundStatuses: Record<RefundStatus, string> = {
  AWAITING_DETAILS: 'Đang chờ tài khoản nhận tiền',
  PENDING: 'Đang chờ chuyển khoản hoàn tiền',
  PROCESSING: 'Đang xử lý chuyển khoản',
  REFUNDED: 'Đã hoàn tiền',
  FAILED: 'Chuyển khoản hoàn tiền thất bại',
}
export const refundStatusLabel = (status: RefundStatus) => refundStatuses[status]
export const returnReasonLimit = 1000
export const normalizeReason = (reason: string) => reason.replace(/[\t\r\n]+/g, ' ').trim()

const flowErrors: Record<string, string> = {
  INVALID_REFUND_RECEIPT: 'Chọn ảnh JPG hoặc PNG thật, tối đa 5 MB và 16 megapixel.',
  REFUND_RECEIPT_CONFLICT: 'Hồ sơ đã có ảnh biên nhận khác. Không thể thay thế ảnh đã lưu.',
  RETURN_STATE_CONFLICT: 'Trạng thái trả hàng đã thay đổi. Vui lòng tải lại yêu cầu.',
  REFUND_STATE_CONFLICT: 'Trạng thái hoàn tiền đã thay đổi. Vui lòng tải lại để kiểm tra.',
  REFUND_LEDGER_MISMATCH: 'Chưa đối chiếu được khoản hoàn với giao dịch thanh toán đã thu.',
  REFUND_AMOUNT_EXCEEDED: 'Số tiền cần hoàn vượt số tiền còn lại có thể hoàn cho giao dịch.',
  REFUND_SOURCE_CHANGED: 'Thông tin của yêu cầu hoàn tiền đã thay đổi. Vui lòng tải lại.',
  REFUND_TRANSFER_REFERENCE_IN_USE: 'Mã giao dịch này đã được sử dụng. Hãy đối chiếu với chứng từ ngân hàng.',
  REFUND_DESTINATION_UNAVAILABLE: 'Chưa thể lưu hoặc đọc tài khoản nhận tiền. Vui lòng thử lại sau.',
}

export function flowErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (flowErrors[error.code]) return flowErrors[error.code]
    if (error.status === 409) return 'Trạng thái yêu cầu đã thay đổi. Vui lòng tải lại để kiểm tra.'
  }
  return error instanceof Error ? error.message : fallback
}

const commerce = '/commerce/api/v1'
const payment = '/payment/api/v1'
function pathId(id: string) {
  if (!isUuid(id)) throw new ApiError(400, 'INVALID_ID', 'Mã yêu cầu không hợp lệ.')
  return id
}
const orderPath = (id: string) => commerce + '/orders/' + pathId(id) + '/returns'
const evidencePath = (id: string) => commerce + '/returns/' + pathId(id) + '/evidence'
const refundPath = (source: RefundSource, id: string) => payment + '/refunds/' + source + '/' + pathId(id)
const adminRefundPath = (source: RefundSource, id: string) => payment + '/admin/refunds/' + source + '/' + pathId(id)

function imagesForm(images: File[]) {
  const form = new FormData()
  images.forEach(image => form.append('images', image))
  return form
}

function invalidResponse(): never {
  throw new ApiError(502, 'INVALID_RESPONSE', 'Máy chủ chưa xác nhận kết quả. Vui lòng tải lại để kiểm tra.')
}

function assertReturn(record: ReturnRequest, { returnId, orderId }: { returnId?: string; orderId?: string } = {}) {
  if (!record?.return_id || (returnId && record.return_id !== returnId) || (orderId && record.order_id !== orderId) ||
      !Object.prototype.hasOwnProperty.call(returnStatusLabels, record.status) || !Array.isArray(record.items) || !Array.isArray(record.evidence)) invalidResponse()
  return record
}

const decisionStatuses: Record<ReturnAction, ReturnStatus> = {
  REQUEST_IMAGES: 'MORE_IMAGES_REQUESTED',
  APPROVE_PICKUP: 'PICKUP_APPROVED',
  REJECT: 'REJECTED',
  PASS_INSPECTION: 'PENDING_REFUND',
  FAIL_INSPECTION: 'REJECTED',
}

export const returnsApi = {
  async order(orderId: string, signal?: AbortSignal) {
    const result = await apiRequest<OrderReturns>(orderPath(orderId), { signal })
    if (typeof result?.eligible !== 'boolean' || !Array.isArray(result.available_items) || !Array.isArray(result.items)) invalidResponse()
    result.items.forEach(item => assertReturn(item, { orderId }))
    return result
  },
  async submit(orderId: string, request: { request_key: string; reason: string; items: Pick<ReturnLine, 'order_item_id' | 'quantity'>[] }, images: File[]) {
    const form = imagesForm(images)
    form.set('request', JSON.stringify(request))
    return assertReturn(await apiRequest<ReturnRequest>(orderPath(orderId), { method: 'POST', body: form }), { orderId })
  },
  async addEvidence(id: string, images: File[]) {
    const result = assertReturn(await apiRequest<ReturnRequest>(evidencePath(id), { method: 'POST', body: imagesForm(images) }), { returnId: id })
    if (result.status !== 'REQUESTED') invalidResponse()
    return result
  },
  evidence: async (id: string, imageId: string, signal: AbortSignal) =>
    apiRequest<Blob>(evidencePath(id) + '/' + pathId(imageId), { responseType: 'blob', signal }),
  async adminList(page: number, signal?: AbortSignal) {
    const result = await apiRequest<ReturnPage>(commerce + '/admin/returns?page=' + page + '&size=20', { signal })
    if (!Array.isArray(result?.items) || !Number.isSafeInteger(result.total_pages) || !Number.isSafeInteger(result.page)) invalidResponse()
    result.items.forEach(item => assertReturn(item))
    return result
  },
  async decide(id: string, action: ReturnAction, reason: string) {
    const result = assertReturn(await apiRequest<ReturnRequest>(commerce + '/admin/returns/' + pathId(id) + '/decision', {
      method: 'POST', body: { action, reason: reason || null },
    }), { returnId: id })
    if (result.status !== decisionStatuses[action]) invalidResponse()
    return result
  },
}

async function refundRequest(source: RefundSource, id: string, path: string, options?: Parameters<typeof apiRequest>[1], expected?: RefundStatus) {
  const refund = await apiRequest<Refund>(path, options)
  if (!refund?.refund_id || refund.source_id !== id || refund.source_type !== source ||
      !Object.prototype.hasOwnProperty.call(refundStatuses, refund.status) || (expected && refund.status !== expected) ||
      !Number.isSafeInteger(refund.amount_vnd) || refund.amount_vnd <= 0) invalidResponse()
  return refund
}

export const refundsApi = {
  completeWithReceipt(source: RefundSource, id: string, refundId: string, image: File) {
    const form = new FormData()
    form.append('image', image)
    form.append('refund_id', refundId)
    form.append('transfer_confirmed', 'true')
    return refundRequest(source, id, adminRefundPath(source, id) + '/complete-with-receipt', { method: 'POST', body: form }, 'REFUNDED')
  },
  async uploadReceipt(source: RefundSource, id: string, image: File) {
    const form = new FormData()
    form.append('image', image)
    const result = await refundRequest(source, id, adminRefundPath(source, id) + '/receipt', { method: 'POST', body: form })
    if (result.has_receipt !== true) invalidResponse()
    return result
  },
  receipt: (source: RefundSource, id: string, signal: AbortSignal) =>
    apiRequest<Blob>(refundPath(source, id) + '/receipt', { responseType: 'blob', signal }),
  read: async (source: RefundSource, id: string, signal?: AbortSignal) =>
    refundRequest(source, id, refundPath(source, id), { signal }),
  prepare: async (source: RefundSource, id: string) =>
    refundRequest(source, id, refundPath(source, id) + '/prepare', { method: 'POST' }),
  saveDestination: (source: RefundSource, id: string, body: RefundDestination) =>
    refundRequest(source, id, refundPath(source, id) + '/destination', { method: 'PUT', body }, 'PENDING'),
  start: async (source: RefundSource, id: string) =>
    refundRequest(source, id, adminRefundPath(source, id) + '/start', { method: 'POST' }, 'PROCESSING'),
  complete: (source: RefundSource, id: string, body: { transfer_reference: string; proof_reference: string }) =>
    refundRequest(source, id, adminRefundPath(source, id) + '/complete', { method: 'POST', body }, 'REFUNDED'),
  fail: (source: RefundSource, id: string, reason: string) =>
    refundRequest(source, id, adminRefundPath(source, id) + '/fail', { method: 'POST', body: { reason } }, 'FAILED'),
  async destination(source: RefundSource, id: string) {
    const result = await apiRequest<RefundDestination>(adminRefundPath(source, id) + '/destination')
    if (![result?.bank_name, result?.account_number, result?.account_holder].every(value => typeof value === 'string' && value.trim())) invalidResponse()
    return result
  },
}
