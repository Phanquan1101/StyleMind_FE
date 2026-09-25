import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { appRoutes } from '@/app/router/AppRouter'

function renderCustomerLayout(initialEntry = '/') {
  const router = createMemoryRouter(appRoutes, { initialEntries: [initialEntry] })
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
}

describe('CustomerLayout', () => {
  it('does not expose Travel Planner or Visual Studio navigation', () => {
    renderCustomerLayout('/')

    expect(screen.getAllByRole('link', { name: 'Trang chủ' }).length).toBeGreaterThan(0)
    expect(screen.queryByText('Travel Planner')).not.toBeInTheDocument()
    expect(screen.queryByText('Visual Studio')).not.toBeInTheDocument()
  })

  it('keeps deferred wardrobe navigation reachable without changing its domain behavior', async () => {
    renderCustomerLayout('/wardrobes')

    expect(await screen.findByRole('heading', { name: 'Tủ đồ AI đang được hoàn thiện' })).toBeInTheDocument()
  })
})
