import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { createDemoSeed } from '@/app/data/demoSeed'
import { AppProviders } from '@/app/providers/AppProviders'
import { appRoutes } from '@/app/router/AppRouter'
import type { DemoDatabase } from '@/app/store/types'
import { DEMO_STORAGE_KEY } from '@/shared/storage/demoStorage'

const owner = 'usr-customer-01', friend = 'usr-friend-01'
function database(overrides: Partial<DemoDatabase> = {}): DemoDatabase {
  return { ...createDemoSeed(), session: { userId: owner, persistent: true }, friendships: [{ id: 'pair', userAId: owner, userBId: friend, active: true, establishedAt: 1 }], ...overrides }
}
function stored(): DemoDatabase { return JSON.parse(window.localStorage.getItem(DEMO_STORAGE_KEY)!) }
function renderRoute(path: string, db = database()) {
  window.localStorage.clear()
  window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(db))
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] })
  const result = render(<AppProviders><RouterProvider router={router} /></AppProviders>)
  return { ...result, router }
}
const privateOutfit = () => stored().outfits.find(o => o.id === 'outfit-work-minimal')!

// Replaces the obsolete email-grants / whole-wardrobe-sharing acceptance tests.
describe('Per-Outfit sharing flow', () => {
  it('does not change visibility on Cancel or Escape and reopens with the saved mode', async () => {
    const user = userEvent.setup(); renderRoute('/outfits/outfit-work-minimal')
    await user.click(await screen.findByRole('button', { name: 'Chia sẻ outfit' }))
    const dialog = screen.getByRole('dialog', { name: 'Chia sẻ outfit' })
    await user.click(within(dialog).getByRole('radio', { name: /Bạn bè/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Hủy' }))
    expect(privateOutfit().visibility).toBe('private')
    await user.click(screen.getByRole('button', { name: 'Chia sẻ outfit' }))
    expect(screen.getByRole('radio', { name: /Riêng tư/ })).toBeChecked()
    await user.click(screen.getByRole('radio', { name: /Công khai/ }))
    await user.keyboard('{Escape}')
    expect(privateOutfit().visibility).toBe('private')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it('saves only this Outfit, persists FRIENDS after reload, and retains its PUBLIC link across off/on', async () => {
    const user = userEvent.setup(); const view = renderRoute('/outfits/outfit-work-minimal')
    async function save(label: RegExp) {
      await user.click(await screen.findByRole('button', { name: 'Chia sẻ outfit' }))
      await user.click(screen.getByRole('radio', { name: label }))
      await user.click(screen.getByRole('button', { name: 'Lưu chế độ' }))
    }
    await save(/Công khai/)
    await waitFor(() => expect(privateOutfit().visibility).toBe('public'))
    const token = privateOutfit().publicToken
    expect(token).toBeTruthy()
    await save(/Bạn bè/)
    expect(privateOutfit().publicToken).toBe(token)
    expect(stored().outfits.find(o => o.id === 'outfit-ai-cafe')?.visibility).toBe('public')
    const persisted = stored(); view.unmount()
    renderRoute('/outfits/outfit-work-minimal', persisted)
    await user.click(await screen.findByRole('button', { name: 'Chia sẻ outfit' }))
    expect(screen.getByRole('radio', { name: /Bạn bè/ })).toBeChecked()
    await user.click(screen.getByRole('radio', { name: /Công khai/ }))
    await user.click(screen.getByRole('button', { name: 'Lưu chế độ' }))
    expect(privateOutfit().publicToken).toBe(token)
    await user.click(screen.getByRole('button', { name: 'Chia sẻ outfit' }))
    expect((screen.getByLabelText('Liên kết công khai') as HTMLInputElement).value).toContain(`/shared/outfits/${token}`)
  })
  it('offers per-Outfit sharing instead of creating email grants on the wardrobe page', async () => {
    renderRoute('/wardrobes')
    expect(await screen.findByRole('heading', { name: 'Tủ đồ của tôi' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Chia sẻ tủ đồ' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Outfit bạn bè' })).toHaveAttribute('href', '/shared-with-me')
    expect(screen.getByText(/Chọn từng Outfit/)).toBeInTheDocument()
  })
  it('lets a friend see only FRIENDS and PUBLIC outfits, without owner tools', async () => {
    const db = database({ session: { userId: friend, persistent: true } })
    db.outfits = [...db.outfits.map(o => o.id === 'outfit-work-minimal' ? { ...o, visibility: 'friends' as const } : o), { ...db.outfits[0], id: 'hidden', name: 'Private secret', visibility: 'private' }]
    const user = userEvent.setup(); renderRoute('/shared-with-me/usr-customer-01', db)
    expect(await screen.findByRole('heading', { name: /Tủ đồ của Nguyễn Thiên An/ })).toBeInTheDocument()
    expect(screen.queryByText('Private secret')).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: /Di lam toi gian/ }))
    expect(await screen.findByRole('heading', { name: 'Di lam toi gian' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Tên outfit')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Chia sẻ outfit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'AI chỉnh outfit' })).not.toBeInTheDocument()
  })
  it('links Friends to the correct wardrobe and removes FRIENDS access immediately after unfriend', async () => {
    const db = database({ session: { userId: friend, persistent: true } })
    db.outfits = db.outfits.map(o => ({ ...o, visibility: 'friends' }))
    const user = userEvent.setup(); const { router } = renderRoute('/friends', db)
    expect(await screen.findByRole('link', { name: 'Xem Outfit của Nguyễn Thiên An' })).toHaveAttribute('href', '/shared-with-me/usr-customer-01')
    await user.click(screen.getByRole('button', { name: 'Hủy kết bạn với Nguyễn Thiên An' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Hủy kết bạn' }))
    await router.navigate('/outfits/outfit-work-minimal')
    expect(await screen.findByRole('heading', { name: 'Không tìm thấy outfit' })).toBeInTheDocument()
    await router.navigate('/shared-with-me/usr-customer-01')
    expect(await screen.findByRole('heading', { name: 'Không thể mở tủ đồ' })).toBeInTheDocument()
  })
  it('does not give an old email grantee access to a PRIVATE outfit', async () => {
    renderRoute('/outfits/outfit-work-minimal', database({ session: { userId: friend, persistent: true }, friendships: [] }))
    expect(await screen.findByRole('heading', { name: 'Không tìm thấy outfit' })).toBeInTheDocument()
  })
  it('renders guest public Outfit without customer navigation or owner controls', async () => {
    renderRoute('/shared/outfits/pub-cafe-cuoi-tuan', database({ session: null }))
    expect(await screen.findByRole('heading', { name: 'Cafe cuoi tuan' })).toBeInTheDocument()
    expect(screen.getByText('Áo dệt kim cổ lọ')).toBeInTheDocument()
    expect(screen.queryByText('Nguyễn Thiên An')).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Chia sẻ outfit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'AI chỉnh outfit' })).not.toBeInTheDocument()
  })
  it('keeps old public wardrobe links limited to PUBLIC outfits', async () => {
    renderRoute('/shared/wardrobes/old-public', database({ session: null, wardrobeSettings: [{ ownerId: owner, visibility: 'public', updatedAt: '2026-10-31' }], wardrobePublicLinks: [{ id: 'old', ownerId: owner, token: 'old-public', active: true, createdAt: '2026-10-31' }] }))
    expect(await screen.findByRole('heading', { name: /Tủ đồ của Nguyễn Thiên An/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Cafe cuoi tuan' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Di lam toi gian' })).not.toBeInTheDocument()
  })
  it('shows friend wardrobe empty state without counting or previewing private outfits', async () => {
    const db = database({ session: { userId: friend, persistent: true } })
    db.outfits = db.outfits.map(o => ({ ...o, visibility: 'private' }))
    renderRoute('/shared-with-me', db)
    expect(await screen.findByRole('heading', { name: 'Outfit bạn bè' })).toBeInTheDocument()
    expect(screen.getByText('0 Outfit có thể xem')).toBeInTheDocument()
    expect(screen.queryByText('Di lam toi gian')).not.toBeInTheDocument()
    expect(screen.queryByText('Cafe cuoi tuan')).not.toBeInTheDocument()
  })
  it('retires old email restore controls on the access page', async () => {
    renderRoute('/wardrobes/access')
    expect(await screen.findByText(/không còn cấp quyền/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Chia sẻ lại' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Mở chat' })).not.toBeInTheDocument()
  })
})

