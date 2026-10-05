import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { createDemoSeed } from '@/app/data/demoSeed'
import { AppProviders } from '@/app/providers/AppProviders'
import { appRoutes } from '@/app/router/AppRouter'
import type { DemoDatabase } from '@/app/store/types'
import type { OutfitShare } from '@/entities/share/model/types'
import type { User } from '@/entities/user/model/types'
import { DEMO_STORAGE_KEY } from '@/shared/storage/demoStorage'

function databaseWithCustomer(overrides: Partial<DemoDatabase> = {}): DemoDatabase {
  return {
    ...createDemoSeed(),
    session: { userId: 'usr-customer-01', persistent: true },
    ...overrides,
  }
}

function viewerUser(email = 'friend@stylemind.vn'): User {
  return {
    id: 'usr-viewer-01',
    role: 'customer',
    status: 'active',
    fullName: 'Lê Mai',
    email,
    password: '123456',
    avatarInitials: 'LM',
    createdAt: '2026-09-27T09:00:00.000Z',
  }
}

function persistDatabase(database: DemoDatabase) {
  window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(database))
}

function getDatabase() {
  const raw = window.localStorage.getItem(DEMO_STORAGE_KEY)
  if (!raw) throw new Error('Expected database in localStorage')
  return JSON.parse(raw) as DemoDatabase
}

function renderRoute(path: string, database = databaseWithCustomer()) {
  window.localStorage.clear()
  persistDatabase(database)
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] })

  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )

  return router
}

describe('Sharing flow', () => {
  it('grants view access to one email for one outfit', async () => {
    const user = userEvent.setup()
    renderRoute('/outfits/outfit-work-minimal')

    await user.type(await screen.findByLabelText('Email được chia sẻ'), 'newfriend@stylemind.vn')
    await user.click(screen.getByRole('button', { name: 'Chia sẻ outfit' }))

    expect(await screen.findByText('newfriend@stylemind.vn')).toBeInTheDocument()
    await waitFor(() => {
      expect(
        getDatabase().outfitShares.some(
          share =>
            share.outfitId === 'outfit-work-minimal' &&
            share.viewerEmail === 'newfriend@stylemind.vn' &&
            share.active,
        ),
      ).toBe(true)
    })
  })

  it('revokes access without affecting another outfit share', async () => {
    const user = userEvent.setup()
    const workShare: OutfitShare = {
      id: 'share-work-friend-active',
      outfitId: 'outfit-work-minimal',
      ownerId: 'usr-customer-01',
      viewerEmail: 'friend@stylemind.vn',
      permission: 'view',
      active: true,
      createdAt: '2026-09-26T09:00:00.000Z',
    }
    renderRoute('/outfits/outfit-work-minimal', databaseWithCustomer({
      outfitShares: [...createDemoSeed().outfitShares, workShare],
    }))

    await user.click(await screen.findByRole('button', { name: 'Thu hồi friend@stylemind.vn' }))

    await waitFor(() => {
      const database = getDatabase()
      expect(database.outfitShares.find(share => share.id === 'share-work-friend-active')?.active).toBe(false)
      expect(database.outfitShares.find(share => share.id === 'share-cafe-friend')?.active).toBe(true)
    })
  })

  it('enables and disables a public link for one outfit', async () => {
    const user = userEvent.setup()
    renderRoute('/outfits/outfit-work-minimal')

    await user.click(await screen.findByRole('button', { name: 'Bật link công khai' }))
    expect(await screen.findByText(/\/shared\/outfits\/public-outfit-work-minimal/)).toBeInTheDocument()
    await waitFor(() => {
      const outfit = getDatabase().outfits.find(item => item.id === 'outfit-work-minimal')
      expect(outfit).toMatchObject({ visibility: 'public', publicToken: 'public-outfit-work-minimal' })
    })

    await user.click(screen.getByRole('button', { name: 'Tắt link công khai' }))
    await waitFor(() => {
      const outfit = getDatabase().outfits.find(item => item.id === 'outfit-work-minimal')
      expect(outfit?.visibility).toBe('private')
      expect(outfit?.publicToken).toBeUndefined()
    })
  })

  it('lists only outfits shared to the current customers email', async () => {
    const viewer = viewerUser()
    renderRoute('/shared-with-me', databaseWithCustomer({
      users: [...createDemoSeed().users, viewer],
      session: { userId: viewer.id, persistent: true },
    }))

    expect(await screen.findByRole('heading', { name: 'Cafe cuoi tuan' })).toBeInTheDocument()
    expect(screen.queryByText('Di lam toi gian')).not.toBeInTheDocument()
  })

  it('renders a public outfit without height weight address orders cart or AI chat history', async () => {
    renderRoute('/shared/outfits/pub-cafe-cuoi-tuan', databaseWithCustomer({ session: null }))

    expect(await screen.findByRole('heading', { name: 'Cafe cuoi tuan' })).toBeInTheDocument()
    expect(screen.getByText('Áo dệt kim cổ lọ')).toBeInTheDocument()
    expect(screen.queryByText(/160/)).not.toBeInTheDocument()
    expect(screen.queryByText(/52/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Nguyễn Thiên An/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Đơn hàng/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Giỏ hàng/)).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'AI chỉnh outfit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Chia sẻ outfit' })).not.toBeInTheDocument()
  })

  it('prevents viewers from editing sharing renaming deleting or asking AI', async () => {
    const viewer = viewerUser()
    renderRoute('/outfits/outfit-ai-cafe', databaseWithCustomer({
      users: [...createDemoSeed().users, viewer],
      session: { userId: viewer.id, persistent: true },
    }))

    expect(await screen.findByRole('heading', { name: 'Cafe cuoi tuan' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Tên outfit')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'AI chỉnh outfit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Chia sẻ outfit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Xóa/ })).not.toBeInTheDocument()

    const itemGrid = screen.getByRole('region', { name: 'Các món trong outfit được chia sẻ' })
    expect(within(itemGrid).getByText('Áo dệt kim cổ lọ')).toBeInTheDocument()
  })
})
