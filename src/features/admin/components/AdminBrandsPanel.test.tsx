import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'

import { commerceApi } from '@/api/commerce'
import { ToastProvider } from '@/shared/ui'
import { AdminBrandsPanel } from './AdminBrandsPanel'

afterEach(() => vi.restoreAllMocks())

it('lists, creates, edits and soft-deletes brands with the Commerce APIs', async () => {
  const user = userEvent.setup()
  vi.spyOn(commerceApi.brands, 'listAdmin').mockResolvedValue({ items: [{ id: 'b-1', name: 'Local Brand', slug: 'local-brand', is_active: true }] })
  const create = vi.spyOn(commerceApi.brands, 'create').mockResolvedValue({ id: 'b-2', name: 'Nhãn mới', slug: 'nhan-moi', is_active: true })
  const replace = vi.spyOn(commerceApi.brands, 'replace').mockResolvedValue({ id: 'b-1', name: 'Local Brand mới', slug: 'local-brand-moi', is_active: true })
  const remove = vi.spyOn(commerceApi.brands, 'remove').mockResolvedValue(undefined)

  render(<ToastProvider><AdminBrandsPanel /></ToastProvider>)
  expect(await screen.findByText('Local Brand')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Thêm thương hiệu' }))
  await user.type(screen.getByLabelText('Tên thương hiệu'), 'Nhãn mới')
  await user.click(screen.getByRole('button', { name: 'Lưu thương hiệu' }))
  await waitFor(() => expect(create).toHaveBeenCalledWith({ name: 'Nhãn mới', slug: 'nhan-moi', is_active: true }))

  await user.click(screen.getByRole('button', { name: 'Sửa thương hiệu Local Brand' }))
  await user.clear(screen.getByLabelText('Tên thương hiệu'))
  await user.type(screen.getByLabelText('Tên thương hiệu'), 'Local Brand mới')
  await user.clear(screen.getByLabelText('Slug thương hiệu'))
  await user.type(screen.getByLabelText('Slug thương hiệu'), 'local-brand-moi')
  await user.click(screen.getByRole('button', { name: 'Lưu thương hiệu' }))
  await waitFor(() => expect(replace).toHaveBeenCalledWith('b-1', { name: 'Local Brand mới', slug: 'local-brand-moi', is_active: true }))

  await user.click(screen.getByRole('button', { name: 'Xóa thương hiệu Local Brand mới' }))
  await user.click(screen.getByRole('button', { name: 'Ẩn thương hiệu' }))
  await waitFor(() => expect(remove).toHaveBeenCalledWith('b-1'))
})
