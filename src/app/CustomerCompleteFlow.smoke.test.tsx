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

  it('creates an AI outfit shares it publicly and opens the public viewer', async () => {
    const user = userEvent.setup()
    const router = renderAt('/wardrobes/new/ai')

    await user.type(await screen.findByLabelText('Tin nhắn cho AI Stylist'), 'Tôi cần outfit đi làm tối giản với áo và chân váy')
    await user.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }))
    await screen.findByRole('region', { name: 'Gợi ý outfit từ AI' })
    await user.type(screen.getByLabelText('Tên outfit AI'), 'Outfit AI public smoke')
    await user.click(screen.getByRole('button', { name: 'Lưu outfit AI' }))

    expect(await screen.findByRole('heading', { name: 'Outfit AI public smoke' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Bật link công khai' }))

    let publicToken = ''
    await waitFor(() => {
      const outfit = getDatabase().outfits.find(item => item.name === 'Outfit AI public smoke')
      expect(outfit).toMatchObject({ visibility: 'public' })
      expect(outfit?.publicToken).toBeTruthy()
      publicToken = outfit?.publicToken ?? ''
    })

    await act(async () => {
      await router.navigate(`/shared/outfits/${publicToken}`)
    })

    expect(await screen.findByRole('heading', { name: 'Outfit AI public smoke' })).toBeInTheDocument()
    expect(screen.queryByText(/Giỏ hàng/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Đơn hàng/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Chiều cao|Cân nặng/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Tin nhắn cho AI Stylist')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Chia sẻ outfit' })).not.toBeInTheDocument()
  }, 10_000)
})
