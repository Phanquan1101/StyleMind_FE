import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { commerceApi } from '@/api/commerce'
import { createDemoSeed } from '@/app/data/demoSeed'
import { ToastProvider } from '@/shared/ui'
import { AdminProductsPanel } from './AdminProductsPanel'

beforeEach(() => { vi.spyOn(commerceApi.products, 'listAdmin').mockResolvedValue({ items: [], page: 0, size: 20, total_elements: 0, total_pages: 0 }) })
afterEach(() => vi.restoreAllMocks())

it('offers a file picker for product images instead of requiring an image URL', async () => {
  render(<MemoryRouter><ToastProvider><AdminProductsPanel database={createDemoSeed()} dispatch={vi.fn()} /></ToastProvider></MemoryRouter>)
  await userEvent.setup().click(screen.getByRole('button', { name: 'Thêm sản phẩm' }))
  expect(screen.getByLabelText('Ảnh biến thể 1')).toHaveAttribute('type', 'file')
  expect(screen.queryByLabelText('URL ảnh')).not.toBeInTheDocument()
})

it('uploads the selected file to the created variant', async () => {
  const user = userEvent.setup()
  const variant = { variant_id: 'server-variant', product_id: 'server-product', sku: 'SKU', size: 'M', color: 'Trắng', material: 'Cotton', unit_price_vnd: 100000, variant_status: 'ACTIVE', available_quantity: 1, images: [] }
  const product = { product_id: 'server-product', category_id: 'tops', brand_id: 'brand', category_name: 'Áo', brand_name: 'Test', name: 'Áo test', description: 'Áo', demographic_segment: null, product_status: 'ACTIVE', variants: [] }
  vi.spyOn(commerceApi.brands, 'listAdmin').mockResolvedValue({ items: [{ id: 'brand', name: 'Test', slug: 'test', is_active: true }] })
  vi.spyOn(commerceApi.products, 'create').mockResolvedValue(product)
  vi.spyOn(commerceApi.products, 'createVariant').mockResolvedValue(variant)
  const upload = vi.spyOn(commerceApi.products, 'uploadImage').mockResolvedValue({ image_id: 'image', variant_id: 'server-variant', image_url: '/image', alt_text: null, display_order: 0, is_primary: true })
  vi.spyOn(commerceApi.products, 'getAdmin').mockResolvedValue({ ...product, variants: [variant] })
  render(<MemoryRouter><ToastProvider><AdminProductsPanel database={createDemoSeed()} dispatch={vi.fn()} /></ToastProvider></MemoryRouter>)
  await user.click(screen.getByRole('button', { name: 'Thêm sản phẩm' }))
  await user.type(screen.getByLabelText('Tên sản phẩm'), 'Áo test')
  await user.selectOptions(screen.getByLabelText('Thương hiệu'), 'brand')
  await user.type(screen.getByLabelText('Giá bán biến thể 1 (VND)'), '100000')
  await user.type(screen.getByLabelText('Mô tả'), 'Áo')
  await user.type(screen.getByLabelText('Chất liệu biến thể 1'), 'Cotton')
  await user.selectOptions(screen.getByLabelText('Màu biến thể 1'), 'Trắng')
  const file = new File(['image'], 'shirt.png', { type: 'image/png' })
  await user.upload(screen.getByLabelText('Ảnh biến thể 1'), file)
  await user.click(screen.getByRole('button', { name: 'Lưu sản phẩm' }))
  expect(upload).toHaveBeenCalledWith('server-variant', file, 'Áo test - Trắng - M')
})
