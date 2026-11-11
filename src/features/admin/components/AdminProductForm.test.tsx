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

const VALID = { 'Tên sản phẩm': 'Áo mới', 'Thương hiệu': 'Test', 'Giá bán (VND)': '250000', 'Tồn kho': '7', 'Chất liệu': 'Cotton', 'Màu': 'Trắng' }

function mockCreateFlow() {
  vi.spyOn(commerceApi.brands, 'listAdmin').mockResolvedValue({ items: [{ id: 'b-1', name: 'Test', slug: 'test', is_active: true }] } as never)
  const create = vi.spyOn(commerceApi.products, 'create').mockResolvedValue(savedProduct(250000, false) as never)
  const createVariant = vi.spyOn(commerceApi.products, 'createVariant').mockResolvedValue(savedProduct(250000).variants[0] as never)
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
  fill({ 'Tên sản phẩm': 'Áo', 'Thương hiệu': 'Test', 'Giá bán (VND)': '0', 'Màu': 'Trắng' })
  await user.upload(screen.getByLabelText('Ảnh sản phẩm'), new File(['image bytes'], 'shirt.png', { type: 'image/png' }))
  await user.click(screen.getByRole('button', { name: 'Lưu sản phẩm' }))
  const price = screen.getByLabelText('Giá bán (VND)', { exact: false })
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
  await user.upload(screen.getByLabelText('Ảnh sản phẩm'), new File(['image bytes'], 'shirt.png', { type: 'image/png' }))
  await user.click(screen.getByRole('button', { name: 'Lưu sản phẩm' }))
  await vi.waitFor(() => expect(calls.upload).toHaveBeenCalled())
  expect(calls.create.mock.calls[0][0]).not.toHaveProperty('id')
  expect(calls.createVariant.mock.calls[0][1]).toMatchObject({ unit_price_vnd: 250000, quantity: 7, variant_status: 'ACTIVE' })
  expect(calls.createVariant.mock.calls[0][1].sku).toMatch(/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/)
  expect(await screen.findByText('Đã lưu sản phẩm.')).toBeInTheDocument()
  expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'admin/productUpserted' }))
})

it('keeps the saved product when the image step fails and retries only the failed step', async () => {
  const calls = mockCreateFlow()
  calls.upload.mockRejectedValueOnce(new CommerceApiError(413, { status: 413, code: 'UPLOAD_TOO_LARGE', detail: 'Upload exceeds the allowed size' }))
  const user = await openCreateForm()
  fill(VALID)
  await user.upload(screen.getByLabelText('Ảnh sản phẩm'), new File(['image bytes'], 'shirt.png', { type: 'image/png' }))
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
  await user.upload(screen.getByLabelText('Ảnh sản phẩm'), new File(['image bytes'], 'shirt.png', { type: 'image/png' }))
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
