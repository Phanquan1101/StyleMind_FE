import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { commerceApi } from '@/api/commerce'
import { createDemoSeed } from '@/app/data/demoSeed'
import { ToastProvider } from '@/shared/ui'
import { AdminProductsPanel } from './AdminProductsPanel'

it('groups the product form and rejects an invalid price before calling the API', async () => {
  const create = vi.spyOn(commerceApi.products, 'create')
  const user = userEvent.setup()
  render(<ToastProvider><AdminProductsPanel database={createDemoSeed()} dispatch={vi.fn()} /></ToastProvider>)
  await user.click(screen.getByRole('button', { name: 'Thêm sản phẩm' }))
  expect(screen.getByRole('heading', { name: 'Thông tin sản phẩm' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Phiên bản sản phẩm' })).toBeInTheDocument()
  for (const [label, value] of Object.entries({ 'ID sản phẩm': 'prd-test', 'Tên sản phẩm': 'Áo', 'Thương hiệu': 'Test', 'Giá cơ bản': '0', 'Mô tả': 'Áo test', 'Chất liệu': 'Cotton', 'Phom dáng': 'Vừa', 'Họa tiết': 'Trơn', 'Màu': 'Trắng' })) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } })
  }
  await user.upload(screen.getByLabelText('Ảnh sản phẩm'), new File(['image bytes'], 'shirt.png', { type: 'image/png' }))
  await user.click(screen.getByRole('button', { name: 'Lưu sản phẩm' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Giá cơ bản phải lớn hơn 0.')
  expect(create).not.toHaveBeenCalled()
  create.mockRestore()
})

const savedProduct = (price: number) => ({
  product_id: 'p-1', category_id: 'c-1', brand_id: 'b-1', category_name: 'Áo', brand_name: 'Test', name: 'Áo mới',
  description: 'Áo test', demographic_segment: null, product_status: 'ACTIVE',
  variants: [{
    variant_id: 'v-1', product_id: 'p-1', sku: 'AO-MOI', size: 'M', color: 'Trắng', material: 'Cotton',
    unit_price_vnd: price, variant_status: 'ACTIVE', available_quantity: 7, images: [],
  }],
})

it('sends quantity (stock) when creating a product variant, as the commerce API requires', async () => {
  const dispatch = vi.fn()
  vi.spyOn(commerceApi.brands, 'listAdmin').mockResolvedValue({ items: [{ id: 'b-1', name: 'Test', slug: 'test', is_active: true }] } as never)
  vi.spyOn(commerceApi.products, 'create').mockResolvedValue({ ...savedProduct(250000), variants: [] } as never)
  const createVariant = vi.spyOn(commerceApi.products, 'createVariant').mockResolvedValue(savedProduct(250000).variants[0] as never)
  vi.spyOn(commerceApi.products, 'uploadImage').mockResolvedValue({} as never)
  vi.spyOn(commerceApi.products, 'getAdmin').mockResolvedValue(savedProduct(250000) as never)
  const user = userEvent.setup()
  const database = createDemoSeed()
  render(<ToastProvider><AdminProductsPanel database={database} dispatch={dispatch} /></ToastProvider>)
  await user.click(screen.getByRole('button', { name: 'Thêm sản phẩm' }))
  for (const [label, value] of Object.entries({ 'ID sản phẩm': 'prd-qty', 'Tên sản phẩm': 'Áo mới', 'Thương hiệu': 'Test', 'Giá cơ bản': '250000', 'Tồn kho': '7', 'Mô tả': 'Áo test', 'Chất liệu': 'Cotton', 'Phom dáng': 'Vừa', 'Họa tiết': 'Trơn', 'Màu': 'Trắng' })) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } })
  }
  await user.upload(screen.getByLabelText('Ảnh sản phẩm'), new File(['image bytes'], 'shirt.png', { type: 'image/png' }))
  await user.click(screen.getByRole('button', { name: 'Lưu sản phẩm' }))
  await vi.waitFor(() => expect(createVariant).toHaveBeenCalled())
  expect(createVariant.mock.calls[0][1]).toMatchObject({ unit_price_vnd: 250000, quantity: 7, variant_status: 'ACTIVE' })
  expect(createVariant.mock.calls[0][1].sku).toMatch(/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/)
  vi.restoreAllMocks()
})
