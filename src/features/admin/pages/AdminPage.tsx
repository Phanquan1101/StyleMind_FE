import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { commerceApi } from '@/api/commerce'
import { useDemoStore } from '@/app/store/DemoStoreProvider'
import { useAuth } from '@/features/auth'
import { apiMode } from '@/shared/api/http'
import { Button } from '@/shared/ui'
import { AdminDashboard } from '@/features/admin/dashboard/AdminDashboard'
import { AdminRevenuePage } from '@/features/admin/revenue/AdminRevenuePage'
import { AdminCategoriesPanel } from '@/features/admin/components/AdminCategoriesPanel'
import { AdminBrandsPanel } from '@/features/admin/components/AdminBrandsPanel'
import { AdminCustomersPanel } from '@/features/admin/components/AdminCustomersPanel'
import { AdminOverviewPanel } from '@/features/admin/components/AdminOverviewPanel'
import { AdminOrdersPanel } from '@/features/admin/components/AdminOrdersPanel'
import { AdminProductsPanel } from '@/features/admin/components/AdminProductsPanel'
import { AdminRequestsPanel } from '@/features/admin/components/AdminRequestsPanel'
import { AdminShell } from '@/features/admin/components/AdminShell'
import type { AdminSection } from '@/features/admin/model/adminTypes'
import {
  commerceCategoryToEntity,
  commerceCancellationToEntity,
  commerceOrderToEntity,
} from '@/features/commerce/data/commerceEntityAdapters'
import { loadAdminOrders } from '@/features/commerce/data/loadAdminOrders'
import { returnsApi, type ReturnRequest } from '@/features/returns/returnsApi'

// Notifications, settings and AI management have no backend yet, so they are not offered or reachable (hand-typed URLs show the overview).
const sections = new Set<AdminSection>(['overview', 'revenue', 'products', 'categories', 'orders', 'payments', 'requests', 'customers'])

function resolveSection(value: string | null): AdminSection {
  if (value === 'payments' || value === 'requests') return 'orders'
  return value && sections.has(value as AdminSection) ? (value as AdminSection) : 'overview'
}

type OrderView = 'list' | 'cancellations' | 'returns'

function resolveOrderView(section: string | null, view: string | null): OrderView {
  if (section === 'payments') return 'list'
  if (section === 'requests') return view === 'returns' ? 'returns' : 'cancellations'
  if (view === 'cancellations' || view === 'returns') return view
  return 'list'
}

function sectionPlaceholder(section: AdminSection) {
  const title: Record<AdminSection, string> = {
    overview: 'Tổng quan quản trị',
    revenue: 'Báo cáo doanh thu',
    products: 'Quản lý sản phẩm',
    categories: 'Quản lý danh mục',
    orders: 'Quản lý đơn hàng',
    requests: 'Quản lý yêu cầu',
    customers: 'Quản lý tài khoản',
    payments: 'Thanh toán',
    notifications: 'Quản lý thông báo',
    settings: 'Cài đặt hệ thống',
    ai: 'Quản lý dữ liệu AI',
  }

  return (
    <section className="grid gap-4">
      <div>
        <p className="text-sm font-semibold text-[#1C1B1B]">Bảng quản trị StyleMind</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-[#222222]">{title[section]}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5E5F5D]">
          Khu vực này đã có điều hướng và bố cục sẵn sàng; các thao tác chi tiết sẽ được mở trong bước tiếp theo của MVP quản trị.
        </p>
      </div>
    </section>
  )
}

export function AdminPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { state, dispatch } = useDemoStore()
  const { currentUser, logout } = useAuth()
  const [commerceError, setCommerceError] = useState<string | null>(null)
  const [commerceLoading, setCommerceLoading] = useState(true)
  const [reloadVersion, setReloadVersion] = useState(0)
  const ordersLoaded = useRef(false)
  const [liveReturns, setLiveReturns] = useState<ReturnRequest[]>([])
  const [returnsError, setReturnsError] = useState(false)
  const activeSection = resolveSection(searchParams.get('section'))
  const orderView = resolveOrderView(searchParams.get('section'), searchParams.get('view'))
  const cancellationWork = new Set(state.cancellationRequests
    .filter(request => request.status === 'submitted' || state.orders.some(order => order.id === request.orderId && order.refundStatus === 'PENDING_REFUND'))
    .map(request => request.orderId))
  const orderViews: { id: OrderView; label: string; count?: number }[] = [
    { id: 'list', label: 'Danh sách đơn' },
    { id: 'cancellations', label: 'Yêu cầu hủy', count: cancellationWork.size },
    { id: 'returns', label: 'Yêu cầu trả hàng', count: apiMode() ? (returnsError ? undefined : liveReturns.length) : state.returnRequests.length },
  ]

  useEffect(() => {
    if (!apiMode() || activeSection !== 'orders') return
    const controller = new AbortController()
    async function loadReturns() {
      try {
        const first = await returnsApi.adminList(0, controller.signal)
        const items = [...first.items]
        for (let page = 1; page < first.total_pages; page += 1) {
          const next = await returnsApi.adminList(page, controller.signal)
          items.push(...next.items)
        }
        if (!controller.signal.aborted) { setLiveReturns(items); setReturnsError(false) }
      } catch {
        if (!controller.signal.aborted) setReturnsError(true)
      }
    }
    void loadReturns()
    return () => controller.abort()
  }, [activeSection, orderView, reloadVersion])

  const returnStatuses = useMemo(() => {
    const oldestFirst = [...liveReturns].sort((left, right) => Date.parse(left.created_at) - Date.parse(right.created_at))
    return new Map(oldestFirst.map(request => [request.order_id, request.status]))
  }, [liveReturns])

  useEffect(() => {
    if (!apiMode() || activeSection !== 'orders' || orderView !== 'list' || searchParams.has('orderId')) return
    const refresh = () => {
      if (document.visibilityState === 'visible') setReloadVersion(value => value + 1)
    }
    const timer = window.setInterval(refresh, 30000)
    window.addEventListener('focus', refresh)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [activeSection, orderView, searchParams])

  useEffect(() => {
    if (!apiMode()) {
      setCommerceLoading(false)
      setCommerceError(null)
      return
    }

    // Each section loads only what it shows. Products page through /admin/products themselves, the overview and the
    // account list ask the server for counts/pages, so nothing downloads the whole catalogue or every order any more.
    const needsCategories = activeSection === 'products' || activeSection === 'categories'
    const needsOrders = activeSection === 'orders'
    if (!needsCategories && !needsOrders) {
      setCommerceLoading(false)
      setCommerceError(null)
      return
    }

    let active = true
    if (!needsOrders || !ordersLoaded.current) setCommerceLoading(true)
    Promise.all([
      needsCategories ? commerceApi.categories.listAdmin() : Promise.resolve(null),
      needsOrders ? loadAdminOrders() : Promise.resolve(null),
    ]).then(([categories, orders]) => {
      if (!active) return
      if (categories) {
        dispatch({
          type: 'commerce/catalogSynced',
          payload: { products: [], categories: categories.items.map((category, index) => commerceCategoryToEntity(category, index)) },
        })
      }
      if (orders) {
        ordersLoaded.current = true
        dispatch({
          type: 'commerce/adminOrdersSynced',
          payload: {
            orders: orders.items.map(commerceOrderToEntity),
            cancellationRequests: orders.items
              .map(order => order.cancellation_request)
              .filter(request => request !== null)
              .map(commerceCancellationToEntity),
          },
        })
      }
      setCommerceError(null)
    }).catch(error => {
      if (active) {
        if (import.meta.env.MODE !== 'test') {
          if (needsCategories) dispatch({ type: 'commerce/catalogSynced', payload: { products: [], categories: [] } })
          if (needsOrders) dispatch({ type: 'commerce/adminOrdersSynced', payload: { orders: [], cancellationRequests: [] } })
        }
        setCommerceError(error instanceof Error ? error.message : 'Không thể tải dữ liệu Commerce admin')
      }
    }).finally(() => {
      if (active) setCommerceLoading(false)
    })
    return () => {
      active = false
    }
  }, [dispatch, activeSection, orderView, reloadVersion])

  const content = useMemo(() => {
    if (activeSection === 'overview') return apiMode() ? <AdminDashboard /> : <AdminOverviewPanel database={state} />
    if (activeSection === 'revenue') return apiMode() ? <AdminRevenuePage /> : sectionPlaceholder('revenue')
    if (activeSection === 'products') return <AdminProductsPanel database={state} dispatch={dispatch} />
    if (activeSection === 'categories') return <><AdminCategoriesPanel database={state} dispatch={dispatch} /><AdminBrandsPanel /></>
    if (activeSection === 'orders') return <>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Quản lý đơn hàng</h1>
          <p className="mt-2 text-sm text-secondary">Theo dõi giao hàng và xử lý yêu cầu của khách.</p>
        </div>
        <Button variant="secondary" disabled={commerceLoading} onClick={() => setReloadVersion(value => value + 1)}>Tải lại</Button>
      </header>
      <nav aria-label="Công việc đơn hàng" className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-divider bg-white p-1">
        {orderViews.map(item => <button key={item.id} type="button" aria-pressed={orderView === item.id}
          className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-accent ${orderView === item.id ? 'bg-charcoal text-white' : 'text-secondary hover:bg-ivory hover:text-charcoal'}`}
          onClick={() => navigate(`/admin?section=orders${item.id === 'list' ? '' : `&view=${item.id}`}`)}>
          {item.label}{item.count !== undefined && <span className="rounded-md bg-sand px-1.5 py-0.5 text-xs text-charcoal tabular-nums">{item.count}</span>}
        </button>)}
      </nav>
      {returnsError && <p role="status" className="mb-4 text-sm text-warning-ink">Chưa tải được trạng thái trả hàng. Bấm Tải lại để kiểm tra.</p>}
      {orderView === 'list' && <AdminOrdersPanel embedded database={state} dispatch={dispatch} returnStatuses={returnStatuses} onReload={() => setReloadVersion(value => value + 1)} />}
      {(orderView === 'cancellations' || orderView === 'returns') && <AdminRequestsPanel key={orderView} database={state} dispatch={dispatch} reviewerId={currentUser?.id ?? ''} onReload={() => setReloadVersion(value => value + 1)} embeddedView={orderView}
        onReturnUpdated={request => setLiveReturns(current => [...current.filter(item => item.return_id !== request.return_id), request])} />}
    </>
    if (activeSection === 'customers') return <AdminCustomersPanel />
    return sectionPlaceholder(activeSection)
  }, [activeSection, orderView, currentUser?.id, dispatch, state, navigate, liveReturns, returnsError, returnStatuses])

  if (!currentUser) return null

  return (
    <AdminShell
      activeSection={activeSection}
      adminName={currentUser.fullName}
      adminEmail={currentUser.email}
      onLogout={() => {
        logout()
        navigate('/login', { replace: true })
      }}
    >
      {commerceLoading && <p role="status" className="mb-4 rounded-lg bg-white p-4 text-sm text-[#5E5F5D]">Đang tải dữ liệu Commerce…</p>}
      {commerceError && <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#E7BBBB] bg-[#FCEAEA] p-4"><p role="alert" className="text-sm font-semibold text-[#A94B4B]">{commerceError}</p><Button type="button" variant="secondary" disabled={commerceLoading} onClick={() => { setCommerceError(null); setReloadVersion(value => value + 1) }}>Thử tải lại</Button></div>}
      {(!['products', 'categories', 'orders'].includes(activeSection) || (!commerceLoading && !commerceError)) && content}
    </AdminShell>
  )
}

