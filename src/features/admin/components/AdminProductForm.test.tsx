import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { commerceApi } from '@/api/commerce'
import { CommerceApiError } from '@/api/http'
import { createDemoSeed } from '@/app/data/demoSeed'
import { ToastProvider } from '@/shared/ui'
import { AdminProductsPanel } from './AdminProductsPanel'

afterEach(() => vi.restoreAllMocks())

const savedProduct = (price: number, withVariant = true) => ({
  product_id: 'p-1', category_id: 'c-1', brand_id: 'b-1', category_name: 'Áo', brand_name: 'Test', name: 'Áo mới',
  description: 'Áo test', demographic_segment: null, product_status: 'ACTIVE',
  variants: withVariant ? [{
    variant_id: 'v-1', product_id: 'p-1', sku: 'AO-MOI', size: 'M', color: 'Trắng', material: 'Cotton',
    unit_price_vnd: price, variant_status: 'ACTIVE', available_quantity: 7, images: [],
  }] : [],
})

async function openCreateForm(dispatch = vi.fn()) {
  const user = userEvent.setup()
  vi.spyOn(commerceApi.products, 'listAdmin').mockResolvedValue({ items: [], page: 0, size: 20, total_elements: 0, total_pages: 0 })
  render(<MemoryRouter><ToastProvider><AdminProductsPanel database={createDemoSeed()} dispatch={dispatch} /></ToastProvider></MemoryRouter>)
  await user.click(screen.getByRole('button', { name: 'Thêm sản phẩm' }))
  return user
}

function fill(values: Record<string, string>) {
  for (const [label, value] of Object.entries(values)) fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

const VALID = { 'Tên sản phẩm': 'Áo mới', 'Thương hiệu': 'b-1', 'Giá bán biến thể 1 (VND)': '250000', 'Tồn kho biến thể 1': '7', 'Chất liệu biến thể 1': 'Cotton', 'Màu biến thể 1': 'Trắng' }

function mockCreateFlow() {
  vi.spyOn(commerceApi.brands, 'listAdmin').mockResolvedValue({ items: [{ id: 'b-1', name: 'Test', slug: 'test', is_active: true }] } as never)
  const create = vi.spyOn(commerceApi.products, 'create').mockResolvedValue(savedProduct(250000, false) as never)
  const createVariant = vi.spyOn(commerceApi.products, 'createVariant')
    .mockResolvedValueOnce(savedProduct(250000).variants[0] as never)
    .mockResolvedValue({ ...savedProduct(250000).variants[0], variant_id: 'v-2' } as never)
  const replace = vi.spyOn(commerceApi.products, 'replace').mockResolvedValue(savedProduct(250000) as never)
  const replaceVariant = vi.spyOn(commerceApi.products, 'replaceVariant').mockResolvedValue(savedProduct(250000).variants[0] as never)
  const upload = vi.spyOn(commerceApi.products, 'uploadImage').mockResolvedValue({} as never)
  vi.spyOn(commerceApi.products, 'getAdmin').mockResolvedValue(savedProduct(250000) as never)
  return { create, createVariant, replace, replaceVariant, upload }
}

it('has no product id input and marks invalid fields instead of showing one generic message', async () => {
  const create = vi.spyOn(commerceApi.products, 'create')
  const user = await openCreateForm()
  expect(screen.queryByLabelText('ID sản phẩm')).not.toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Thông tin sản phẩm' })).toBeInTheDocument()
  fill({ 'Tên sản phẩm': 'Áo', 'Thương hiệu': 'Test', 'Giá bán biến thể 1 (VND)': '0', 'Màu biến thể 1': 'Trắng' })
  await user.upload(screen.getByLabelText('Ảnh biến thể 1'), new File(['image bytes'], 'shirt.png', { type: 'image/png' }))
  await user.click(screen.getByRole('button', { name: 'Lưu sản phẩm' }))
  const price = screen.getByLabelText('Giá bán biến thể 1 (VND)', { exact: false })
  expect(price).toHaveAttribute('aria-invalid', 'true')
  expect(screen.getByText('Giá bán phải là số nguyên lớn hơn 0.')).toBeInTheDocument()
  expect(screen.getByLabelText('Tên sản phẩm', { exact: false })).not.toHaveAttribute('aria-invalid')
  expect(create).not.toHaveBeenCalled()
})

it('saves product, variant (with stock) and image in order, then closes and reports success', async () => {
  const dispatch = vi.fn()
  const calls = mockCreateFlow()
  const user = await openCreateForm(dispatch)
  fill(VALID)
  await user.upload(screen.getByLabelText('Ảnh biến thể 1'), new File(['image bytes'], 'shirt.png', { type: 'image/png' }))
  await user.click(screen.getByRole('button', { name: 'Lưu sản phẩm' }))
  await vi.waitFor(() => expect(calls.upload).toHaveBeenCalled())
  expect(calls.create.mock.calls[0][0]).not.toHaveProperty('id')
  expect(calls.createVariant.mock.calls[0][1]).toMatchObject({ unit_price_vnd: 250000, quantity: 7, variant_status: 'ACTIVE' })
  expect(calls.createVariant.mock.calls[0][1].sku).toMatch(/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/)
  expect(await screen.findByText('Đã lưu sản phẩm.')).toBeInTheDocument()
  expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'admin/productUpserted' }))
})

it('loads brands into a dropdown and creates every additional variant through Commerce', async () => {
  const calls = mockCreateFlow()
  const user = await openCreateForm()
  expect(await screen.findByRole('option', { name: 'Test' })).toHaveValue('b-1')
  expect(screen.getByLabelText('Màu biến thể 1').tagName).toBe('SELECT')
  expect(screen.getByLabelText('Size biến thể 1').tagName).toBe('SELECT')
  fill(VALID)
  await user.click(screen.getByRole('button', { name: 'Thêm biến thể' }))
  await user.selectOptions(screen.getByLabelText('Màu biến thể 2'), 'Đen')
  await user.upload(screen.getByLabelText('Ảnh biến thể 1'), new File(['image bytes'], 'shirt.png', { type: 'image/png' }))
  await user.upload(screen.getByLabelText('Ảnh biến thể 2'), new File(['image 2'], 'shirt-black.png', { type: 'image/png' }))
  await user.click(screen.getByRole('button', { name: 'Lưu sản phẩm' }))
  await vi.waitFor(() => expect(calls.createVariant).toHaveBeenCalledTimes(2))
  expect(calls.createVariant.mock.calls[1][1]).toMatchObject({ color: 'Đen', size: 'M', unit_price_vnd: 250000, quantity: 0 })
  expect(calls.upload).toHaveBeenCalledTimes(2)
  expect(calls.upload).toHaveBeenNthCalledWith(2, 'v-2', expect.any(File), 'Áo mới - Đen - M')
})

it('can add a new variant while editing an existing product', async () => {
  const user = userEvent.setup()
  const existing = savedProduct(250000)
  ;(existing.variants[0].images as unknown[]).push({ image_id: 'img-1', variant_id: 'v-1', image_url: '/white.png', alt_text: null, display_order: 0, is_primary: true })
  vi.spyOn(commerceApi.brands, 'listAdmin').mockResolvedValue({ items: [{ id: 'b-1', name: 'Test', slug: 'test', is_active: true }] })
  vi.spyOn(commerceApi.products, 'listAdmin').mockResolvedValue({ items: [existing] as never, page: 0, size: 20, total_elements: 1, total_pages: 1 })
  vi.spyOn(commerceApi.products, 'getAdmin').mockResolvedValue(existing as never)
  vi.spyOn(commerceApi.products, 'replace').mockResolvedValue(existing as never)
  vi.spyOn(commerceApi.products, 'replaceVariant').mockResolvedValue(existing.variants[0] as never)
  const createVariant = vi.spyOn(commerceApi.products, 'createVariant').mockResolvedValue({ ...existing.variants[0], variant_id: 'v-2', color: 'Đen' } as never)
  render(<MemoryRouter><ToastProvider><AdminProductsPanel database={createDemoSeed()} dispatch={vi.fn()} /></ToastProvider></MemoryRouter>)

  await user.click(await screen.findByRole('button', { name: 'Sửa Áo mới' }))
  await user.click(await screen.findByRole('button', { name: 'Thêm biến thể' }))
  await user.selectOptions(screen.getByLabelText('Màu biến thể 2'), 'Đen')
  await user.upload(screen.getByLabelText('Ảnh biến thể 2'), new File(['image 2'], 'black.png', { type: 'image/png' }))
  await user.click(screen.getByRole('button', { name: 'Lưu sản phẩm' }))
  await vi.waitFor(() => expect(createVariant).toHaveBeenCalledWith('p-1', expect.objectContaining({ color: 'Đen', size: 'M' })))
})

it('loads every existing variant with its own image input when editing', async () => {
  const user = userEvent.setup()
  const existing = savedProduct(250000)
  ;(existing.variants[0].images as unknown[]).push({ image_id: 'img-1', variant_id: 'v-1', image_url: '/white.png', alt_text: null, display_order: 0, is_primary: true })
  existing.variants.push({ ...existing.variants[0], variant_id: 'v-2', sku: 'AO-MOI-DEN-L', color: 'Đen', size: 'L', images: [{ image_id: 'img-2', variant_id: 'v-2', image_url: '/black.png', alt_text: null, display_order: 0, is_primary: true }] } as never)
  vi.spyOn(commerceApi.brands, 'listAdmin').mockResolvedValue({ items: [{ id: 'b-1', name: 'Test', slug: 'test', is_active: true }] })
  vi.spyOn(commerceApi.products, 'listAdmin').mockResolvedValue({ items: [existing] as never, page: 0, size: 20, total_elements: 1, total_pages: 1 })
  vi.spyOn(commerceApi.products, 'getAdmin').mockResolvedValue(existing as never)
  render(<MemoryRouter><ToastProvider><AdminProductsPanel database={createDemoSeed()} dispatch={vi.fn()} /></ToastProvider></MemoryRouter>)

  await user.click(await screen.findByRole('button', { name: 'Sửa Áo mới' }))
  expect(await screen.findByLabelText('Ảnh biến thể 1')).toHaveAttribute('type', 'file')
  expect(screen.getByLabelText('Ảnh biến thể 2')).toHaveAttribute('type', 'file')
  expect(screen.getByRole('img', { name: 'Ảnh xem trước biến thể 1' })).toHaveAttribute('src', '/white.png')
  expect(screen.getByRole('img', { name: 'Ảnh xem trước biến thể 2' })).toHaveAttribute('src', '/black.png')
})

it('keeps the saved product when the image step fails and retries only the failed step', async () => {
  const calls = mockCreateFlow()
  calls.upload.mockRejectedValueOnce(new CommerceApiError(413, { status: 413, code: 'UPLOAD_TOO_LARGE', detail: 'Upload exceeds the allowed size' }))
  const user = await openCreateForm()
  fill(VALID)
  await user.upload(screen.getByLabelText('Ảnh biến thể 1'), new File(['image bytes'], 'shirt.png', { type: 'image/png' }))
  await user.click(screen.getByRole('button', { name: 'Lưu sản phẩm' }))
  expect(await screen.findByText(/Sản phẩm đã được lưu nhưng chưa tải được ảnh/)).toBeInTheDocument()
  expect(screen.getByRole('list', { name: 'Tiến trình lưu' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Thử lại' }))
  expect(await screen.findByText('Đã lưu sản phẩm.')).toBeInTheDocument()
  expect(calls.create).toHaveBeenCalledTimes(1)
  expect(calls.createVariant).toHaveBeenCalledTimes(1)
  expect(calls.replaceVariant).toHaveBeenCalledTimes(1)
  expect(calls.upload).toHaveBeenCalledTimes(2)
})

it('shows server validation errors under the matching input', async () => {
  const calls = mockCreateFlow()
  calls.create.mockRejectedValueOnce(new CommerceApiError(400, {
    status: 400, code: 'INVALID_REQUEST', detail: 'Request is missing or malformed',
    errors: [{ field: 'name', code: 'TOO_LONG', message: 'Tên sản phẩm tối đa 160 ký tự' }],
  }))
  const user = await openCreateForm()
  fill(VALID)
  await user.upload(screen.getByLabelText('Ảnh biến thể 1'), new File(['image bytes'], 'shirt.png', { type: 'image/png' }))
  await user.click(screen.getByRole('button', { name: 'Lưu sản phẩm' }))
  expect(await screen.findByText('Tên sản phẩm tối đa 160 ký tự')).toBeInTheDocument()
  expect(screen.getByLabelText('Tên sản phẩm', { exact: false })).toHaveAttribute('aria-invalid', 'true')
})

it('pages through the server list and keeps page and keyword in the URL', async () => {
  const listAdmin = vi.spyOn(commerceApi.products, 'listAdmin').mockImplementation(async query => ({
    items: [{ ...savedProduct(100000), product_id: `p-${query?.page ?? 0}`, name: `Áo trang ${(query?.page ?? 0) + 1}` }] as never,
    page: query?.page ?? 0, size: 20, total_elements: 41, total_pages: 3,
  }))
  const user = userEvent.setup()
  render(<MemoryRouter initialEntries={['/admin?section=products&page=2&q=ao']}><ToastProvider><AdminProductsPanel database={createDemoSeed()} dispatch={vi.fn()} /></ToastProvider></MemoryRouter>)

  expect(await screen.findByText('Áo trang 2')).toBeInTheDocument()
  expect(listAdmin).toHaveBeenCalledWith(expect.objectContaining({ keyword: 'ao', page: 1, size: 20 }))
  expect(screen.getByText('Trang 2 / 3')).toBeInTheDocument()
  expect(screen.getByText(/21–21 \/ 41 sản phẩm/)).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Sau' }))
  expect(await screen.findByText('Áo trang 3')).toBeInTheDocument()
  expect(listAdmin).toHaveBeenLastCalledWith(expect.objectContaining({ keyword: 'ao', page: 2 }))
})

it('soft-deletes a product only after confirmation', async () => {
  const product = savedProduct(100000)
  vi.spyOn(commerceApi.products, 'listAdmin').mockResolvedValue({ items: [product] as never, page: 0, size: 20, total_elements: 1, total_pages: 1 })
  const remove = vi.spyOn(commerceApi.products, 'remove').mockResolvedValue(undefined)
  const dispatch = vi.fn()
  const user = userEvent.setup()
  render(<MemoryRouter><ToastProvider><AdminProductsPanel database={createDemoSeed()} dispatch={dispatch} /></ToastProvider></MemoryRouter>)

  await user.click(await screen.findByRole('button', { name: 'Xóa Áo mới' }))
  expect(remove).not.toHaveBeenCalled()
  expect(screen.getByText(/Dữ liệu sản phẩm vẫn được lưu trong hệ thống/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Xác nhận xóa' }))

  await vi.waitFor(() => expect(remove).toHaveBeenCalledWith('p-1'))
  expect(dispatch).toHaveBeenCalledWith({ type: 'admin/productStatusChanged', payload: { productId: 'p-1', active: false } })
  expect(await screen.findByText('Đã xóa sản phẩm khỏi cửa hàng.')).toBeInTheDocument()
  expect(screen.getByText('Đã xóa')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Sửa Áo mới' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Xóa Áo mới' })).toBeDisabled()
})
