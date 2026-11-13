import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { saveApiSession } from '@/test/communitySession'
import type { OrderResponse } from '@/features/payments/api/types'
import OrderDetailSections from './components/OrderDetailSections'

const orderId = '10000000-0000-0000-0000-000000000001'
const itemId = '10000000-0000-0000-0000-000000000002'
const returnId = '10000000-0000-0000-0000-000000000003'
const cancellationId = '10000000-0000-0000-0000-000000000004'
const order = { order_id: orderId, order_status: 'COMPLETED', payment_method: 'COD', history: [], cancellation_request: null } as unknown as OrderResponse
const item = { order_item_id: itemId, product_name: 'Áo sơ mi', color_snapshot: 'Xanh', size_snapshot: 'M', quantity: 3, unit_price_vnd: 120000 }
const request = { return_id: returnId, order_id: orderId, order_number: 'SM-1001', status: 'REQUESTED', reason: 'Sản phẩm bị lỗi', decision_reason: null, created_at: '2026-11-11T01:00:00Z', items: [{ ...item, quantity: 2 }], evidence: [], history: [], amount_vnd: 240000 }
const json = (value: unknown) => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } })
afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear() })

it.each(['REQUESTED', 'REJECTED'])('giữ lịch sử %s và chặn yêu cầu trả hàng lần hai', async status => {
  saveApiSession('owner-token', Date.now() + 60000)
  vi.stubGlobal('fetch', vi.fn(async () => json({ eligible: true, available_items: [item], items: [{ ...request, status }] })))
  render(<OrderDetailSections order={order} onRefresh={vi.fn()} />)
  expect(await screen.findByText('Sản phẩm bị lỗi')).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Yêu cầu trả hàng' })).not.toBeInTheDocument()
  expect(screen.queryByLabelText('Ảnh bổ sung')).not.toBeInTheDocument()
  expect(screen.getByText(/Mỗi đơn hàng chỉ được gửi một yêu cầu trả hàng/)).toBeVisible()
})

it('giải thích thiếu khoản thu thay vì báo hết món trả hàng', async () => {
  saveApiSession('owner-token', Date.now() + 60000)
  vi.stubGlobal('fetch', vi.fn(async () => json({ eligible: false, ineligible_reason: 'PAYMENT_NOT_CONFIRMED', available_items: [], items: [] })))
  render(<OrderDetailSections order={order} onRefresh={vi.fn()} />)
  expect(await screen.findByText(/hệ thống chưa xác nhận khoản thu/)).toBeVisible()
  expect(screen.getByText('Đã giao hàng')).toBeVisible()
  expect(screen.queryByText('Đơn hàng hiện không còn sản phẩm đủ điều kiện trả.')).not.toBeInTheDocument()
})

it('gửi đúng số lượng và ảnh trả hàng rồi hiển thị trạng thái máy chủ', async () => {
  saveApiSession('owner-token', Date.now() + 60000)
  const NativeURL = URL
  const revokeObjectURL = vi.fn()
  vi.stubGlobal('URL', class extends NativeURL {
    static createObjectURL = (file: File) => 'blob:' + file.name
    static revokeObjectURL = revokeObjectURL
  })
  const path = '/commerce/api/v1/orders/' + orderId + '/returns'
  let submitted = false
  let upload: FormData | undefined
  vi.stubGlobal('fetch', vi.fn(async (url, options) => {
    if (url === path && options?.method === 'GET') return json({ eligible: !submitted, available_items: submitted ? [] : [item], items: submitted ? [request] : [] })
    if (url === path && options?.method === 'POST') {
      upload = options.body
      submitted = true
      return json(request)
    }
    throw new Error('Unexpected endpoint ' + url)
  }))
  const user = userEvent.setup()
  render(<OrderDetailSections order={order} onRefresh={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Yêu cầu trả hàng' }))
  await user.click(screen.getByRole('checkbox', { name: 'Áo sơ mi (Xanh / M)' }))
  const quantity = screen.getByRole('spinbutton', { name: 'Số lượng Áo sơ mi (Xanh / M)' })
  await user.clear(quantity)
  await user.type(quantity, '2')
  expect(screen.getByRole('status').textContent).toMatch(/240[.]000/)
  await user.type(screen.getByLabelText('Lý do trả hàng'), 'Sản phẩm{Enter}bị lỗi')
  const image = new File(['sample'], 'evidence.jpg', { type: 'image/jpeg' })
  await user.upload(screen.getByLabelText('Ảnh sản phẩm'), [image, new File(['extra'], 'extra.png', { type: 'image/png' })])
  await user.click(screen.getByRole('button', { name: 'Bỏ ảnh extra.png' }))
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:extra.png')
  await user.click(screen.getByRole('button', { name: 'Gửi yêu cầu trả hàng' }))
  expect(await screen.findByText('Đang chờ duyệt trả hàng')).toBeVisible()
  expect(screen.getByText('Xanh / M · Số lượng 2')).toBeVisible()
  expect(JSON.parse(String(upload?.get('request')))).toEqual({
    request_key: expect.stringMatching(/^[a-f0-9-]{36}$/i), reason: request.reason, items: [{ order_item_id: itemId, quantity: 2 }],
  })
  expect(upload?.getAll('images')).toEqual([image])
})

it('gửi tài khoản nhận tiền cho yêu cầu hủy đã thanh toán', async () => {
  saveApiSession('owner-token', Date.now() + 60000)
  const path = '/payment/api/v1/refunds/CANCELLATION/' + cancellationId
  const refund = { refund_id: 'refund', source_id: cancellationId, source_type: 'CANCELLATION', order_id: orderId, amount_vnd: 240000, status: 'AWAITING_DETAILS', transfer_reference: null, failure_reason: null, refunded_at: null }
  let payload: unknown
  vi.stubGlobal('fetch', vi.fn(async (url, options) => {
    if (url === path && options?.method === 'GET') return json(refund)
    if (url === path + '/destination' && options?.method === 'PUT') {
      payload = JSON.parse(options.body)
      return json({ ...refund, status: 'PENDING' })
    }
    throw new Error('Unexpected endpoint ' + url)
  }))
  const user = userEvent.setup()
  render(<OrderDetailSections order={{ ...order, order_status: 'CANCELLED', cancellation_request: { cancellation_request_id: cancellationId, request_status: 'APPROVED', refund_status: 'PENDING_REFUND' } as OrderResponse['cancellation_request'] }} onRefresh={vi.fn()} />)
  await user.type(await screen.findByLabelText('Tên ngân hàng'), 'Vietcombank')
  await user.type(screen.getByLabelText('Số tài khoản'), '0123456789')
  await user.type(screen.getByLabelText('Chủ tài khoản'), 'NGUYEN VAN A')
  await user.click(screen.getByRole('button', { name: 'Lưu tài khoản nhận tiền' }))
  expect(await screen.findByText('Đang chờ chuyển khoản hoàn tiền')).toBeVisible()
  expect(payload).toEqual({ bank_name: 'Vietcombank', account_number: '0123456789', account_holder: 'NGUYEN VAN A' })
})

it('tải ảnh riêng bằng phiên của chủ đơn và gửi được ảnh bổ sung khi cửa hàng yêu cầu', async () => {
  saveApiSession('owner-token', Date.now() + 60000)
  const imageId = '10000000-0000-0000-0000-000000000005'
  const orderPath = '/commerce/api/v1/orders/' + orderId + '/returns'
  const evidencePath = '/commerce/api/v1/returns/' + returnId + '/evidence'
  const needingImages = { ...request, status: 'MORE_IMAGES_REQUESTED', decision_reason: 'Chụp thêm ảnh nhãn', evidence: [{ image_id: imageId }] }
  const createObjectURL = vi.fn(() => 'blob:private-evidence')
  const revokeObjectURL = vi.fn()
  const NativeURL = URL
  vi.stubGlobal('URL', class extends NativeURL {
    static createObjectURL = createObjectURL
    static revokeObjectURL = revokeObjectURL
  })
  let sent: FormData | undefined
  const fetcher = vi.fn(async (url, options) => {
    if (url === orderPath) return json({ eligible: false, available_items: [], items: [needingImages] })
    if (url === evidencePath + '/' + imageId) {
      if (options.headers.Authorization !== 'Bearer owner-token' || options.redirect !== 'error') return json({ error: 'Unauthorized' })
      return new Response('sample', { headers: { 'Content-Type': 'image/jpeg' } })
    }
    if (url === evidencePath && options.method === 'POST') {
      sent = options.body
      return json({ ...needingImages, status: 'REQUESTED', decision_reason: null })
    }
    throw new Error('Unexpected endpoint ' + url)
  })
  vi.stubGlobal('fetch', fetcher)
  const user = userEvent.setup()
  const { unmount } = render(<OrderDetailSections order={order} onRefresh={vi.fn()} />)
  expect(await screen.findByText('Cần bổ sung ảnh')).toBeVisible()
  expect(fetcher.mock.calls.map(([url]) => url)).toEqual([orderPath])
  await user.click(screen.getByRole('button', { name: 'Xem ảnh sản phẩm (1)' }))
  expect(await screen.findByRole('img', { name: 'Ảnh sản phẩm 1' })).toHaveAttribute('src', 'blob:private-evidence')
  const image = new File(['sample'], 'label.png', { type: 'image/png' })
  await user.upload(screen.getByLabelText('Ảnh bổ sung'), image)
  await user.click(screen.getByRole('button', { name: 'Gửi ảnh bổ sung' }))
  expect(await screen.findByText('Đang chờ duyệt trả hàng')).toBeVisible()
  expect(screen.queryByLabelText('Ảnh bổ sung')).not.toBeInTheDocument()
  expect(sent?.getAll('images')).toEqual([image])
  unmount()
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:private-evidence')
})
