import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { commerceApi } from '@/api/commerce'
import type { CommerceProduct } from '@/api/commerce.types'
import { createDemoSeed } from '@/app/data/demoSeed'
import { ToastProvider } from '@/shared/ui'
import { AdminProductsPanel } from './AdminProductsPanel'

afterEach(() => vi.restoreAllMocks())

it('reads the current variant quantity when opening, returning to the tab and reloading stock', async () => {
  const database = createDemoSeed()
  const product = database.products[0]
  const variant = product.variants[0]
  const getAdmin = vi.spyOn(commerceApi.products, 'getAdmin')
  const response = (quantity: number) => ({
    product_id: product.id,
    variants: [{ variant_id: variant.id, available_quantity: quantity }],
  }) as CommerceProduct
  getAdmin.mockResolvedValueOnce(response(19)).mockResolvedValueOnce(response(20)).mockResolvedValue(response(18))
  const dispatch = vi.fn()
  const user = userEvent.setup()
  render(<ToastProvider><AdminProductsPanel database={database} dispatch={dispatch} /></ToastProvider>)
  const row = screen.getByText(product.name).closest('tr')!
  await user.click(within(row).getByRole('button', { name: /biến thể/ }))

  const stockRow = screen.getByRole('table', { name: 'Biến thể của ' + product.name })
  await waitFor(() => expect(within(stockRow).getByRole('cell', { name: '19' })).toBeVisible())
  fireEvent.focus(window)
  await waitFor(() => expect(within(stockRow).getByRole('cell', { name: '20' })).toBeVisible())
  await user.click(screen.getByRole('button', { name: 'Tải lại tồn kho' }))
  await waitFor(() => expect(within(stockRow).getByRole('cell', { name: '18' })).toBeVisible())
  expect(getAdmin).toHaveBeenCalledTimes(3)
  expect(dispatch).not.toHaveBeenCalled()
})

it('shows a loading error instead of presenting the stored quantity as current stock', async () => {
  const database = createDemoSeed()
  const product = database.products[0]
  vi.spyOn(commerceApi.products, 'getAdmin').mockRejectedValue(new Error('Không kết nối được Commerce.'))
  const user = userEvent.setup()
  render(<ToastProvider><AdminProductsPanel database={database} dispatch={vi.fn()} /></ToastProvider>)
  const row = screen.getByText(product.name).closest('tr')!
  await user.click(within(row).getByRole('button', { name: /biến thể/ }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Không kết nối được Commerce.')
  expect(screen.getByRole('button', { name: 'Tải lại tồn kho' })).toBeEnabled()
})
