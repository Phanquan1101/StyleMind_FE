import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'

import { commerceApi } from '@/api/commerce'
import { createDemoSeed } from '@/app/data/demoSeed'
import { ToastProvider } from '@/shared/ui'
import { AdminProductsPanel } from './AdminProductsPanel'

afterEach(() => vi.restoreAllMocks())

const variant = (id: string, color: string, size: string, sku: string) => ({
  variant_id: id,
  product_id: 'p-sort',
  sku,
  size,
  color,
  material: 'Cotton',
  unit_price_vnd: 250000,
  variant_status: 'ACTIVE',
  available_quantity: 8,
  images: [],
})

const product = {
  product_id: 'p-sort',
  category_id: 'tops',
  brand_id: 'b-1',
  category_name: 'Áo',
  brand_name: 'Test',
  name: 'Áo sort test',
  description: null,
  demographic_segment: null,
  product_status: 'ACTIVE',
  variants: [
    variant('v-white-xl', 'Trắng', 'XL', 'WHITE-XL'),
    variant('v-black-l', 'Đen', 'L', 'BLACK-L'),
    variant('v-white-m', 'Trắng', 'M', 'WHITE-M'),
    variant('v-black-s', 'Đen', 'S', 'BLACK-S'),
  ],
}

it('sorts variants by color then size and updates only the selected variant', async () => {
  const user = userEvent.setup()
  vi.spyOn(commerceApi.brands, 'listAdmin').mockResolvedValue({ items: [{ id: 'b-1', name: 'Test', slug: 'test', is_active: true }] })
  vi.spyOn(commerceApi.products, 'listAdmin').mockResolvedValue({ items: [product], page: 0, size: 20, total_elements: 1, total_pages: 1 })
  vi.spyOn(commerceApi.products, 'getAdmin').mockResolvedValue(product)
  const replaceVariant = vi.spyOn(commerceApi.products, 'replaceVariant').mockResolvedValue(product.variants[3])

  render(<MemoryRouter><ToastProvider><AdminProductsPanel database={createDemoSeed()} dispatch={vi.fn()} /></ToastProvider></MemoryRouter>)
  await user.click(await screen.findByRole('button', { name: /4 biến thể/ }))

  const table = screen.getByText('Biến thể của Áo sort test').closest('table')
  if (!table) throw new Error('Không tìm thấy bảng biến thể')
  const rows = within(table).getAllByRole('row').slice(1)
  expect(rows.map(row => row.textContent)).toEqual([
    expect.stringContaining('ĐenS'),
    expect.stringContaining('ĐenL'),
    expect.stringContaining('TrắngM'),
    expect.stringContaining('TrắngXL'),
  ])

  await user.click(within(rows[0]).getByRole('button', { name: 'Sửa biến thể Đen S của Áo sort test' }))
  await user.clear(await screen.findByLabelText('Giá bán biến thể (VND)'))
  await user.type(screen.getByLabelText('Giá bán biến thể (VND)'), '275000')
  await user.clear(screen.getByLabelText('Tồn kho biến thể'))
  await user.type(screen.getByLabelText('Tồn kho biến thể'), '12')
  await user.click(screen.getByRole('button', { name: 'Lưu biến thể' }))

  await vi.waitFor(() => expect(replaceVariant).toHaveBeenCalledWith('v-black-s', {
    sku: 'BLACK-S',
    size: 'S',
    color: 'Đen',
    material: 'Cotton',
    unit_price_vnd: 275000,
    quantity: 12,
    variant_status: 'ACTIVE',
  }))
})
