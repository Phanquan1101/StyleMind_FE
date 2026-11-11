import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/shared/ui'
import { OutfitCartActions } from './OutfitCartActions'

const addItem = vi.hoisted(() => vi.fn())
vi.mock('@/features/cart/model/AccountCommerceProvider', () => ({ useActiveCommerce: () => ({ addItem, busy: false }) }))

const items = [
  { outfit_item_id: 'one', variant_id: 'variant-one', product_id: 'p1', product_name: 'Áo', color: null, size: null, unit_price_vnd: 100, image_url: null, available: true },
  { outfit_item_id: 'two', variant_id: 'variant-two', product_id: 'p2', product_name: 'Quần', color: null, size: null, unit_price_vnd: 200, image_url: null, available: true },
  { outfit_item_id: 'three', variant_id: 'variant-three', product_id: null, product_name: 'Món cũ', color: null, size: null, unit_price_vnd: null, image_url: null, available: false },
]
beforeEach(() => { addItem.mockReset(); addItem.mockResolvedValue(undefined) })

function Where() { return <span data-testid="where">{useLocation().pathname}</span> }
const renderActions = () => render(<MemoryRouter><ToastProvider><OutfitCartActions items={items} /><Where /></ToastProvider></MemoryRouter>)

it('adds only available items, confirms with a toast and names the skipped item', async () => {
  renderActions()
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Thêm Outfit vào giỏ' }))
  expect(addItem.mock.calls).toEqual([['variant-one', 1], ['variant-two', 1]])
  expect(await screen.findByText('Đã thêm 2 món vào giỏ (bỏ qua 1 món hết hàng/ngừng bán)')).toBeInTheDocument()
  expect(screen.getByText(/Không thêm được \(hết hàng hoặc ngừng bán\): Món cũ\./)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Xem giỏ hàng' }))
  expect(screen.getByTestId('where')).toHaveTextContent('/cart')
})

it('adds an individual available item and disables an unavailable item', async () => {
  renderActions()
  // The visible label is short (so it never overflows on phones); the product name lives in the accessible name.
  expect(screen.getByRole('button', { name: 'Thêm Áo vào giỏ' })).toHaveTextContent(/^Thêm vào giỏ$/)
  expect(screen.getByRole('button', { name: 'Thêm Món cũ vào giỏ' })).toBeDisabled()
  await userEvent.setup().click(screen.getByRole('button', { name: 'Thêm Áo vào giỏ' }))
  expect(addItem).toHaveBeenCalledExactlyOnceWith('variant-one', 1)
  expect(await screen.findByText('Đã thêm 1 món vào giỏ')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Xem giỏ hàng' })).toBeInTheDocument()
})

it('stops and describes a partial result when a cart request fails', async () => {
  addItem.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('Không kết nối được'))
  renderActions()
  await userEvent.setup().click(screen.getByRole('button', { name: 'Thêm Outfit vào giỏ' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Đã thêm 1 món')
  expect(screen.getByRole('alert')).toHaveTextContent('kiểm tra giỏ hàng')
  expect(addItem).toHaveBeenCalledTimes(2)
})
