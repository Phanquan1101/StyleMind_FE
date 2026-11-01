import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { createDemoSeed } from '@/app/data/demoSeed'
import { AppProviders } from '@/app/providers/AppProviders'
import { appRoutes } from '@/app/router/AppRouter'
import { DEMO_STORAGE_KEY } from '@/shared/storage/demoStorage'
import { mockProduct, seedCommerceCatalog } from '@/test/commerceMockBackend'
import {
  failWardrobeRequest,
  getWardrobeMockCalls,
  getWardrobeMockOutfits,
  holdWardrobeRequests,
  mockOutfitItem,
  resetWardrobeMockBackend,
  seedWardrobeOutfits,
  type MockOutfit,
} from '@/test/wardrobeMockBackend'

const CUSTOMER = 'usr-customer-01'
const ADMIN = 'usr-admin-01'
const OUTFIT_ID = '11111111-1111-4111-8111-111111111111'
const ITEM_1 = '21111111-1111-4111-8111-111111111111'
const ITEM_2 = '21111111-1111-4111-8111-222222222222'
const ITEM_3 = '21111111-1111-4111-8111-333333333333'

function renderAt(initialEntry: string, userId = CUSTOMER) {
  window.localStorage.clear()
  window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ ...createDemoSeed(), session: { userId, persistent: true } }))
  const router = createMemoryRouter(appRoutes, { initialEntries: [initialEntry] })

  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )

  return router
}

function outfit(overrides: Partial<MockOutfit> = {}): MockOutfit {
  return {
    outfit_id: OUTFIT_ID,
    name: 'Đi làm tối giản',
    creation_source: 'MANUAL',
    created_at: '2026-10-01T08:00:00Z',
    updated_at: '2026-10-02T08:00:00Z',
    items: [
      mockOutfitItem({ outfit_item_id: ITEM_1, variant_id: '31111111-1111-4111-8111-111111111111', product_name: 'Áo blouse cổ vuông' }),
      mockOutfitItem({
        outfit_item_id: ITEM_2,
        variant_id: '31111111-1111-4111-8111-222222222222',
        display_order: 1,
        product_name: 'Quần ống suông',
        color: 'Đen',
        size: 'S',
        unit_price_vnd: 300000,
        image_url: '/api/v1/variant-images/abc/content',
      }),
    ],
    ...overrides,
  }
}

function detailCalls(method: string) {
  return getWardrobeMockCalls().filter(call => call.method === method && call.path.endsWith(OUTFIT_ID))
}

describe('Backend wardrobe list', () => {
  it('shows an empty state without promises when the customer has no outfits', async () => {
    seedWardrobeOutfits(CUSTOMER, [])
    renderAt('/wardrobes')

    expect(await screen.findByRole('heading', { name: 'Bạn chưa có outfit nào' })).toBeInTheDocument()
  })

  it('loads 20 outfits per page and appends the next page without duplicates', async () => {
    const user = userEvent.setup()
    const many = Array.from({ length: 25 }, (_, index) =>
      outfit({
        outfit_id: `11111111-1111-4111-8111-${String(index).padStart(12, '0')}`,
        name: `Outfit số ${String(index).padStart(2, '0')}`,
        updated_at: `2026-10-${String(30 - index).padStart(2, '0')}T08:00:00Z`,
      }),
    )
    seedWardrobeOutfits(CUSTOMER, many)
    renderAt('/wardrobes')

    expect(await screen.findAllByRole('link', { name: /^Outfit số \d{2}/ })).toHaveLength(20)
    await user.click(screen.getByRole('button', { name: 'Tải thêm' }))
    await waitFor(() => expect(screen.getAllByRole('link', { name: /^Outfit số \d{2}/ })).toHaveLength(25))
    expect(screen.queryByRole('button', { name: 'Tải thêm' })).not.toBeInTheDocument()
    expect(getWardrobeMockCalls().map(call => call.path)).toEqual([
      '/wardrobe-community/api/v1/me/outfits?page=0&size=20',
      '/wardrobe-community/api/v1/me/outfits?page=1&size=20',
    ])
  })

  it('shows an error with a retry button and recovers on retry', async () => {
    const user = userEvent.setup()
    failWardrobeRequest('GET', /\/me\/outfits$/, 500, 'INTERNAL_ERROR')
    renderAt('/wardrobes')

    expect(await screen.findByRole('alert')).toHaveTextContent('Hệ thống đang gặp sự cố')
    resetWardrobeMockBackend()
    seedWardrobeOutfits(CUSTOMER, [outfit()])
    await user.click(screen.getByRole('button', { name: 'Thử lại' }))

    expect(await screen.findByRole('link', { name: /Đi làm tối giản/ })).toBeInTheDocument()
  })

  it('hides the wardrobe from an ADMIN account and explains the missing permission when opened directly', async () => {
    renderAt('/wardrobes', ADMIN)

    expect(await screen.findByText('Tài khoản của bạn không có quyền dùng Tủ đồ.')).toBeInTheDocument()
    const navigation = screen.getByRole('navigation', { name: 'Điều hướng chính' })
    expect(within(navigation).queryByRole('link', { name: 'Tủ đồ' })).not.toBeInTheDocument()
    expect(within(navigation).getByRole('link', { name: 'Quản trị' })).toBeInTheDocument()
  })
})

describe('Backend outfit detail', () => {
  it('shows current products, images, discontinued items and a total without them', async () => {
    seedWardrobeOutfits(CUSTOMER, [
      outfit({
        items: [
          mockOutfitItem({ outfit_item_id: ITEM_1, variant_id: '31111111-1111-4111-8111-111111111111', product_name: 'Áo blouse cổ vuông' }),
          mockOutfitItem({
            outfit_item_id: ITEM_2,
            variant_id: '31111111-1111-4111-8111-222222222222',
            product_name: 'Quần ống suông',
            unit_price_vnd: 300000,
            image_url: '/api/v1/variant-images/abc/content',
          }),
          mockOutfitItem({
            outfit_item_id: ITEM_3,
            variant_id: '31111111-1111-4111-8111-333333333333',
            product_name: 'Áo khoác cũ',
            unit_price_vnd: 999000,
            available: false,
          }),
        ],
      }),
    ])
    renderAt(`/outfits/${OUTFIT_ID}`)

    expect(await screen.findByRole('heading', { name: 'Đi làm tối giản' })).toBeInTheDocument()
    expect(screen.getByAltText('Áo blouse cổ vuông')).toHaveAttribute('src', 'https://res.cloudinary.com/demo/image/upload/blouse.jpg')
    expect(screen.getByAltText('Quần ống suông')).toHaveAttribute('src', '/commerce/api/v1/variant-images/abc/content')
    expect(screen.getByText('Ngừng bán')).toBeInTheDocument()
    expect(screen.getByText('Tổng giá').parentElement).toHaveTextContent(/750.000/)
    expect(screen.queryByText(/999.000/)).not.toBeInTheDocument()
    // Cart and product links stay hidden until Shop and Cart are connected.
    expect(screen.queryByRole('button', { name: /vào giỏ/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Áo blouse cổ vuông/ })).not.toBeInTheDocument()
  })

  it('renames in place without reloading, trims, and skips unchanged or invalid names', async () => {
    const user = userEvent.setup()
    seedWardrobeOutfits(CUSTOMER, [outfit()])
    renderAt(`/outfits/${OUTFIT_ID}`)
    const input = await screen.findByLabelText('Tên outfit')
    const save = screen.getByRole('button', { name: 'Lưu tên outfit' })

    await user.click(save)
    expect(detailCalls('PATCH')).toHaveLength(0)

    await user.clear(input)
    await user.click(save)
    expect(await screen.findByText('Vui lòng nhập tên outfit')).toBeInTheDocument()
    fireEvent.change(input, { target: { value: 'x'.repeat(101) } })
    await user.click(save)
    expect(await screen.findByText('Tên outfit tối đa 100 ký tự')).toBeInTheDocument()
    expect(detailCalls('PATCH')).toHaveLength(0)

    await user.clear(input)
    await user.type(input, '  Cuối tuần  ')
    await user.click(save)

    expect(await screen.findByRole('heading', { name: 'Cuối tuần' })).toBeInTheDocument()
    expect(detailCalls('PATCH')).toHaveLength(1)
    expect(detailCalls('PATCH')[0].body).toEqual({ name: 'Cuối tuần' })
    expect(detailCalls('GET')).toHaveLength(1)
    expect(getWardrobeMockOutfits(CUSTOMER)[0].name).toBe('Cuối tuần')
  })

  it('disables removal while the request runs, then removes the item and blocks the last one', async () => {
    const user = userEvent.setup()
    seedWardrobeOutfits(CUSTOMER, [outfit()])
    renderAt(`/outfits/${OUTFIT_ID}`)
    const removeBlouse = await screen.findByRole('button', { name: 'Xóa món Áo blouse cổ vuông' })
    const removeTrousers = screen.getByRole('button', { name: 'Xóa món Quần ống suông' })
    const release = holdWardrobeRequests('DELETE', /\/items\//)

    await user.click(removeBlouse)
    await waitFor(() => expect(removeBlouse).toBeDisabled())
    expect(removeTrousers).toBeDisabled()
    await user.click(removeTrousers)
    release()

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Xóa món Áo blouse cổ vuông' })).not.toBeInTheDocument())
    expect(getWardrobeMockCalls().filter(call => call.method === 'DELETE')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Xóa món Quần ống suông' })).toBeDisabled()
    expect(screen.getByText(/Outfit còn một món/)).toBeInTheDocument()
  })

  it('shows the Vietnamese message when the server still answers OUTFIT_LAST_ITEM', async () => {
    const user = userEvent.setup()
    seedWardrobeOutfits(CUSTOMER, [outfit()])
    failWardrobeRequest('DELETE', /\/items\//, 409, 'OUTFIT_LAST_ITEM')
    renderAt(`/outfits/${OUTFIT_ID}`)

    await user.click(await screen.findByRole('button', { name: 'Xóa món Áo blouse cổ vuông' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Outfit phải còn ít nhất một món')
    expect(screen.getByRole('button', { name: 'Xóa món Áo blouse cổ vuông' })).toBeEnabled()
  })

  it('asks for confirmation before deleting the outfit and returns to the list', async () => {
    const user = userEvent.setup()
    seedWardrobeOutfits(CUSTOMER, [outfit()])
    renderAt(`/outfits/${OUTFIT_ID}`)

    await user.click(await screen.findByRole('button', { name: 'Xóa outfit' }))
    let dialog = await screen.findByRole('dialog', { name: 'Xóa outfit' })
    await user.click(within(dialog).getByRole('button', { name: 'Hủy' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(detailCalls('DELETE')).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Xóa outfit' }))
    dialog = await screen.findByRole('dialog', { name: 'Xóa outfit' })
    const release = holdWardrobeRequests('DELETE', /outfits\/[^/]+$/)
    const confirm = within(dialog).getByRole('button', { name: 'Xóa outfit' })
    await user.click(confirm)
    await waitFor(() => expect(confirm).toBeDisabled())
    expect(within(dialog).getByRole('button', { name: 'Hủy' })).toBeDisabled()
    release()

    expect(await screen.findByRole('heading', { name: 'Tủ đồ của tôi' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Bạn chưa có outfit nào' })).toBeInTheDocument()
    expect(screen.getByText('Đã xóa outfit')).toBeInTheDocument()
    expect(detailCalls('DELETE')).toHaveLength(1)
  })

  it('shows a not-found screen for an outfit the account does not own', async () => {
    seedWardrobeOutfits(CUSTOMER, [outfit()])
    renderAt('/outfits/11111111-1111-4111-8111-999999999999')

    expect(await screen.findByRole('heading', { name: 'Không tìm thấy outfit' })).toBeInTheDocument()
  })

  it('shows a catalog message with a retry button when Commerce is unavailable', async () => {
    const user = userEvent.setup()
    failWardrobeRequest('GET', new RegExp(`${OUTFIT_ID}$`), 503, 'CATALOG_UNAVAILABLE')
    renderAt(`/outfits/${OUTFIT_ID}`)

    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được thông tin sản phẩm lúc này')
    resetWardrobeMockBackend()
    seedWardrobeOutfits(CUSTOMER, [outfit()])
    await user.click(screen.getByRole('button', { name: 'Thử lại' }))

    expect(await screen.findByRole('heading', { name: 'Đi làm tối giản' })).toBeInTheDocument()
  })

  it('tells an ADMIN account it has no permission instead of showing an outfit', async () => {
    renderAt(`/outfits/${OUTFIT_ID}`, ADMIN)

    expect(await screen.findByText('Tài khoản của bạn không có quyền dùng Tủ đồ.')).toBeInTheDocument()
  })
})

function seedEditingScenario(itemCount = 2) {
  const blouse = mockProduct({ name: 'Áo blouse cổ vuông' }, [
    { color: 'Trắng', size: 'M', unit_price_vnd: 450000 },
    { color: 'Trắng', size: 'L', unit_price_vnd: 460000 },
    { color: 'Đen', size: 'M', unit_price_vnd: 470000 },
  ])
  const trousers = mockProduct({ name: 'Quần ống suông' }, [{ color: 'Đen', size: 'S', unit_price_vnd: 300000 }])
  const scarf = mockProduct({ name: 'Khăn lụa' }, [{ color: 'Đỏ', size: 'M', unit_price_vnd: 150000 }])
  const extras = Array.from({ length: 8 }, (_, index) => mockProduct({ name: `Phụ kiện ${index}` }, [{ color: 'Đen', size: 'M' }]))
  seedCommerceCatalog({ products: [blouse, trousers, scarf, ...extras] })
  const variantOf = (product: { variants: Array<{ variant_id: string }> }, index = 0) => product.variants[index].variant_id
  const items = [
    mockOutfitItem({ outfit_item_id: ITEM_1, variant_id: variantOf(blouse), product_id: blouse.product_id, product_name: blouse.name, color: 'Trắng', size: 'M' }),
    mockOutfitItem({ outfit_item_id: ITEM_2, variant_id: variantOf(trousers), product_id: trousers.product_id, product_name: trousers.name, color: 'Đen', size: 'S', display_order: 1 }),
    ...extras.slice(0, itemCount - 2).map((product, index) =>
      mockOutfitItem({
        outfit_item_id: `21111111-1111-4111-8111-${String(index + 10).padStart(12, '0')}`,
        variant_id: variantOf(product),
        product_id: product.product_id,
        product_name: product.name,
        display_order: index + 2,
      }),
    ),
  ]
  seedWardrobeOutfits(CUSTOMER, [outfit({ items })])
  return { blouse, trousers, scarf }
}

describe('Backend outfit item editing', () => {
  it('adds an item from the catalog picker and shows it without reloading the list', async () => {
    const user = userEvent.setup()
    seedEditingScenario()
    renderAt(`/outfits/${OUTFIT_ID}`)

    await user.click(await screen.findByRole('button', { name: 'Thêm món' }))
    const panel = await screen.findByRole('region', { name: 'Thêm món vào outfit' })
    await user.click(await within(panel).findByRole('button', { name: 'Chọn phiên bản Khăn lụa' }))
    await user.click(within(panel).getByRole('button', { name: 'Kích cỡ M' }))
    await user.click(within(panel).getByRole('button', { name: 'Thêm Khăn lụa vào outfit' }))

    expect(await screen.findByRole('heading', { name: 'Khăn lụa' })).toBeInTheDocument()
    expect(await screen.findByText('Đã thêm món vào outfit')).toBeInTheDocument()
    const posts = getWardrobeMockCalls().filter(call => call.method === 'POST')
    expect(posts).toHaveLength(1)
    expect(posts[0].path).toBe(`/wardrobe-community/api/v1/me/outfits/${OUTFIT_ID}/items`)
    expect(Object.keys(posts[0].body ?? {})).toEqual(['variant_id'])
    expect(getWardrobeMockOutfits(CUSTOMER)[0].items).toHaveLength(3)
  })

  it('marks variants already in the outfit and blocks adding them again', async () => {
    const user = userEvent.setup()
    seedEditingScenario()
    renderAt(`/outfits/${OUTFIT_ID}`)

    await user.click(await screen.findByRole('button', { name: 'Thêm món' }))
    const panel = await screen.findByRole('region', { name: 'Thêm món vào outfit' })
    await user.click(await within(panel).findByRole('button', { name: 'Chọn phiên bản Quần ống suông' }))

    expect(within(panel).getByRole('button', { name: 'Kích cỡ S (đã có)' })).toBeDisabled()
    expect(within(panel).getByRole('button', { name: 'Thêm Quần ống suông vào outfit' })).toBeDisabled()
  })

  it.each(['OUTFIT_ITEM_DUPLICATE', 'OUTFIT_ITEM_LIMIT_REACHED', 'VARIANT_NOT_ACTIVE'])(
    'keeps the outfit unchanged and shows an error when adding fails with %s',
    async code => {
      const user = userEvent.setup()
      seedEditingScenario()
      renderAt(`/outfits/${OUTFIT_ID}`)
      await user.click(await screen.findByRole('button', { name: 'Thêm món' }))
      const panel = await screen.findByRole('region', { name: 'Thêm món vào outfit' })
      await user.click(await within(panel).findByRole('button', { name: 'Chọn phiên bản Khăn lụa' }))
      await user.click(within(panel).getByRole('button', { name: 'Kích cỡ M' }))
      failWardrobeRequest('POST', /\/items$/, 409, code)

      await user.click(within(panel).getByRole('button', { name: 'Thêm Khăn lụa vào outfit' }))

      expect(await within(panel).findByRole('alert')).not.toHaveTextContent(/^$/)
      expect(getWardrobeMockOutfits(CUSTOMER)[0].items).toHaveLength(2)
    },
  )

  it('disables "Thêm món" once the outfit has 10 items', async () => {
    seedEditingScenario(10)
    renderAt(`/outfits/${OUTFIT_ID}`)

    expect(await screen.findByRole('button', { name: 'Thêm món' })).toBeDisabled()
    expect(screen.getAllByText('Outfit đã đủ 10 món.').length).toBeGreaterThan(0)
  })

  it('changes the colour and size of an item with a PATCH', async () => {
    const user = userEvent.setup()
    seedEditingScenario()
    renderAt(`/outfits/${OUTFIT_ID}`)

    await user.click(await screen.findByRole('button', { name: 'Đổi màu/size Áo blouse cổ vuông' }))
    const dialog = await screen.findByRole('dialog', { name: 'Đổi màu/size Áo blouse cổ vuông' })
    await user.click(await within(dialog).findByRole('button', { name: 'Màu Đen' }))
    await user.click(within(dialog).getByRole('button', { name: 'Kích cỡ M' }))
    await user.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('Đã đổi phiên bản')).toBeInTheDocument()
    const patches = getWardrobeMockCalls().filter(call => call.method === 'PATCH' && call.path.endsWith(`/items/${ITEM_1}`))
    expect(patches).toHaveLength(1)
    expect(Object.keys(patches[0].body ?? {})).toEqual(['variant_id'])
    expect(getWardrobeMockOutfits(CUSTOMER)[0].items[0]).toMatchObject({ color: 'Đen', size: 'M', unit_price_vnd: 470000 })
  })

  it('keeps save disabled until another variant is picked and reports a duplicate', async () => {
    const user = userEvent.setup()
    const { blouse } = seedEditingScenario()
    renderAt(`/outfits/${OUTFIT_ID}`)

    await user.click(await screen.findByRole('button', { name: 'Đổi màu/size Áo blouse cổ vuông' }))
    const dialog = await screen.findByRole('dialog', { name: 'Đổi màu/size Áo blouse cổ vuông' })
    await within(dialog).findByRole('button', { name: 'Màu Trắng' })
    expect(within(dialog).getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Kích cỡ M (đang chọn)' })).toBeDisabled()

    await user.click(within(dialog).getByRole('button', { name: 'Kích cỡ L' }))
    failWardrobeRequest('PATCH', /\/items\//, 409, 'OUTFIT_ITEM_DUPLICATE')
    await user.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }))

    expect(await within(dialog).findByRole('alert')).not.toHaveTextContent(/^$/)
    expect(getWardrobeMockOutfits(CUSTOMER)[0].items[0].variant_id).toBe(blouse.variants[0].variant_id)
  })

  it('offers to remove the item when its variant is no longer available (OUTFIT_ITEM_UNAVAILABLE)', async () => {
    const user = userEvent.setup()
    seedEditingScenario()
    renderAt(`/outfits/${OUTFIT_ID}`)

    await user.click(await screen.findByRole('button', { name: 'Đổi màu/size Áo blouse cổ vuông' }))
    const dialog = await screen.findByRole('dialog', { name: 'Đổi màu/size Áo blouse cổ vuông' })
    await user.click(await within(dialog).findByRole('button', { name: 'Màu Đen' }))
    await user.click(within(dialog).getByRole('button', { name: 'Kích cỡ M' }))
    failWardrobeRequest('PATCH', /\/items\//, 409, 'OUTFIT_ITEM_UNAVAILABLE')
    await user.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }))

    await user.click(await within(dialog).findByRole('button', { name: 'Xóa món này khỏi outfit' }))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Áo blouse cổ vuông' })).not.toBeInTheDocument())
    expect(getWardrobeMockOutfits(CUSTOMER)[0].items).toHaveLength(1)
  })

  it('has no change button for a discontinued item', async () => {
    seedEditingScenario()
    const [saved] = getWardrobeMockOutfits(CUSTOMER)
    seedWardrobeOutfits(CUSTOMER, [{ ...saved, items: saved.items.map(item => (item.outfit_item_id === ITEM_1 ? { ...item, available: false } : item)) }])
    renderAt(`/outfits/${OUTFIT_ID}`)

    expect(await screen.findByRole('heading', { name: 'Quần ống suông' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đổi màu/size Quần ống suông' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Đổi màu\/size Áo blouse/ })).not.toBeInTheDocument()
  })
})
