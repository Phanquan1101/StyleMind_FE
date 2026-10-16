import { useState } from 'react'
import Home from './screens/Home'
import Shop from './screens/Shop'
import AIStylest from './screens/AIStylest'
import Wardrobe from './screens/Wardrobe'
import OutfitResult from './screens/OutfitResult'
import TravelPlanner from './screens/TravelPlanner'
import ProductDetail from './screens/ProductDetail'
import Studio from './screens/Studio'
import Cart from './screens/Cart'
import Checkout from './screens/Checkout'
import OrderTracking from './screens/OrderTracking'
import Profile from './screens/Profile'
import Admin from './screens/Admin'
import type { ScreenName, NavigationOptions, AppState, CartItem, NotificationItem } from './types'
import { initialCartItems, mockNotifications } from './data/mockData'
import IconButton from './components/ui/IconButton'

export type { AppState, ScreenName, NavigationOptions }

const navLinks: { screen: ScreenName; label: string }[] = [
  { screen: 'shop', label: "Cửa hàng" },
  { screen: 'ai-stylist', label: "Tư vấn AI" },
  { screen: 'wardrobe', label: "Tủ đồ của tôi" },
  { screen: 'travel', label: "Lên đồ du lịch" },
  { screen: 'studio', label: "Phòng thử đồ" },
]

const mobileNav: { screen: ScreenName; label: string; icon: string }[] = [
  { screen: 'home', label: "Trang chủ", icon: '⌂' },
  { screen: 'shop', label: "Cửa hàng", icon: '⊕' },
  { screen: 'ai-stylist', label: "Tư vấn", icon: '✦' },
  { screen: 'wardrobe', label: "Tủ đồ", icon: '▣' },
  { screen: 'profile', label: "Hồ sơ", icon: '○' },
]

export default function App() {
  const [screen, setScreen] = useState<ScreenName>('home')
  const [opts, setOpts] = useState<NavigationOptions>({})
  const [cartItems, setCartItems] = useState<CartItem[]>(initialCartItems)
  const [notifications, setNotifications] = useState<NotificationItem[]>(mockNotifications)
  const [loggedIn, setLoggedIn] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchVal, setSearchVal] = useState('')
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false)

  const cartCount = cartItems.reduce((acc, item) => acc + item.qty, 0)
  const unreadNotifs = notifications.filter(n => !n.read).length

  const navigate = (s: ScreenName | string, options?: NavigationOptions) => {
    let target = s as ScreenName
    if (s === 'stylist') target = 'ai-stylist'
    if (s === 'product') target = 'product-detail'
    setScreen(target)
    if (options) {
      setOpts(options)
    } else if (target !== screen) {
      setOpts({})
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setSearchOpen(false)
    setNotifDropdownOpen(false)
  }

  const addToCart = (newItem: Omit<CartItem, 'id' | 'qty'> & { id?: string; qty?: number }) => {
    setCartItems(prev => {
      const existingIdx = prev.findIndex(i => i.productId === newItem.productId && i.size === newItem.size)
      if (existingIdx >= 0) {
        const updated = [...prev]
        updated[existingIdx].qty += newItem.qty || 1
        return updated
      }
      return [
        ...prev,
        {
          ...newItem,
          id: newItem.id || `ci-${Date.now()}`,
          qty: newItem.qty || 1,
        },
      ]
    })
  }

  const removeFromCart = (id: string) => {
    setCartItems(prev => prev.filter(i => i.id !== id))
  }

  const updateCartQty = (id: string, delta: number) => {
    setCartItems(prev =>
      prev
        .map(i => {
          if (i.id === id) {
            const nextQty = i.qty + delta
            return nextQty > 0 ? { ...i, qty: nextQty } : null
          }
          return i
        })
        .filter(Boolean) as CartItem[]
    )
  }

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)))
  }

  const appState: AppState = {
    currentScreen: screen,
    navigate,
    opts,
    cartCount,
    setCartCount: (updater) => {
      if (typeof updater === 'function') {
        // dummy fallback for numerical updater
        const next = updater(cartCount)
        if (next === 0) setCartItems([])
      } else if (updater === 0) {
        setCartItems([])
      }
    },
    cartItems,
    addToCart,
    removeFromCart,
    updateCartQty,
    notifications,
    markNotificationRead,
    loggedIn,
    isLoggedIn: loggedIn,
    setLoggedIn,
  }

  if (screen === 'admin') {
    return <Admin onNavigate={navigate} app={appState} />
  }

  return (
    <div style={{ background: "var(--color-ivory)", minHeight: '100vh' }}>
      {/* Desktop Top Navigation */}
      <header
        role="banner"
        className="hidden md:flex sticky top-0 z-50 items-center px-4 xl:px-8 min-h-16 border-b transition-colors"
        style={{ borderColor: "var(--color-sand)", background: "color-mix(in srgb, var(--color-ivory) 96%, transparent)", backdropFilter: 'blur(12px)' }}
      >
        {/* Logo */}
        <button
          onClick={() => navigate('home')}
          aria-label="Trang chủ StyleMind"
          className="flex items-center gap-2 mr-4 xl:mr-10 flex-none rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent p-1"
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow-2xs" style={{ background: "var(--color-accent)" }}>
            <span className="text-on-accent text-xs font-bold font-serif" aria-hidden="true">S</span>
          </div>
          <span className="font-display text-xl font-semibold text-charcoal tracking-tight">StyleMind</span>
        </button>

        {/* Nav links */}
        <nav aria-label="Điều hướng chính" className="flex items-center gap-0.5 flex-1">
          {navLinks.map(link => {
            const isActive = screen === link.screen
            return (
              <button
                key={link.screen}
                onClick={() => navigate(link.screen)}
                aria-current={isActive ? 'page' : undefined}
                className={`px-2 xl:px-4 py-2 rounded-full text-xs xl:text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  isActive
                    ? 'bg-blush text-accent font-semibold shadow-2xs'
                    : 'text-secondary hover:text-charcoal hover:bg-sand/50'
                }`}
              >
                {link.label === "Tư vấn AI" && <span className="mr-1.5 text-xs text-accent" aria-hidden="true">✦</span>}
                {link.label}
              </button>
            )
          })}
        </nav>

        {/* Right action icons */}
        <div className="flex items-center gap-2 relative">
          {/* Search */}
          {searchOpen ? (
            <div className="relative">
              <label htmlFor="search-input" className="sr-only">Tìm sản phẩm hoặc trang phục</label>
              <input
                id="search-input"
                autoFocus
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    navigate('shop')
                    setSearchOpen(false)
                  }
                  if (e.key === 'Escape') setSearchOpen(false)
                }}
                onBlur={() => {
                  if (!searchVal) setSearchOpen(false)
                }}
                placeholder="Tìm trang phục, thương hiệu..."
                className="w-60 px-4 py-2 text-sm rounded-full border border-sand-dark bg-ivory text-charcoal outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
              <button
                onClick={() => setSearchOpen(false)}
                className="absolute right-2.5 top-2.5 text-xs text-muted hover:text-charcoal"
                aria-label="Đóng tìm kiếm"
              >
                ✕
              </button>
            </div>
          ) : (
            <IconButton
              aria-label="Tìm kiếm"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              }
              onClick={() => setSearchOpen(true)}
            />
          )}

          {/* Notifications */}
          <div className="relative">
            <IconButton
              aria-label={`Thông báo (${unreadNotifs} chưa đọc)`}
              badgeCount={unreadNotifs}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              }
              onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
            />
            {notifDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-80 rounded-2xl border border-sand bg-surface-soft shadow-xl p-3 z-50 fade-in"
                role="region"
                aria-label="Bảng thông báo"
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-sand px-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">Thông báo</span>
                  {unreadNotifs > 0 && (
                    <button
                      onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                      className="text-xs text-accent hover:underline"
                    >
                      Đánh dấu tất cả đã đọc
                    </button>
                  )}
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => {
                        markNotificationRead(n.id)
                        if (n.link) navigate(n.link)
                        setNotifDropdownOpen(false)
                      }}
                      className={`p-2.5 rounded-xl cursor-pointer text-left transition-colors ${
                        n.read ? 'bg-transparent hover:bg-sand/40' : 'bg-blush/50 hover:bg-blush'
                      }`}
                    >
                      <p className="text-xs font-semibold text-charcoal mb-0.5">{n.title}</p>
                      <p className="text-xs text-secondary leading-snug">{n.body}</p>
                      <span className="text-[10px] text-muted mt-1 block">{n.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Cart */}
          <IconButton
            aria-label={`Giỏ hàng (${cartCount} món)`}
            badgeCount={cartCount}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            }
            onClick={() => navigate('cart')}
          />

          {/* Profile */}
          <button
            onClick={() => navigate('profile')}
            aria-label="Hồ sơ Nguyễn Thị Lan"
            className="w-10 h-10 rounded-full flex items-center justify-center font-display text-sm font-semibold transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ml-1"
            style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
          >
            N
          </button>

          {/* Admin link */}
          <button
            onClick={() => navigate('admin')}
            aria-label="Bảng quản trị"
            className="ml-2 text-xs px-3 py-1.5 rounded-full border border-sand-dark text-muted hover:text-accent hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-all"
          >
            Quản trị
          </button>
        </div>
      </header>

      {/* Mobile Top Header */}
      <header
        role="banner"
        className="md:hidden sticky top-0 z-50 flex items-center justify-between px-5 h-14 border-b"
        style={{ borderColor: "var(--color-sand)", background: "color-mix(in srgb, var(--color-ivory) 96%, transparent)", backdropFilter: 'blur(12px)' }}
      >
        <button
          onClick={() => navigate('home')}
          aria-label="Trang chủ StyleMind"
          className="flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "var(--color-accent)" }}>
            <span className="text-on-accent text-xs font-bold" aria-hidden="true">S</span>
          </div>
          <span className="font-display text-base font-semibold text-charcoal">StyleMind</span>
        </button>
        <div className="flex items-center gap-1">
          <IconButton
            aria-label={`Giỏ hàng (${cartCount} món)`}
            badgeCount={cartCount}
            size="sm"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            }
            onClick={() => navigate('cart')}
          />
          <button
            onClick={() => navigate('admin')}
            aria-label="Bảng quản trị"
            className="text-xs px-2.5 py-1 rounded-full border border-sand-dark text-muted"
          >
            Quản trị
          </button>
        </div>
      </header>

      {/* Main content */}
      <main id="main-content" className="pb-20 md:pb-0" tabIndex={-1}>
        {screen === 'home' && <Home onNavigate={navigate} app={appState} />}
        {screen === 'shop' && <Shop onNavigate={navigate} app={appState} />}
        {screen === 'product-detail' && <ProductDetail onNavigate={navigate} app={appState} />}
        {screen === 'ai-stylist' && <AIStylest onNavigate={navigate} app={appState} />}
        {screen === 'outfit-result' && <OutfitResult onNavigate={navigate} app={appState} />}
        {screen === 'wardrobe' && <Wardrobe onNavigate={navigate} app={appState} />}
        {screen === 'travel' && <TravelPlanner onNavigate={navigate} app={appState} />}
        {screen === 'studio' && <Studio onNavigate={navigate} app={appState} />}
        {screen === 'cart' && <Cart onNavigate={navigate} cartCount={cartCount} setCartCount={appState.setCartCount} app={appState} />}
        {screen === 'checkout' && <Checkout onNavigate={navigate} app={appState} />}
        {screen === 'orders' && <OrderTracking onNavigate={navigate} app={appState} />}
        {screen === 'profile' && <Profile onNavigate={navigate} app={appState} />}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Điều hướng trên điện thoại"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-ivory/96 backdrop-blur-md"
        style={{ borderColor: "var(--color-sand)" }}
      >
        <div className="flex items-center justify-around">
          {mobileNav.map(item => {
            const isActive = screen === item.screen
            return (
              <button
                key={item.screen}
                onClick={() => navigate(item.screen)}
                aria-current={isActive ? 'page' : undefined}
                className="flex-1 min-h-[48px] flex flex-col items-center justify-center gap-0.5 py-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                style={{ color: isActive ? "var(--color-accent)" : "var(--color-muted)" }}
              >
                <span className="text-base leading-none" aria-hidden="true">{item.icon}</span>
                <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-accent" aria-hidden="true" />
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Quick Navigation Overlay for Demo */}
      <div className="fixed bottom-20 md:bottom-6 right-4 z-40">
        <details className="group">
          <summary
            aria-label="Chuyển nhanh giữa các trang"
            className="w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center cursor-pointer list-none shadow-lg transition-all hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent"
            style={{ background: "var(--color-accent)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-on-accent)" strokeWidth="2" aria-hidden="true">
              <path d="M3 12h18M3 6h18M3 18h18"/>
            </svg>
          </summary>
          <div
            className="absolute bottom-14 right-0 rounded-2xl border shadow-xl p-3 w-60 bg-surface-soft border-sand fade-in"
            role="menu"
            aria-label="Các trang trải nghiệm"
          >
            <p className="text-[11px] font-bold uppercase tracking-wider px-2 py-1 mb-1 text-muted">Chuyển trang nhanh</p>
            {[
              { label: "🏠 Trang chủ", screen: 'home' },
              { label: "✦ Tư vấn AI", screen: 'ai-stylist' },
              { label: "👗 Kết quả phối đồ", screen: 'outfit-result' },
              { label: "▣ Tủ đồ của tôi", screen: 'wardrobe' },
              { label: "✈ Lên đồ du lịch", screen: 'travel' },
              { label: "◈ Phòng thử đồ", screen: 'studio' },
              { label: "🛍 Cửa hàng", screen: 'shop' },
              { label: "📦 Chi tiết sản phẩm", screen: 'product-detail' },
              { label: "🛒 Giỏ hàng", screen: 'cart' },
              { label: "💳 Thanh toán", screen: 'checkout' },
              { label: "📬 Đơn hàng của tôi", screen: 'orders' },
              { label: "○ Hồ sơ", screen: 'profile' },
              { label: "⚙ Quản trị", screen: 'admin' },
            ].map(item => (
              <button
                key={item.screen}
                onClick={() => navigate(item.screen)}
                role="menuitem"
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  screen === item.screen
                    ? 'bg-blush text-accent font-semibold'
                    : 'text-ink hover:bg-sand/60'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </details>
      </div>
    </div>
  )
}
