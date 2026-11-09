import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { commerceApi } from '@/api/commerce'
import { createDemoSeed } from '@/app/data/demoSeed'
import { ToastProvider } from '@/shared/ui'
import { AdminProductsPanel } from './AdminProductsPanel'

it('groups the product form and rejects an invalid price before calling the API', async () => {
  const create = vi.spyOn(commerceApi.products, 'create')
  render(<ToastProvider><AdminProductsPanel database={createDemoSeed()} dispatch={vi.fn()} /></ToastProvider>)
  await userEvent.setup().click(screen.getByRole('button', { name: 'Thêm sản phẩm' }))
  expect(screen.getByRole('heading', { name: 'Thông tin sản phẩm' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Phiên bản sản phẩm' })).toBeInTheDocument()
  for (const [label, value] of Object.entries({ 'ID sản phẩm': 'prd-test', 'Tên sản phẩm': 'Áo', 'Thương hiệu': 'Test', 'Giá cơ bản': '0', 'Mô tả': 'Áo test', 'Chất liệu': 'Cotton', 'Phom dáng': 'Vừa', 'Họa tiết': 'Trơn', 'Màu': 'Trắng' })) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } })
  }
  await userEvent.upload(screen.getByLabelText('Ảnh sản phẩm'), new File(['image'], 'photo.png', { type: 'image/png' }))
  await userEvent.setup().click(screen.getByRole('button', { name: 'Lưu sản phẩm' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Giá cơ bản phải lớn hơn 0.')
  expect(create).not.toHaveBeenCalled()
  create.mockRestore()
})

it.each([
  ['Giá cơ bản', '1.5', 'Giá cơ bản phải là số nguyên VND, không có phần lẻ.'],
  ['Giá cơ bản', '1000000001', 'Giá cơ bản tối đa 1.000.000.000 VND.'],
  ['Giá cơ bản', '9000000000000000000', 'Giá cơ bản tối đa 1.000.000.000 VND.'],
  ['Giá biến thể', '2.5', 'Giá biến thể phải là số nguyên VND, không có phần lẻ.'],
  ['Giá biến thể', '2000000000', 'Giá biến thể tối đa 1.000.000.000 VND.'],
])('rejects %s = %s with a clear message at the price field and does not call the API', async (label, value, message) => {
  const create = vi.spyOn(commerceApi.products, 'create')
  render(<ToastProvider><AdminProductsPanel database={createDemoSeed()} dispatch={vi.fn()} /></ToastProvider>)
  await userEvent.setup().click(screen.getByRole('button', { name: 'Thêm sản phẩm' }))
  for (const [field, text] of Object.entries({ 'ID sản phẩm': 'prd-test', 'Tên sản phẩm': 'Áo', 'Thương hiệu': 'Test', 'Giá cơ bản': '199000', 'Mô tả': 'Áo test', 'Chất liệu': 'Cotton', 'Phom dáng': 'Vừa', 'Họa tiết': 'Trơn', 'Màu': 'Trắng' })) {
    fireEvent.change(screen.getByLabelText(field), { target: { value: text } })
  }
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
  await userEvent.upload(screen.getByLabelText('Ảnh sản phẩm'), new File(['image'], 'photo.png', { type: 'image/png' }))
  await userEvent.setup().click(screen.getByRole('button', { name: 'Lưu sản phẩm' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(message)
  expect(screen.getByLabelText(new RegExp('^' + label))).toHaveAttribute('aria-invalid', 'true')
  expect(create).not.toHaveBeenCalled()
  create.mockRestore()
})

it('accepts a whole-number price up to the ceiling without a price error', async () => {
  const listBrands = vi.spyOn(commerceApi.brands, 'listAdmin').mockRejectedValue(new Error('stop after validation'))
  render(<ToastProvider><AdminProductsPanel database={createDemoSeed()} dispatch={vi.fn()} /></ToastProvider>)
  await userEvent.setup().click(screen.getByRole('button', { name: 'Thêm sản phẩm' }))
  for (const [field, text] of Object.entries({ 'ID sản phẩm': 'prd-test', 'Tên sản phẩm': 'Áo', 'Thương hiệu': 'Test', 'Giá cơ bản': '1000000000', 'Mô tả': 'Áo test', 'Chất liệu': 'Cotton', 'Phom dáng': 'Vừa', 'Họa tiết': 'Trơn', 'Màu': 'Trắng' })) {
    fireEvent.change(screen.getByLabelText(field), { target: { value: text } })
  }
  await userEvent.upload(screen.getByLabelText('Ảnh sản phẩm'), new File(['image'], 'photo.png', { type: 'image/png' }))
  await userEvent.setup().click(screen.getByRole('button', { name: 'Lưu sản phẩm' }))
  await waitFor(() => expect(listBrands).toHaveBeenCalled())
  expect(screen.getByLabelText('Giá cơ bản')).not.toHaveAttribute('aria-invalid')
  listBrands.mockRestore()
})
