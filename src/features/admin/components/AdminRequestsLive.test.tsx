import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import type { DemoDatabase } from '@/app/store/types'
import { ToastProvider } from '@/shared/ui'
import { AdminRequestsPanel } from './AdminRequestsPanel'

it('offers the return/refund tab when talking to the real backend', () => {
  const database = { cancellationRequests: [], returnRequests: [], users: [] } as unknown as DemoDatabase
  render(<MemoryRouter><ToastProvider><AdminRequestsPanel database={database} dispatch={vi.fn()} reviewerId="admin" /></ToastProvider></MemoryRouter>)
  expect(screen.getByRole('button', { name: 'Hủy đơn' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Trả hàng / Hoàn tiền' })).toBeInTheDocument()
})
