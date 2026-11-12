import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/api/http'
import { ManualOutfitBuilderPage } from './pages/ManualOutfitBuilderPage'

const mocks = vi.hoisted(() => ({ list: vi.fn(), categories: vi.fn(), create: vi.fn() }))
vi.mock('@/features/auth', () => ({ useAuth: () => ({ currentUser: { id: '10000000-0000-0000-0000-000000000001' } }) }))
vi.mock('@/app/store/DemoStoreProvider', () => ({ useDemoStore: () => ({ state: { products: [], categories: [] }, dispatch: vi.fn() }) }))
vi.mock('@/api/commerce', () => ({ commerceApi: { products: { list: mocks.list }, categories: { list: mocks.categories } } }))
vi.mock('@/shared/api/communityApi', () => ({ communityApi: { createOutfit: mocks.create } }))

const CAT_SHIRT = 'c1000000-0000-0000-0000-000000000001', CAT_PANTS = 'c2000000-0000-0000-0000-000000000002'
const SHIRT_ID = '20000000-0000-0000-0000-000000000002', PANTS_ID = '20000000-0000-0000-0000-000000000009'
const BLACK_S = '30000000-0000-0000-0000-000000000001', BLACK_M = '30000000-0000-0000-0000-000000000002'
const WHITE_M = '30000000-0000-0000-0000-000000000003', WHITE_L = '30000000-0000-0000-0000-000000000004', PANTS_VARIANT = '30000000-0000-0000-0000-000000000009'

const variant = (id: string, product: string, color: string, size: string, quantity: number, status = 'ACTIVE') => ({
  variant_id: id, product_id: product, sku: id, size, color, material: null, unit_price_vnd: 100000, variant_status: status, available_quantity: quantity,
  images: [{ image_id: id, variant_id: id, image_url: `https://img.test/${id}.jpg`, alt_text: null, display_order: 0, is_primary: true }],
})
const shirt = (blackSStatus = 'ACTIVE') => ({
  product_id: SHIRT_ID, category_id: CAT_SHIRT, brand_id: 'b', category_name: 'Áo', brand_name: 'Style', name: 'Áo thật', description: null, demographic_segment: null, product_status: 'ACTIVE',
  variants: [variant(BLACK_S, SHIRT_ID, 'Đen', 'S', 5, blackSStatus), variant(BLACK_M, SHIRT_ID, 'Đen', 'M', 5), variant(WHITE_M, SHIRT_ID, 'Trắng', 'M', 4), variant(WHITE_L, SHIRT_ID, 'Trắng', 'L', 0)],
})
const pants = {
  product_id: PANTS_ID, category_id: CAT_PANTS, brand_id: 'b', category_name: 'Quần', brand_name: 'Style', name: 'Quần thật', description: null, demographic_segment: null, product_status: 'ACTIVE',
  variants: [variant(PANTS_VARIANT, PANTS_ID, 'Xanh', 'M', 3)],
}

type Query = { keyword?: string; category_id?: string | string[]; page?: number }
function serveCatalog(shirtProduct = shirt()) {
  mocks.list.mockImplementation(async (query: Query) => {
    let items = [shirtProduct, pants]
    const ids = [query.category_id].flat().filter(Boolean)
    if (ids.length) items = items.filter(product => ids.includes(product.category_id))
    if (query.keyword) items = items.filter(product => product.name.toLowerCase().includes(query.keyword!.toLowerCase()))
    return { items, page: query.page ?? 0, size: 6, total_elements: items.length, total_pages: 1 }
  })
}

const scrollIntoView = vi.fn()
beforeEach(() => {
  vi.stubEnv('VITE_COMMUNITY_MODE', 'api')
  for (const mock of [mocks.list, mocks.categories, mocks.create, scrollIntoView]) mock.mockReset()
  mocks.categories.mockResolvedValue({ items: [{ id: CAT_SHIRT, name: 'Áo', slug: 'ao', is_active: true }, { id: CAT_PANTS, name: 'Quần', slug: 'quan', is_active: true }] })
  serveCatalog()
  Element.prototype.scrollIntoView = scrollIntoView
})
afterEach(() => vi.unstubAllEnvs())

function renderPage() {
  render(<MemoryRouter initialEntries={['/wardrobes/new']}><Routes><Route path="/wardrobes/new" element={<ManualOutfitBuilderPage />} /><Route path="/outfits/:outfitId" element={<h1>Chi tiết Outfit thật</h1>} /></Routes></MemoryRouter>)
}
const draft = () => screen.getByRole('region', { name: 'Outfit đang tạo' })
const addButton = (name: string) => screen.findByRole('button', { name: `Thêm ${name} vào outfit` })

it('loads one server page of the catalog and creates the outfit through Wardrobe', async () => {
  mocks.create.mockResolvedValue({ outfit_id: '40000000-0000-0000-0000-000000000004' })
  renderPage()
  const user = userEvent.setup()
  await user.click(await addButton('Áo thật'))
  expect(mocks.list).toHaveBeenCalledWith({ keyword: undefined, category_id: undefined, page: 0, size: 6 })
  await user.type(screen.getByLabelText('Tên outfit'), 'Đi chơi')
  await user.click(screen.getByRole('button', { name: 'Lưu outfit' }))
  await waitFor(() => expect(mocks.create).toHaveBeenCalledWith('Đi chơi', [BLACK_S]))
  expect(await screen.findByRole('heading', { name: 'Chi tiết Outfit thật' })).toBeInTheDocument()
})

it('shows only "Thêm" on the catalog button and names the product in its aria-label', async () => {
  renderPage()
  const button = await addButton('Áo thật')
  expect(button).toHaveTextContent(/^Thêm$/)
})

it('filters by several categories on the server, like the shop', async () => {
  renderPage()
  const user = userEvent.setup()
  await addButton('Áo thật')
  await user.click(await screen.findByRole('button', { name: 'Áo' }))
  await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ category_id: [CAT_SHIRT], page: 0 })))
  expect(screen.queryByRole('button', { name: 'Thêm Quần thật vào outfit' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Quần' }))
  await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ category_id: [CAT_SHIRT, CAT_PANTS] })))
  await user.click(screen.getByRole('button', { name: 'Tất cả' }))
  await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ category_id: undefined })))
})

it('searches by keyword on the server', async () => {
  renderPage()
  const user = userEvent.setup()
  await addButton('Áo thật')
  await user.type(screen.getByLabelText('Tìm sản phẩm cho outfit'), 'Quần')
  await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ keyword: 'Quần', page: 0 })))
  expect(await addButton('Quần thật')).toBeInTheDocument()
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Thêm Áo thật vào outfit' })).not.toBeInTheDocument())
})

it('keeps a snapshot of the chosen product in the draft after the filter changes', async () => {
  renderPage()
  const user = userEvent.setup()
  await user.click(await addButton('Áo thật'))
  await user.click(screen.getByRole('button', { name: 'Quần' }))
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Thêm Áo thật vào outfit' })).not.toBeInTheDocument())
  expect(within(draft()).getByRole('article', { name: 'Áo thật' })).toBeInTheDocument()
  expect(within(draft()).getByRole('button', { name: 'Màu Đen', pressed: true })).toBeInTheDocument()
})

it('does not add the same product twice: it points at the item already in the draft', async () => {
  renderPage()
  const user = userEvent.setup()
  await user.click(await addButton('Áo thật'))
  await user.click(screen.getByRole('button', { name: 'Thêm Áo thật vào outfit' }))
  expect(within(draft()).getAllByRole('article')).toHaveLength(1)
  expect(within(draft()).getByRole('status')).toHaveTextContent('Đã có trong outfit, đổi màu/size tại đây.')
  expect(scrollIntoView).toHaveBeenCalled()
  expect(screen.getByText('Đã có trong outfit', { selector: 'span' })).toBeInTheDocument()
})

it('changes colour then size inside the draft and saves the matching variant', async () => {
  mocks.create.mockResolvedValue({ outfit_id: '40000000-0000-0000-0000-000000000004' })
  renderPage()
  const user = userEvent.setup()
  await user.click(await addButton('Áo thật'))
  const item = within(draft()).getByRole('article', { name: 'Áo thật' })
  // Black S is the default. White has no S: the first size still in stock (M) is picked.
  await user.click(within(item).getByRole('button', { name: 'Màu Trắng' }))
  expect(within(item).getByRole('button', { name: 'Màu Trắng', pressed: true })).toBeInTheDocument()
  expect(within(item).getByRole('button', { name: 'Kích thước M', pressed: true })).toBeInTheDocument()
  // Only the sizes of the chosen colour are offered, sold-out ones stay selectable but dimmed.
  expect(within(item).queryByRole('button', { name: 'Kích thước S' })).not.toBeInTheDocument()
  expect(within(item).getByRole('button', { name: 'Kích thước L' })).toHaveAttribute('title', 'Hết hàng')
  await user.click(within(item).getByRole('button', { name: 'Kích thước L' }))
  await user.type(screen.getByLabelText('Tên outfit'), 'Phối trắng')
  await user.click(screen.getByRole('button', { name: 'Lưu outfit' }))
  await waitFor(() => expect(mocks.create).toHaveBeenCalledWith('Phối trắng', [WHITE_L]))
})

it('groups the draft by category and removes exactly one item per click', async () => {
  renderPage()
  const user = userEvent.setup()
  await user.click(await addButton('Áo thật'))
  await user.click(screen.getByRole('button', { name: 'Thêm Quần thật vào outfit' }))
  expect(within(draft()).getByRole('heading', { name: 'Áo (1)' })).toBeInTheDocument()
  expect(within(draft()).getByRole('heading', { name: 'Quần (1)' })).toBeInTheDocument()
  expect(within(draft()).getAllByRole('article')).toHaveLength(2)

  await user.click(within(draft()).getByRole('button', { name: 'Xóa Áo thật khỏi outfit' }))
  expect(within(draft()).getAllByRole('article')).toHaveLength(1)
  expect(within(draft()).getByRole('article', { name: 'Quần thật' })).toBeInTheDocument()
})

it('marks the invalid fields, moves focus to the first one and shows nothing in English', async () => {
  renderPage()
  const user = userEvent.setup()
  await addButton('Áo thật')
  const name = screen.getByLabelText('Tên outfit')
  await user.click(screen.getByRole('button', { name: 'Lưu outfit' }))
  expect(name).toHaveAttribute('aria-invalid', 'true')
  expect(name).toHaveFocus()
  expect(screen.getByRole('group', { name: 'Các món trong outfit' })).toHaveAttribute('aria-invalid', 'true')
  expect(screen.getByText('Vui lòng thêm ít nhất một món')).toBeInTheDocument()

  await user.type(name, 'Đi chơi')
  expect(name).not.toHaveAttribute('aria-invalid')
  await user.click(screen.getByRole('button', { name: 'Lưu outfit' }))
  expect(screen.getByRole('group', { name: 'Các món trong outfit' })).toHaveFocus()
  expect(mocks.create).not.toHaveBeenCalled()
})

it('translates server error codes instead of showing the English detail', async () => {
  mocks.create.mockRejectedValue(new ApiError(409, 'VARIANT_NOT_ACTIVE', 'Variant does not exist or is inactive'))
  renderPage()
  const user = userEvent.setup()
  await user.click(await addButton('Áo thật'))
  await user.type(screen.getByLabelText('Tên outfit'), 'Đi chơi')
  await user.click(screen.getByRole('button', { name: 'Lưu outfit' }))
  const alert = await screen.findByRole('alert')
  expect(alert).toHaveTextContent('không còn bán')
  expect(alert).not.toHaveTextContent('Variant')
  expect(screen.getByLabelText('Tên outfit')).toHaveValue('Đi chơi')
})

it('warns on an item whose variant was switched off and blocks saving until it is fixed', async () => {
  mocks.create.mockResolvedValue({ outfit_id: '40000000-0000-0000-0000-000000000004' })
  renderPage()
  const user = userEvent.setup()
  await user.click(await addButton('Áo thật'))
  await user.type(screen.getByLabelText('Tên outfit'), 'Đi chơi')
  // The catalog is reloaded and Black S is no longer active.
  serveCatalog(shirt('INACTIVE'))
  await user.click(screen.getByRole('button', { name: 'Áo' }))
  const item = within(draft()).getByRole('article', { name: 'Áo thật' })
  expect(await within(item).findByText(/Phiên bản này không còn bán/)).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Lưu outfit' }))
  expect(mocks.create).not.toHaveBeenCalled()
  expect(screen.getByRole('group', { name: 'Các món trong outfit' })).toHaveAttribute('aria-invalid', 'true')

  // Choosing another size fixes the item.
  await user.click(within(item).getByRole('button', { name: 'Màu Đen' }))
  await user.click(within(item).getByRole('button', { name: 'Kích thước M' }))
  await user.click(screen.getByRole('button', { name: 'Lưu outfit' }))
  await waitFor(() => expect(mocks.create).toHaveBeenCalledWith('Đi chơi', [BLACK_M]))
})

it('shows a retryable error instead of an empty catalog on loading failure', async () => {
  mocks.list.mockRejectedValueOnce(new Error('offline'))
  renderPage()
  expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được sản phẩm')
  await userEvent.setup().click(screen.getByRole('button', { name: 'Thử lại' }))
  expect(await addButton('Áo thật')).toBeInTheDocument()
})

it('keeps the draft and shows an error if saving fails', async () => {
  mocks.create.mockRejectedValue(new Error('Không lưu được outfit'))
  renderPage()
  const user = userEvent.setup()
  await user.click(await addButton('Áo thật'))
  await user.type(screen.getByLabelText('Tên outfit'), 'Đi chơi')
  await user.click(screen.getByRole('button', { name: 'Lưu outfit' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Không lưu được outfit')
  expect(screen.getByLabelText('Tên outfit')).toHaveValue('Đi chơi')
})
