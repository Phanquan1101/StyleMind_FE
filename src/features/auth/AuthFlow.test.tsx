import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { appRoutes } from '@/app/router/AppRouter'
import { createDemoSeed } from '@/app/data/demoSeed'
import { DEMO_STORAGE_KEY } from '@/shared/storage/demoStorage'

let router: ReturnType<typeof createMemoryRouter>

function renderAuthAt(initialEntry: string) {
  window.localStorage.clear()
  router = createMemoryRouter(appRoutes, { initialEntries: [initialEntry] })
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
}

function renderProtectedRouteWithLockedSession(initialEntry: string) {
  const database = createDemoSeed()
  window.localStorage.setItem(
    DEMO_STORAGE_KEY,
    JSON.stringify({
      ...database,
      users: database.users.map(user => (user.id === 'usr-customer-01' ? { ...user, status: 'locked' } : user)),
      session: { userId: 'usr-customer-01', persistent: true },
    }),
  )
  router = createMemoryRouter(appRoutes, { initialEntries: [initialEntry] })
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
}

function renderCustomerSessionAt(initialEntry: string) {
  const database = createDemoSeed()
  window.localStorage.setItem(
    DEMO_STORAGE_KEY,
    JSON.stringify({
      ...database,
      session: { userId: 'usr-customer-01', persistent: true },
    }),
  )
  router = createMemoryRouter(appRoutes, { initialEntries: [initialEntry] })
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
}

async function loginWith(email: string, password: string) {
  const user = userEvent.setup()

  await user.type(screen.getByLabelText('Email'), email)
  await user.type(screen.getByLabelText('Mật khẩu'), password)
  await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))
}

function currentPath() {
  return router.state.location.pathname
}

describe('Auth flow', () => {
  it('offers email login and password visibility without Google sign-in', async () => {
    const user = userEvent.setup()
    renderAuthAt('/login')
    expect(await screen.findByLabelText('Email')).toHaveAttribute('autocomplete', 'username')
    expect(screen.queryByRole('button', { name: /Google/ })).not.toBeInTheDocument()
    const password = screen.getByLabelText('Mật khẩu')
    expect(password).toHaveAttribute('type', 'password')
    expect(password).toHaveAttribute('autocomplete', 'current-password')
    await user.click(screen.getByRole('button', { name: 'Hiện mật khẩu' }))
    expect(password).toHaveAttribute('type', 'text')
  })
  it('prefills the last e-mail used to sign in but never the password', async () => {
    renderAuthAt('/login')
    expect(await screen.findByLabelText('Email')).toHaveValue('')
    // renderAuthAt clears storage, so remember the e-mail afterwards and open the login page again.
    window.localStorage.setItem('stylemind_last_login_email', 'an@sm.test')
    await act(async () => { await router.navigate('/register') })
    await act(async () => { await router.navigate('/login') })
    expect(await screen.findByLabelText('Email')).toHaveValue('an@sm.test')
    expect(screen.getByLabelText('Mật khẩu')).toHaveValue('')
    window.localStorage.removeItem('stylemind_last_login_email')
  })
  it('redirects the demo customer to the shop after login', async () => {
    renderAuthAt('/login')

    await loginWith('customer@stylemind.vn', 'StyleMind123!')

    await waitFor(() => expect(currentPath()).toBe('/shop'))
  })

  it('redirects the demo admin to the admin area after login', async () => {
    renderAuthAt('/login')

    await loginWith('admin@stylemind.vn', 'Admin123!')

    await waitFor(() => expect(currentPath()).toBe('/admin'))
    expect(await screen.findByRole('heading', { name: 'Tổng quan quản trị' })).toBeInTheDocument()
  })

  it('logs out the current customer from the header and returns to login', async () => {
    const user = userEvent.setup()
    renderCustomerSessionAt('/shop')

    await user.click(await screen.findByRole('button', { name: 'Đăng xuất' }))

    await waitFor(() => expect(currentPath()).toBe('/login'))
    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument()
  })

  it('clears a session for a locked user and returns to login', async () => {
    renderProtectedRouteWithLockedSession('/account')

    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument()
  })
})
