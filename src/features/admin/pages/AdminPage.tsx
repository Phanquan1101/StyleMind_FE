import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { useDemoStore } from '@/app/store/DemoStoreProvider'
import { useAuth } from '@/features/auth'
import { AdminOverviewPanel } from '@/features/admin/components/AdminOverviewPanel'
import { AdminShell } from '@/features/admin/components/AdminShell'
import type { AdminSection } from '@/features/admin/model/adminTypes'

const sections = new Set<AdminSection>(['overview', 'products', 'categories', 'orders', 'requests', 'customers', 'ai'])

function resolveSection(value: string | null): AdminSection {
  return value && sections.has(value as AdminSection) ? (value as AdminSection) : 'overview'
}

function sectionPlaceholder(section: AdminSection) {
  const title: Record<AdminSection, string> = {
    overview: 'Tổng quan quản trị',
    products: 'Quản lý sản phẩm',
    categories: 'Quản lý danh mục',
    orders: 'Quản lý đơn hàng',
    requests: 'Quản lý yêu cầu',
    customers: 'Quản lý khách hàng',
    ai: 'Quản lý dữ liệu AI',
  }

  return (
    <section className="grid gap-4">
      <div>
        <p className="text-sm font-semibold text-[#684B5A]">StyleMind Admin</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-[#222222]">{title[section]}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6F6B67]">
          Khu vực này đã có route và layout sẵn sàng; các thao tác chi tiết sẽ được mở trong bước tiếp theo của Admin MVP.
        </p>
      </div>
    </section>
  )
}

export function AdminPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { state } = useDemoStore()
  const { currentUser, logout } = useAuth()
  const activeSection = resolveSection(searchParams.get('section'))

  const content = useMemo(() => {
    if (activeSection === 'overview') return <AdminOverviewPanel database={state} />
    return sectionPlaceholder(activeSection)
  }, [activeSection, state])

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
      {content}
    </AdminShell>
  )
}
