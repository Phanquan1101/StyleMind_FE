import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import { ToastProvider } from '@/shared/ui'
import { AdminCustomersPanel } from './AdminCustomersPanel'

vi.mock('@/features/auth', () => ({ useAuth: () => ({ currentUser: { id: 'admin' } }) }))
vi.mock('@/shared/api/identityApi', () => ({
  identityApi: { listUsers: vi.fn().mockResolvedValue({ items: [], total_pages: 0, total_elements: 0 }) },
  identityErrorMessage: () => 'Không thể tải danh sách tài khoản.',
}))

it('does not offer creating accounts from administration (not supported)', async () => {
  render(<ToastProvider><AdminCustomersPanel /></ToastProvider>)
  expect(await screen.findByRole('heading', { name: 'Tài khoản' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Tạo tài khoản' })).not.toBeInTheDocument()
})
