import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { createDemoSeed } from '@/app/data/demoSeed'
import { AppProviders } from '@/app/providers/AppProviders'
import { appRoutes } from '@/app/router/AppRouter'
import type { DemoDatabase } from '@/app/store/types'
import { DEMO_STORAGE_KEY } from '@/shared/storage/demoStorage'

function databaseWithCustomer(overrides: Partial<DemoDatabase> = {}): DemoDatabase {
  return {
    ...createDemoSeed(),
    session: { userId: 'usr-customer-01', persistent: true },
    orders: [],
    cancellationRequests: [],
    returnRequests: [],
    ...overrides,
  }
}

function persistDatabase(database: DemoDatabase) {
  window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(database))
}

function getDatabase() {
  const raw = window.localStorage.getItem(DEMO_STORAGE_KEY)
  if (!raw) throw new Error('Expected demo database in localStorage')
  return JSON.parse(raw) as DemoDatabase
}

function renderAt(initialEntry: string, database = databaseWithCustomer()) {
  window.localStorage.clear()
  window.sessionStorage.clear()
  persistDatabase(database)
  const router = createMemoryRouter(appRoutes, { initialEntries: [initialEntry] })

  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )

  return router
}

describe('complete customer flow smoke', () => {
  it('updates body info creates a manual outfit adds it to cart checks out and views the order', async () => {
    const user = userEvent.setup()
    const router = renderAt('/account')

    await user.clear(await screen.findByLabelText('Chiều cao (cm)'))
    await user.type(screen.getByLabelText('Chiều cao (cm)'), '166')
    await user.clear(screen.getByLabelText('Cân nặng (kg)'))
    await user.type(screen.getByLabelText('Cân nặng (kg)'), '53')
    await user.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }))

    await waitFor(() => {
      const customer = getDatabase().users.find(userRecord => userRecord.id === 'usr-customer-01')
      expect(customer).toMatchObject({ heightCm: 166, weightKg: 53 })
    })

    await act(async () => {
      await router.navigate('/wardrobes/new')
    })
    await user.click(await screen.findByRole('button', { name: 'Thêm Áo blouse cổ vuông' }))
    await user.type(screen.getByLabelText('Tên outfit'), 'Outfit smoke đi làm')
    await user.click(screen.getByRole('button', { name: 'Lưu outfit' }))

    expect(await screen.findByRole('heading', { name: 'Outfit smoke đi làm' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Thêm toàn bộ outfit vào giỏ' }))
    await user.click(await screen.findByLabelText(/Giỏ hàng/))
    await user.click(screen.getByRole('button', { name: 'Tiến hành thanh toán' }))

    await user.click(await screen.findByLabelText('Thanh toán khi nhận hàng'))
    await user.click(screen.getByRole('button', { name: 'Đặt hàng' }))

    await user.click(await screen.findByRole('link', { name: 'Xem chi tiết đơn hàng' }))
    expect(await screen.findByRole('heading', { name: /^Đơn ORD-/ })).toBeInTheDocument()
    expect(getDatabase().orders).toHaveLength(1)
  }, 10_000)

  it('creates a private AI outfit then publishes only that outfit', async () => {
    const user = userEvent.setup()
    renderAt('/wardrobes/new/ai')

    await user.type(await screen.findByLabelText('Tin nhắn cho AI Stylist'), 'Tôi cần outfit đi làm tối giản với áo và chân váy')
    await user.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }))
    await screen.findByRole('region', { name: 'Gợi ý outfit từ AI' })
    await user.type(screen.getByLabelText('Tên outfit AI'), 'Outfit AI public smoke')
    await user.click(screen.getByRole('button', { name: 'Lưu outfit AI' }))

    expect(await screen.findByRole('heading', { name: 'Outfit AI public smoke' })).toBeInTheDocument()
    expect(getDatabase().outfits.find(item => item.name === 'Outfit AI public smoke')?.visibility).toBe('private')
    const originalShares = getDatabase().outfitShares
    await user.click(screen.getByRole('button', { name: 'Chia sẻ outfit' }))
    await user.click(screen.getByRole('radio', { name: /Công khai/ }))
    await user.click(screen.getByRole('button', { name: 'Lưu chế độ' }))

    await waitFor(() => {
      const database = getDatabase()
      const created = database.outfits.find(item => item.name === 'Outfit AI public smoke')
      expect(created?.visibility).toBe('public')
      expect(created?.publicToken).toBeTruthy()
      expect(database.outfits.find(item => item.id === 'outfit-work-minimal')?.visibility).toBe('private')
      expect(database.outfitShares).toEqual(originalShares)
    })
  }, 10_000)
})
