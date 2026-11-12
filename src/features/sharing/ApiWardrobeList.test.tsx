import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'

import { ApiError } from '@/shared/api/http'

import { ApiWardrobePage } from './pages/ApiOutfitPages'

const api = vi.hoisted(() => ({ outfits: vi.fn(), deleteOutfit: vi.fn() }))
vi.mock('@/shared/api/communityApi', () => ({ communityApi: api }))
vi.mock('@/features/auth', () => ({ useAuth: () => ({ currentUser: { id: 'owner' } }) }))

const outfit = (id: string, name: string, itemCount: number, categoryCounts?: { category_id: string; category_name: string; count: number }[]) => ({
  outfit_id: id, name, visibility: 'PRIVATE', item_count: itemCount, updated_at: '2026-11-12T00:00:00Z', creation_source: 'MANUAL', category_counts: categoryCounts,
})
const A = '10000000-0000-0000-0000-00000000000a', B = '10000000-0000-0000-0000-00000000000b'
const page = (items: unknown[]) => ({ items, page: 0, size: 20, total_elements: items.length, total_pages: 1 })
const both = page([
  outfit(A, 'Đi chơi', 3, [{ category_id: 'c1', category_name: 'Áo', count: 2 }, { category_id: 'c2', category_name: 'Quần', count: 1 }]),
  outfit(B, 'Đi làm', 2),
])

function renderList() {
  render(<MemoryRouter><ApiWardrobePage /></MemoryRouter>)
}

beforeEach(() => {
  vi.clearAllMocks()
  api.outfits.mockResolvedValue(both)
  api.deleteOutfit.mockResolvedValue(undefined)
})

it('shows the item count and the count per category on each card', async () => {
  renderList()
  expect(await screen.findByText('3 món · 2 áo · 1 quần')).toBeInTheDocument()
  // No category data (Commerce was unreachable): only the total.
  expect(screen.getByText('2 món')).toBeInTheDocument()
})

it('deletes an outfit from the list after confirmation and updates the list at once', async () => {
  const user = userEvent.setup()
  renderList()
  await user.click(await screen.findByRole('button', { name: 'Xóa outfit Đi chơi' }))
  const dialog = screen.getByRole('dialog', { name: 'Xóa outfit' })
  expect(within(dialog).getByText('Xóa outfit “Đi chơi”?')).toBeInTheDocument()
  expect(api.deleteOutfit).not.toHaveBeenCalled()

  api.outfits.mockResolvedValue(page([outfit(B, 'Đi làm', 2)]))
  await user.click(within(dialog).getByRole('button', { name: 'Xác nhận xóa' }))

  await waitFor(() => expect(api.deleteOutfit).toHaveBeenCalledWith(A))
  await waitFor(() => expect(screen.queryByText('Đi chơi')).not.toBeInTheDocument())
  expect(screen.getByText('Đi làm')).toBeInTheDocument()
  expect(screen.queryByRole('dialog', { name: 'Xóa outfit' })).not.toBeInTheDocument()
  await waitFor(() => expect(api.outfits).toHaveBeenCalledTimes(2))
})

it('does not delete when the confirmation is cancelled', async () => {
  const user = userEvent.setup()
  renderList()
  await user.click(await screen.findByRole('button', { name: 'Xóa outfit Đi làm' }))
  await user.click(within(screen.getByRole('dialog', { name: 'Xóa outfit' })).getByRole('button', { name: 'Hủy' }))
  expect(api.deleteOutfit).not.toHaveBeenCalled()
  expect(screen.getByText('Đi làm')).toBeInTheDocument()
})

it('keeps the card and shows a Vietnamese message when deleting fails', async () => {
  api.deleteOutfit.mockRejectedValue(new ApiError(503, 'CATALOG_UNAVAILABLE', 'Product catalog is temporarily unavailable'))
  const user = userEvent.setup()
  renderList()
  await user.click(await screen.findByRole('button', { name: 'Xóa outfit Đi chơi' }))
  const dialog = screen.getByRole('dialog', { name: 'Xóa outfit' })
  await user.click(within(dialog).getByRole('button', { name: 'Xác nhận xóa' }))
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('tạm thời')
  expect(within(dialog).getByRole('alert')).not.toHaveTextContent('Product catalog')
  expect(screen.getAllByText('Đi chơi').length).toBeGreaterThan(0)
})

it('treats an outfit that is already gone (404) as deleted', async () => {
  api.deleteOutfit.mockRejectedValue(new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource was not found'))
  const user = userEvent.setup()
  renderList()
  await user.click(await screen.findByRole('button', { name: 'Xóa outfit Đi chơi' }))
  await user.click(within(screen.getByRole('dialog', { name: 'Xóa outfit' })).getByRole('button', { name: 'Xác nhận xóa' }))
  await waitFor(() => expect(screen.queryByText('Đi chơi')).not.toBeInTheDocument())
})
