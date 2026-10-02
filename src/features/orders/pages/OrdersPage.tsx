import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { useDemoStore } from '@/app/store/DemoStoreProvider'
import { useAuth } from '@/features/auth'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { formatDate } from '@/shared/lib/formatDate'

const statusLabel: Record<string, string> = {
  pending: 'Chờ xử lý',
  payment_pending: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  confirmed: 'Đã xác nhận',
  processing: 'Đang chuẩn bị',
  shipped: 'Đang giao',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy',
}

export function OrdersPage() {
  const { state } = useDemoStore()
  const { currentUser } = useAuth()

  if (!currentUser) return null

  const orders = state.orders
    .filter(order => order.userId === currentUser.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <section className="mx-auto grid max-w-[var(--container-wide)] gap-8 px-5 py-8 md:px-8 md:py-12">
      <div>
        <h1 className="font-display text-4xl font-semibold leading-tight text-[#222222]">Đơn hàng</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6F6B67]">
          Theo dõi trạng thái, sản phẩm, địa chỉ nhận hàng và thanh toán của các đơn đã đặt.
        </p>
      </div>

      {orders.length > 0 ? (
        <div className="grid gap-4">
          {orders.map(order => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="rounded-lg border border-[#E3DAD0] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#684B5A]"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#222222]">Đơn {order.id}</h2>
                  <p className="mt-1 text-sm text-[#6F6B67]">{formatDate(order.createdAt)}</p>
                </div>
                <span className="w-fit rounded-full bg-[#F4E7E8] px-3 py-1 text-xs font-semibold text-[#684B5A]">
                  {statusLabel[order.status] ?? order.status}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-[#3A3632]">
                <span>{order.items.length} sản phẩm</span>
                <span>{formatCurrency(order.total)}</span>
                <span>{order.shippingAddress.province}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <section className="rounded-lg border border-dashed border-[#D8D0C6] bg-white p-8">
          <h2 className="font-display text-2xl font-semibold text-[#222222]">Bạn chưa có đơn hàng</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6F6B67]">
            Khi thanh toán thành công, đơn hàng sẽ xuất hiện tại đây cùng lịch sử trạng thái.
          </p>
          <Link
            to={ROUTES.shop}
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#684B5A] px-4 text-sm font-semibold text-white"
          >
            Mua sắm ngay
          </Link>
        </section>
      )}
    </section>
  )
}
