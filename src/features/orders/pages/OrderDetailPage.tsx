import { Link, useParams } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { useDemoStore } from '@/app/store/DemoStoreProvider'
import { useAuth } from '@/features/auth'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { formatDate } from '@/shared/lib/formatDate'

export function OrderDetailPage() {
  const { orderId } = useParams()
  const { state } = useDemoStore()
  const { currentUser } = useAuth()

  if (!currentUser) return null

  const order = state.orders.find(item => item.id === orderId && item.userId === currentUser.id)

  if (!order) {
    return (
      <section className="mx-auto max-w-[var(--container-wide)] px-5 py-10 md:px-8">
        <Link to={ROUTES.orders} className="text-sm font-semibold text-[#684B5A] hover:underline">
          Đơn hàng
        </Link>
        <h1 className="mt-4 font-display text-4xl font-semibold text-[#222222]">Không tìm thấy đơn hàng</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[#6F6B67]">
          Đơn hàng này không thuộc tài khoản hiện tại hoặc đã bị thay đổi đường dẫn.
        </p>
      </section>
    )
  }

  return (
    <section className="mx-auto grid max-w-[var(--container-wide)] gap-8 px-5 py-8 md:px-8 md:py-12">
      <div>
        <Link to={ROUTES.orders} className="text-sm font-semibold text-[#684B5A] hover:underline">
          Đơn hàng
        </Link>
        <h1 className="mt-2 font-display text-4xl font-semibold text-[#222222]">Đơn {order.id}</h1>
        <p className="mt-3 text-sm text-[#6F6B67]">Ngày đặt {formatDate(order.createdAt)}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <section className="rounded-lg border border-[#E3DAD0] bg-white p-5 shadow-sm">
          <h2 className="font-display text-2xl font-semibold text-[#222222]">Sản phẩm</h2>
          <div className="mt-5 grid gap-4">
            {order.items.map(item => (
              <article key={`${item.productId}-${item.variantId}`} className="flex gap-4">
                <img src={item.imageUrl} alt={item.name} className="h-20 w-16 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-[#222222]">{item.name}</h3>
                  <p className="mt-1 text-sm text-[#6F6B67]">
                    {item.brand} · {item.color} · {item.size} · x{item.quantity}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#222222]">{formatCurrency(item.unitPrice)}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="grid gap-4">
          <section className="rounded-lg border border-[#E3DAD0] bg-white p-5 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-[#222222]">Giao hàng</h2>
            <p className="mt-3 text-sm leading-6 text-[#3A3632]">
              {order.shippingAddress.recipientName} · {order.shippingAddress.phone}
              <br />
              {order.shippingAddress.line1}, {order.shippingAddress.ward}, {order.shippingAddress.district}, {order.shippingAddress.province}
            </p>
          </section>
          <section className="rounded-lg border border-[#E3DAD0] bg-white p-5 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-[#222222]">Thanh toán</h2>
            <p className="mt-3 text-sm text-[#6F6B67]">{order.paymentMethod === 'cod' ? 'Thanh toán khi nhận hàng' : 'VietQR'}</p>
            <p className="mt-2 text-2xl font-semibold text-[#222222]">{formatCurrency(order.total)}</p>
          </section>
        </aside>
      </div>
    </section>
  )
}
