import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { createDemoSeed } from '@/app/data/demoSeed'
import { AppProviders } from '@/app/providers/AppProviders'
import { appRoutes } from '@/app/router/AppRouter'
import { DEMO_STORAGE_KEY } from '@/shared/storage/demoStorage'
import {
  deactivateMockVariant,
  failCommerceRequest,
  getCommerceMockCalls,
  holdCommerceRequests,
  mockImage,
  mockProduct,
  seedCommerceCatalog,
} from '@/test/commerceMockBackend'
import { failWardrobeRequest, getWardrobeMockCalls, getWardrobeMockOutfits, holdWardrobeRequests } from '@/test/wardrobeMockBackend'

const CATEGORY_TOPS = 'b0000000-0000-4000-8000-000000000001'
const CATEGORY_BOTTOMS = 'b0000000-0000-4000-8000-000000000002'
const SEARCH_LABEL = 'Tìm sản phẩm cho outfit'

function renderBuilder() {
  window.localStorage.clear()
  window.localStorage.setItem(
    DEMO_STORAGE_KEY,
    JSON.stringify({ ...createDemoSeed(), session: { userId: 'usr-customer-01', persistent: true } }),
  )
  const router = createMemoryRouter(appRoutes, { initialEntries: ['/wardrobes/new'] })

  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )

  return router
}

function blouse() {
  return mockProduct({ name: 'Áo blouse cổ vuông', category_id: CATEGORY_TOPS }, [
    { color: 'Trắng', size: 'M', unit_price_vnd: 450000 },
    { color: 'Trắng', size: 'L', unit_price_vnd: 460000 },
    { color: 'Đen', size: 'M', unit_price_vnd: 470000 },
  ])
}

function trousers() {
  return mockProduct({ name: 'Quần ống suông', category_id: CATEGORY_BOTTOMS }, [{ color: 'Đen', size: 'S', unit_price_vnd: 300000 }])
}

function seedDefaultCatalog() {
  const products = [blouse(), trousers()]
  seedCommerceCatalog({
    products,
    categories: [
      { id: CATEGORY_TOPS, name: 'Áo', slug: 'ao', is_active: true },
      { id: CATEGORY_BOTTOMS, name: 'Quần', slug: 'quan', is_active: true },
    ],
  })
  return products
}

async function addVariant(user: UserEvent, productName: string, color: string, size: string) {
  await user.click(await screen.findByRole('button', { name: `Chọn phiên bản ${productName}` }))
  await user.click(screen.getByRole('button', { name: `Màu ${color}` }))
  await user.click(screen.getByRole('button', { name: `Kích cỡ ${size}` }))
  await user.click(screen.getByRole('button', { name: `Thêm ${productName} vào outfit` }))
}

function draftPanel() {
  return within(screen.getByRole('region', { name: 'Outfit đang tạo' }))
}

describe('Manual outfit builder', () => {
  it('searches the Commerce catalog and adds an active colour and size to the draft', async () => {
    const user = userEvent.setup()
    seedDefaultCatalog()
    renderBuilder()

    expect(await screen.findByRole('button', { name: 'Chọn phiên bản Quần ống suông' })).toBeInTheDocument()
    await user.type(screen.getByLabelText(SEARCH_LABEL), 'blouse')

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Chọn phiên bản Quần ống suông' })).not.toBeInTheDocument())
    expect(getCommerceMockCalls().some(call => call.path.includes('keyword=blouse'))).toBe(true)

    await addVariant(user, 'Áo blouse cổ vuông', 'Đen', 'M')
    expect(draftPanel().getByRole('button', { name: 'Xóa Áo blouse cổ vuông khỏi draft' })).toBeInTheDocument()
    expect(draftPanel().getByRole('combobox', { name: 'Đổi phiên bản draft Áo blouse cổ vuông' })).toHaveDisplayValue('Đen · M')
  })

  it('does not show the answer of a search that was replaced by a newer one', async () => {
    const user = userEvent.setup()
    seedCommerceCatalog({
      products: [
        mockProduct({ name: 'Áo abc cũ' }, [{ color: 'Trắng', size: 'M' }]),
        mockProduct({ name: 'Quần zzz mới' }, [{ color: 'Đen', size: 'S' }]),
      ],
    })
    renderBuilder()
    await screen.findByRole('button', { name: 'Chọn phiên bản Quần zzz mới' })
    const releaseOld = holdCommerceRequests('GET', /keyword=abc/)
    const input = screen.getByLabelText(SEARCH_LABEL)

    await user.type(input, 'abc')
    await waitFor(() => expect(getCommerceMockCalls().some(call => call.path.includes('keyword=abc'))).toBe(true))
    await user.clear(input)
    await user.type(input, 'zzz')
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Chọn phiên bản Áo abc cũ' })).not.toBeInTheDocument())
    expect(await screen.findByRole('button', { name: 'Chọn phiên bản Quần zzz mới' })).toBeInTheDocument()

    releaseOld()
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(screen.queryByRole('button', { name: 'Chọn phiên bản Áo abc cũ' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Chọn phiên bản Quần zzz mới' })).toBeInTheDocument()
  })

  it('filters by category and loads the next page of 12 without duplicates', async () => {
    const user = userEvent.setup()
    const many = Array.from({ length: 14 }, (_, index) =>
      mockProduct({ name: `Áo số ${String(index).padStart(2, '0')}`, category_id: CATEGORY_TOPS }, [{ color: 'Trắng', size: 'M' }]),
    )
    seedCommerceCatalog({
      products: [...many, trousers()],
      categories: [
        { id: CATEGORY_TOPS, name: 'Áo', slug: 'ao', is_active: true },
        { id: CATEGORY_BOTTOMS, name: 'Quần', slug: 'quan', is_active: true },
      ],
    })
    renderBuilder()

    const select = await screen.findByLabelText('Danh mục')
    await within(select).findByRole('option', { name: 'Áo' })
    await user.selectOptions(select, 'Áo')
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Chọn phiên bản Quần ống suông' })).not.toBeInTheDocument())
    expect(await screen.findAllByRole('button', { name: /^Chọn phiên bản Áo số/ })).toHaveLength(12)
    expect(getCommerceMockCalls().some(call => call.path.includes(`category_id=${CATEGORY_TOPS}`) && call.path.includes('size=12'))).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Tải thêm' }))
    await waitFor(() => expect(screen.getAllByRole('button', { name: /^Chọn phiên bản Áo số/ })).toHaveLength(14))
    expect(screen.queryByRole('button', { name: 'Tải thêm' })).not.toBeInTheDocument()
  })

  it('shows empty and error states of the catalog search', async () => {
    const user = userEvent.setup()
    seedDefaultCatalog()
    renderBuilder()
    await screen.findByRole('button', { name: 'Chọn phiên bản Quần ống suông' })

    await user.type(screen.getByLabelText(SEARCH_LABEL), 'không có sản phẩm này')
    expect(await screen.findByText('Không có sản phẩm phù hợp.')).toBeInTheDocument()

    failCommerceRequest('GET', /\/products\?/, 500, 'INTERNAL_ERROR')
    await user.type(screen.getByLabelText(SEARCH_LABEL), ' nữa')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Hệ thống đang gặp sự cố')
    expect(within(alert).getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
  })

  it('handles variants without colour or size and products without an image', async () => {
    const user = userEvent.setup()
    seedCommerceCatalog({
      products: [
        mockProduct({ name: 'Khăn lụa' }, [{ color: null, size: null, images: [] }]),
        mockProduct({ name: 'Túi xách', brand_name: null }, [{ color: 'Nâu', size: null, images: [mockImage({ image_url: '/api/v1/variant-images/bag/content' })] }]),
      ],
    })
    renderBuilder()

    expect(await screen.findByRole('img', { name: 'Chưa có ảnh Khăn lụa' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Ảnh sản phẩm' })).toHaveAttribute('src', '/commerce/api/v1/variant-images/bag/content')
    await addVariant(user, 'Khăn lụa', 'Mặc định', 'Một cỡ')
    expect(draftPanel().getByText('Mặc định · Một cỡ')).toBeInTheDocument()
    expect(draftPanel().getByRole('img', { name: 'Chưa có ảnh Khăn lụa' })).toBeInTheDocument()
  })

  it('refuses a duplicate variant, changes and removes draft items, and stops at 10 items', async () => {
    const user = userEvent.setup()
    const products = seedDefaultCatalog()
    renderBuilder()

    await addVariant(user, 'Áo blouse cổ vuông', 'Trắng', 'M')
    await user.click(screen.getByRole('button', { name: 'Màu Trắng' }))
    expect(screen.getByRole('button', { name: 'Kích cỡ M (đã có)' })).toBeDisabled()

    await user.selectOptions(draftPanel().getByLabelText('Đổi phiên bản draft Áo blouse cổ vuông'), 'Đen · M')
    expect(draftPanel().getByRole('heading', { name: 'Áo blouse cổ vuông' }).parentElement).toHaveTextContent('Đen · M')

    await user.click(draftPanel().getByRole('button', { name: 'Xóa Áo blouse cổ vuông khỏi draft' }))
    expect(draftPanel().getByText('Chưa có món nào trong outfit')).toBeInTheDocument()

    expect(products).toHaveLength(2)
  })

  it('caps the draft at 10 items', async () => {
    const user = userEvent.setup()
    seedCommerceCatalog({
      products: Array.from({ length: 11 }, (_, index) => mockProduct({ name: `Món ${String(index).padStart(2, '0')}` }, [{ color: 'Đen', size: 'M' }])),
    })
    renderBuilder()

    for (let index = 0; index < 10; index += 1) {
      await addVariant(user, `Món ${String(index).padStart(2, '0')}`, 'Đen', 'M')
    }
    await user.click(await screen.findByRole('button', { name: 'Chọn phiên bản Món 10' }))
    await user.click(screen.getByRole('button', { name: 'Màu Đen' }))
    await user.click(screen.getByRole('button', { name: 'Kích cỡ M' }))

    expect(screen.getByRole('button', { name: 'Thêm Món 10 vào outfit' })).toBeDisabled()
    expect(screen.getAllByText('Outfit đã đủ 10 món.').length).toBeGreaterThan(0)
  })

  it('requires a name and at least one item before saving', async () => {
    const user = userEvent.setup()
    seedDefaultCatalog()
    renderBuilder()
    await screen.findByRole('button', { name: 'Chọn phiên bản Quần ống suông' })

    await user.click(draftPanel().getByRole('button', { name: 'Lưu outfit' }))
    expect(await screen.findByText('Vui lòng nhập tên outfit')).toBeInTheDocument()
    expect(screen.getByText('Vui lòng thêm ít nhất một món')).toBeInTheDocument()

    await addVariant(user, 'Quần ống suông', 'Đen', 'S')
    await user.type(draftPanel().getByLabelText(/^Tên outfit/), 'x'.repeat(101))
    await user.click(draftPanel().getByRole('button', { name: 'Lưu outfit' }))
    expect(await screen.findByText('Tên outfit tối đa 100 ký tự')).toBeInTheDocument()
    expect(getWardrobeMockCalls()).toHaveLength(0)
  })

  it('saves a manual outfit through the backend and opens its detail page', async () => {
    const user = userEvent.setup()
    seedDefaultCatalog()
    const router = renderBuilder()

    await addVariant(user, 'Áo blouse cổ vuông', 'Trắng', 'L')
    await addVariant(user, 'Quần ống suông', 'Đen', 'S')
    await user.type(draftPanel().getByLabelText(/^Tên outfit/), '  Outfit đi làm  ')
    await user.click(draftPanel().getByRole('button', { name: 'Lưu outfit' }))

    expect(await screen.findByRole('heading', { name: 'Outfit đi làm' })).toBeInTheDocument()
    const [post] = getWardrobeMockCalls().filter(call => call.method === 'POST')
    expect(post.path).toBe('/wardrobe-community/api/v1/me/outfits')
    expect(post.body).toMatchObject({ name: 'Outfit đi làm', creation_source: 'MANUAL' })
    expect((post.body?.items as unknown[]).length).toBe(2)
    const saved = getWardrobeMockOutfits('usr-customer-01')[0]
    expect(router.state.location.pathname).toBe(`/outfits/${saved.outfit_id}`)
    expect(saved.items.map(item => item.unit_price_vnd)).toEqual([460000, 300000])
  })

  it('locks the form while saving so a double click sends one request', async () => {
    const user = userEvent.setup()
    seedDefaultCatalog()
    renderBuilder()
    await addVariant(user, 'Quần ống suông', 'Đen', 'S')
    await user.type(draftPanel().getByLabelText(/^Tên outfit/), 'Một lần thôi')
    const release = holdWardrobeRequests('POST', /outfits$/)
    const save = draftPanel().getByRole('button', { name: 'Lưu outfit' })

    await user.click(save)
    await waitFor(() => expect(save).toBeDisabled())
    await user.click(save)
    release()

    expect(await screen.findByRole('heading', { name: 'Một lần thôi' })).toBeInTheDocument()
    expect(getWardrobeMockCalls().filter(call => call.method === 'POST')).toHaveLength(1)
  })

  it('marks discontinued items after VARIANT_NOT_ACTIVE and lets the customer save once they are removed', async () => {
    const user = userEvent.setup()
    const [shirt, pants] = seedDefaultCatalog()
    renderBuilder()
    await addVariant(user, 'Áo blouse cổ vuông', 'Trắng', 'M')
    await addVariant(user, 'Quần ống suông', 'Đen', 'S')
    await user.type(draftPanel().getByLabelText(/^Tên outfit/), 'Có món ngừng bán')
    deactivateMockVariant(pants.variants[0].variant_id)

    await user.click(draftPanel().getByRole('button', { name: 'Lưu outfit' }))

    expect(await draftPanel().findByText('Ngừng bán')).toBeInTheDocument()
    expect(draftPanel().getByRole('alert')).toHaveTextContent('Một số món đã ngừng bán')
    expect(getCommerceMockCalls().some(call => call.method === 'POST' && call.path.endsWith('/variants/batch-lookup'))).toBe(true)

    await user.click(draftPanel().getByRole('button', { name: 'Lưu outfit' }))
    expect(await draftPanel().findByText(/Hãy xóa hoặc đổi phiên bản trước khi lưu/)).toBeInTheDocument()
    expect(getWardrobeMockCalls().filter(call => call.method === 'POST')).toHaveLength(1)

    await user.click(draftPanel().getByRole('button', { name: 'Xóa Quần ống suông khỏi draft' }))
    await user.click(draftPanel().getByRole('button', { name: 'Lưu outfit' }))
    expect(await screen.findByRole('heading', { name: 'Có món ngừng bán' })).toBeInTheDocument()
    expect(getWardrobeMockOutfits('usr-customer-01')[0].items.map(item => item.variant_id)).toEqual([shirt.variants[0].variant_id])
  })

  it.each([
    ['OUTFIT_LIMIT_REACHED', 409, 'Bạn đã đạt số outfit tối đa.'],
    ['CATALOG_UNAVAILABLE', 503, 'Không tải được thông tin sản phẩm lúc này'],
  ])('shows the Vietnamese message for %s and keeps the draft', async (code, status, message) => {
    const user = userEvent.setup()
    seedDefaultCatalog()
    renderBuilder()
    await addVariant(user, 'Quần ống suông', 'Đen', 'S')
    await user.type(draftPanel().getByLabelText(/^Tên outfit/), 'Giữ nguyên draft')
    failWardrobeRequest('POST', /outfits$/, status, code)

    await user.click(draftPanel().getByRole('button', { name: 'Lưu outfit' }))

    expect(await draftPanel().findByRole('alert')).toHaveTextContent(message)
    expect(draftPanel().getByRole('button', { name: 'Xóa Quần ống suông khỏi draft' })).toBeInTheDocument()
    expect(draftPanel().getByLabelText(/^Tên outfit/)).toHaveValue('Giữ nguyên draft')
    expect(draftPanel().getByRole('button', { name: 'Lưu outfit' })).toBeEnabled()
  })
})
