import { Bell, Search, ShoppingBag, UserRound } from 'lucide-react'
import { FormEvent, useState, type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { useDemoStore } from '@/app/store/DemoStoreProvider'

const navItems = [
  { to: ROUTES.home, label: 'Trang chủ' },
  { to: ROUTES.shop, label: 'Cửa hàng' },
  { to: ROUTES.aiWardrobe, label: 'Tủ đồ AI' },
  { to: ROUTES.wardrobes, label: 'Tủ đồ của tôi' },
]

export function CustomerHeader() {
  const navigate = useNavigate()
  const { state } = useDemoStore()
  const [query, setQuery] = useState('')
  const cartCount = state.cartLines.reduce((total, line) => total + line.quantity, 0)
  const currentUserId = state.session?.userId ?? 'usr-customer-01'
  const unreadCount = state.notifications.filter(item => item.userId === currentUserId && !item.read).length

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = query.trim()
    navigate(trimmed ? `${ROUTES.shop}?q=${encodeURIComponent(trimmed)}` : ROUTES.shop)
    setQuery('')
  }

  return (
    <header className="sticky top-0 z-[var(--z-sticky)] border-b border-[#EEE8E1] bg-[#FAF8F5]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[var(--container-wide)] items-center gap-5 px-5 md:px-8">
        <Link to={ROUTES.home} className="flex flex-none items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#684B5A]">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#684B5A] font-display text-sm font-semibold text-white">S</span>
          <span className="font-display text-xl font-semibold text-[#222222]">StyleMind</span>
        </Link>
        <nav aria-label="Điều hướng chính" className="hidden items-center gap-1 md:flex">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === ROUTES.home}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#684B5A] ${
                  isActive ? 'bg-[#F4E7E8] text-[#684B5A]' : 'text-[#6F6B67] hover:bg-[#EEE8E1] hover:text-[#222222]'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <form onSubmit={handleSubmit} className="relative">
            <label htmlFor="site-search" className="sr-only">
              Tìm kiếm sản phẩm
            </label>
            <Search aria-hidden="true" size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9D9894]" />
            <input
              id="site-search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Tìm áo, đầm, blazer"
              className="h-10 w-64 rounded-lg border border-[#D8D0C6] bg-white pl-9 pr-3 text-sm font-medium text-[#222222] outline-none transition focus:border-[#684B5A] focus:ring-2 focus:ring-[#684B5A]/20"
            />
          </form>
          <HeaderIconLink to={ROUTES.notifications} label={`Thông báo (${unreadCount} chưa đọc)`} count={unreadCount}>
            <Bell size={18} aria-hidden="true" />
          </HeaderIconLink>
          <HeaderIconLink to={ROUTES.cart} label={`Giỏ hàng (${cartCount} sản phẩm)`} count={cartCount}>
            <ShoppingBag size={18} aria-hidden="true" />
          </HeaderIconLink>
          <HeaderIconLink to={ROUTES.account} label="Tài khoản">
            <UserRound size={18} aria-hidden="true" />
          </HeaderIconLink>
        </div>
      </div>
    </header>
  )
}

function HeaderIconLink({ to, label, count, children }: { to: string; label: string; count?: number; children: ReactNode }) {
  return (
    <Link
      to={to}
      aria-label={label}
      className="relative inline-grid h-10 w-10 place-items-center rounded-lg text-[#3A3632] transition hover:bg-[#EEE8E1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#684B5A]"
    >
      {children}
      {Boolean(count) && (
        <span className="absolute right-1 top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-[#684B5A] px-1 text-[10px] font-bold leading-none text-white">
          {count}
        </span>
      )}
    </Link>
  )
}
