import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { createDemoSeed } from '@/app/data/demoSeed'
import { BuilderCatalogPanel } from './BuilderCatalogPanel'

const seed = createDemoSeed().products.find(product => product.active && product.variants.some(variant => variant.active))!
const products = Array.from({ length: 3 }, (_, index) => ({ ...seed, id: `test-${index}`, name: `Áo số ${index}` }))

function renderPanel(overrides: Partial<Parameters<typeof BuilderCatalogPanel>[0]> = {}) {
  const props = {
    products,
    search: '',
    onSearchChange: vi.fn(),
    categories: [{ id: 'c1', label: 'Áo' }, { id: 'c2', label: 'Quần' }],
    selectedCategoryIds: [] as string[],
    onToggleCategory: vi.fn(),
    onClearCategories: vi.fn(),
    pagination: { page: 2, totalPages: 3, total: 15 },
    onPageChange: vi.fn(),
    draftProductIds: new Set<string>(),
    onAddProduct: vi.fn(),
    ...overrides,
  }
  render(<BuilderCatalogPanel {...props} />)
  return props
}

it('shows the server page and asks for the previous/next page', async () => {
  const props = renderPanel()
  const user = userEvent.setup()
  expect(screen.getByText(/Trang 2 \/ 3 · 15 sản phẩm/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Trang sau' }))
  expect(props.onPageChange).toHaveBeenLastCalledWith(3)
  await user.click(screen.getByRole('button', { name: 'Trang trước' }))
  expect(props.onPageChange).toHaveBeenLastCalledWith(1)
})

it('disables the page buttons at both ends', () => {
  renderPanel({ pagination: { page: 1, totalPages: 1, total: 3 } })
  expect(screen.getByRole('button', { name: 'Trang trước' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Trang sau' })).toBeDisabled()
})

it('toggles category chips and marks the selected ones', async () => {
  const props = renderPanel({ selectedCategoryIds: ['c2'] })
  const user = userEvent.setup()
  expect(screen.getByRole('button', { name: 'Quần', pressed: true })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Tất cả', pressed: false })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Áo' }))
  expect(props.onToggleCategory).toHaveBeenCalledWith('c1')
  await user.click(screen.getByRole('button', { name: 'Tất cả' }))
  expect(props.onClearCategories).toHaveBeenCalled()
})

it('adds a product through the "Thêm" button and marks products already in the draft', async () => {
  const props = renderPanel({ draftProductIds: new Set(['test-1']) })
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Thêm Áo số 0 vào outfit' }))
  expect(props.onAddProduct).toHaveBeenCalledWith(expect.objectContaining({ id: 'test-0' }))
  expect(screen.getAllByText('Đã có trong outfit')).toHaveLength(1)
})
