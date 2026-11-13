import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'

import { AdminShell } from './AdminShell'

const badges = vi.hoisted(() => ({ value: { orders: 3, payments: 2, requests: 1 } }))
vi.mock('@/features/admin/dashboard/useAdminDashboard', () => ({ useAdminNavBadges: () => badges.value }))

function renderShell() {
  return render(<MemoryRouter initialEntries={['/admin']}>
    <AdminShell activeSection="overview" adminName="Admin" adminEmail="admin@example.test" onLogout={vi.fn()}><p>Nội dung</p></AdminShell>
  </MemoryRouter>)
}

it('shows black counters on Đơn hàng, Thanh toán and Yêu cầu only', () => {
  badges.value = { orders: 3, payments: 2, requests: 1 }
  renderShell()
  expect(screen.getByRole('link', { name: 'Đơn hàng, 3 cần xử lý' })).toHaveTextContent('3')
  expect(screen.getByRole('link', { name: 'Thanh toán, 2 cần xử lý' })).toHaveTextContent('2')
  expect(screen.getByRole('link', { name: 'Yêu cầu, 1 cần xử lý' })).toHaveTextContent('1')
  expect(screen.getByRole('link', { name: 'Tổng quan' })).not.toHaveTextContent(/\d/)
  expect(screen.getByRole('link', { name: 'Sản phẩm' })).not.toHaveTextContent(/\d/)
  expect(screen.getByRole('link', { name: 'Tài khoản' })).not.toHaveTextContent(/\d/)
})

it('hides zero counters and caps big ones', () => {
  badges.value = { orders: 0, payments: 150, requests: 0 }
  renderShell()
  expect(screen.getByRole('link', { name: 'Đơn hàng' })).not.toHaveTextContent(/\d/)
  expect(screen.getByRole('link', { name: 'Yêu cầu' })).not.toHaveTextContent(/\d/)
  expect(screen.getByRole('link', { name: 'Thanh toán, 150 cần xử lý' })).toHaveTextContent('99+')
})
