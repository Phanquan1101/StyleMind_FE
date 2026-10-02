import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { useDemoStore } from '@/app/store/DemoStoreProvider'
import { useAuth } from '@/features/auth'

export function AccountPage() {
  const { state } = useDemoStore()
  const { currentUser } = useAuth()

  if (!currentUser) return null

  const addresses = state.addresses.filter(address => address.userId === currentUser.id)
  const orders = state.orders.filter(order => order.userId === currentUser.id)
  const outfits = state.outfits.filter(outfit => outfit.ownerId === currentUser.id)
  const unreadCount = state.notifications.filter(item => item.userId === currentUser.id && !item.read).length

  return (
    <section className="mx-auto grid max-w-[var(--container-wide)] gap-8 px-5 py-8 md:px-8 md:py-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#684B5A]">StyleMind</p>
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-[#222222]">Tài khoản</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6F6B67]">
            Quản lý hồ sơ, số đo cơ bản, địa chỉ giao hàng và các lối tắt mua sắm của bạn.
          </p>
        </div>
        <Link
          to={ROUTES.addresses}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#684B5A] px-4 text-sm font-semibold text-white transition hover:bg-[#593f4d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#684B5A]"
        >
          Quản lý địa chỉ
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-lg border border-[#E3DAD0] bg-white p-5 shadow-sm">
          <h2 className="font-display text-2xl font-semibold text-[#222222]">Hồ sơ cá nhân</h2>
          <div className="mt-5 grid gap-4 text-sm text-[#3A3632] sm:grid-cols-2">
            <Info label="Họ tên" value={currentUser.fullName} />
            <Info label="Email" value={currentUser.email} />
            <Info label="Số điện thoại" value={currentUser.phone ?? 'Chưa cập nhật'} />
            <Info label="Vai trò" value={currentUser.role === 'admin' ? 'Quản trị' : 'Khách hàng'} />
          </div>
        </section>

        <section className="rounded-lg border border-[#E3DAD0] bg-white p-5 shadow-sm">
          <h2 className="font-display text-2xl font-semibold text-[#222222]">Thông tin vóc dáng</h2>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <Metric label="Chiều cao" value={currentUser.heightCm ? `${currentUser.heightCm} cm` : 'Chưa có'} />
            <Metric label="Cân nặng" value={currentUser.weightKg ? `${currentUser.weightKg} kg` : 'Chưa có'} />
          </div>
        </section>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Shortcut label="Địa chỉ" value={`${addresses.length} địa chỉ`} to={ROUTES.addresses} />
        <Shortcut label="Đơn hàng" value={`${orders.length} đơn`} to={ROUTES.orders} />
        <Shortcut label="Thông báo" value={`${unreadCount} chưa đọc`} to={ROUTES.notifications} />
        <Shortcut label="Tủ đồ" value={`${outfits.length} outfit`} to={ROUTES.wardrobes} />
      </section>
    </section>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#9D9894]">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#F7F1EC] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8A8179]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#222222]">{value}</p>
    </div>
  )
}

function Shortcut({ label, value, to }: { label: string; value: string; to: string }) {
  return (
    <Link
      to={to}
      className="rounded-lg border border-[#E3DAD0] bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#684B5A]"
    >
      <p className="text-sm font-semibold text-[#684B5A]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#222222]">{value}</p>
    </Link>
  )
}
