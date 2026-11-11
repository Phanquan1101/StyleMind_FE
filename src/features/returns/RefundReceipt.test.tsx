import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { saveApiSession } from '@/test/communitySession'
import RefundPanel from './RefundPanel'

const id = '10000000-0000-0000-0000-000000000003'
const refund = { refund_id: id, source_id: id, source_type: 'RETURN', order_id: id, amount_vnd: 643000, status: 'REFUNDED', has_receipt: false }
const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })
afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear() })

it('admin uploads a receipt for an already refunded case without completing again', async () => {
  saveApiSession('admin-token', Date.now() + 60000)
  const create = vi.fn(() => 'blob:receipt'), revoke = vi.fn()
  const NativeURL = URL
  vi.stubGlobal('URL', class extends NativeURL { static createObjectURL = create; static revokeObjectURL = revoke })
  let uploaded = false
  let body: FormData | undefined
  const fetch = vi.fn(async (url, options) => {
    if (String(url).endsWith('/receipt') && options?.method === 'POST') { uploaded = true; body = options.body; return json({ ...refund, has_receipt: true }) }
    if (String(url).endsWith('/receipt')) return new Response(new Blob(['photo'], { type: 'image/png' }), { headers: { 'Content-Type': 'image/png' } })
    return json({ ...refund, has_receipt: uploaded })
  })
  vi.stubGlobal('fetch', fetch)
  const user = userEvent.setup()
  const view = render(<RefundPanel source="RETURN" sourceId={id} admin />)
  const file = new File(['photo'], 'receipt.png', { type: 'image/png' })
  await user.upload(await screen.findByLabelText('Ảnh biên nhận chuyển khoản'), file)
  expect(await screen.findByAltText('Ảnh biên nhận đang chọn')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Lưu ảnh biên nhận' }))
  await waitFor(() => expect(body?.get('image')).toEqual(file))
  await user.click(await screen.findByRole('button', { name: 'Xem ảnh biên nhận' }))
  expect(await screen.findByAltText('Biên nhận chuyển khoản hoàn tiền')).toBeVisible()
  expect(fetch.mock.calls.every(([url]) => !String(url).endsWith('/complete'))).toBe(true)
  view.unmount()
  expect(revoke).toHaveBeenCalled()
})

it('customer can read a saved receipt but cannot upload one', async () => {
  saveApiSession('owner-token', Date.now() + 60000)
  vi.stubGlobal('fetch', vi.fn(async () => json({ ...refund, has_receipt: true })))
  render(<RefundPanel source="RETURN" sourceId={id} />)
  expect(await screen.findByRole('button', { name: 'Xem ảnh biên nhận' })).toBeVisible()
  expect(screen.queryByLabelText('Ảnh biên nhận chuyển khoản')).not.toBeInTheDocument()
})
