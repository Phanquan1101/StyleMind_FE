import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { createDemoSeed } from '@/app/data/demoSeed'
import { ToastProvider } from '@/shared/ui'
import { saveApiSession } from '@/test/communitySession'
import RefundPanel from '@/features/returns/RefundPanel'
import { AdminRequestsPanel } from './AdminRequestsPanel'

const id = '10000000-0000-0000-0000-000000000003'
const orderId = '10000000-0000-0000-0000-000000000001'
const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })

afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear() })

it('opens real returns from admin requests and submits a request for more images', async () => {
  saveApiSession('admin-token', Date.now() + 60000)
  const request = { return_id: id, order_id: orderId, order_number: 'SM-RETURN', status: 'REQUESTED', reason: 'Sản phẩm lỗi', amount_vnd: 120000, created_at: '2026-11-11T00:00:00Z', items: [], evidence: [], history: [] }
  let decision: unknown
  vi.stubGlobal('fetch', vi.fn(async (url, options) => {
    expect(options.headers.Authorization).toBe('Bearer admin-token')
    if (String(url).endsWith('/decision')) {
      decision = JSON.parse(options.body)
      return json({ ...request, status: 'MORE_IMAGES_REQUESTED', decision_reason: 'Chụp thêm nhãn sản phẩm' })
    }
    expect(String(url)).toBe('/commerce/api/v1/admin/returns?page=0&size=20')
    return json({ items: [request], page: 0, size: 20, total_elements: 1, total_pages: 1 })
  }))
  render(<MemoryRouter><ToastProvider><AdminRequestsPanel database={createDemoSeed()} dispatch={vi.fn()} reviewerId="admin" /></ToastProvider></MemoryRouter>)
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Trả hàng / Hoàn tiền' }))
  await user.click(await screen.findByRole('button', { name: 'Xem yêu cầu SM-RETURN' }))
  await user.click(screen.getByRole('button', { name: 'Yêu cầu thêm ảnh' }))
  await user.type(screen.getByLabelText('Lý do'), 'Chụp thêm nhãn sản phẩm')
  await user.click(screen.getByRole('button', { name: 'Xác nhận yêu cầu thêm ảnh' }))
  expect(await within(screen.getByRole('dialog')).findByText('Cần bổ sung ảnh')).toBeVisible()
  expect(decision).toEqual({ action: 'REQUEST_IMAGES', reason: 'Chụp thêm nhãn sản phẩm' })
})

it('starts a refund, reveals its bank destination and records the completed transfer', async () => {
  saveApiSession('admin-token', Date.now() + 60000)
  const refund = { refund_id: id, source_id: id, source_type: 'RETURN', order_id: orderId, amount_vnd: 120000, status: 'PENDING', has_receipt: false }
  let completion: FormData | undefined
  vi.stubGlobal('fetch', vi.fn(async (url, options) => {
    expect(options.headers.Authorization).toBe('Bearer admin-token')
    if (String(url).endsWith('/start')) return json({ ...refund, status: 'PROCESSING' })
    if (String(url).endsWith('/destination')) return json({ bank_name: 'Ngân hàng kiểm thử', account_number: '123456789', account_holder: 'NGUYEN VAN A' })
    if (String(url).endsWith('/complete-with-receipt')) {
      completion = options.body
      expect(options.method).toBe('POST')
      expect(options.headers['Content-Type']).toBeUndefined()
      return json({ ...refund, status: 'REFUNDED', has_receipt: true, refunded_at: '2026-11-12T00:00:00Z' })
    }
    return json(refund)
  }))
  render(<RefundPanel source="RETURN" sourceId={id} admin />)
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Bắt đầu hoàn tiền' }))
  await user.click(await screen.findByRole('button', { name: 'Xem tài khoản nhận tiền' }))
  expect(await screen.findByText('123456789')).toBeVisible()
  const complete = screen.getByRole('button', { name: 'Xác nhận đã chuyển khoản' })
  expect(complete).toBeDisabled()
  const image = new File(['receipt'], 'refund.png', { type: 'image/png' })
  await user.upload(screen.getByLabelText('Ảnh biên nhận chuyển khoản'), image)
  expect(complete).toBeDisabled()
  await user.click(screen.getByRole('checkbox', { name: 'Tôi đã chuyển đủ tiền cho khách và đính kèm đúng biên nhận.' }))
  expect(complete).toBeEnabled()
  fireEvent.submit(complete.closest('form')!)
  expect(await screen.findByText('Đã hoàn tiền')).toBeVisible()
  expect(completion?.get('image')).toEqual(image)
  expect(completion?.get('refund_id')).toBe(id)
  expect(completion?.get('transfer_confirmed')).toBe('true')
  expect(completion?.has('transfer_reference')).toBe(false)
  expect(completion?.has('proof_reference')).toBe(false)
})
