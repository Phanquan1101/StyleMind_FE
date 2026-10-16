import { useState } from 'react'
import type { AppState, Order } from '../types'
import { mockOrders } from '../data/mockData'
import PageHeader from '../components/ui/PageHeader'
import Money from '../components/ui/Money'
import Button from '../components/ui/Button'

interface Props {
  onNavigate: (screen: string, opts?: any) => void
  app?: AppState
}

function getStatusBadge(status: Order['status']) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    PENDING: { label: "Đã đặt hàng", bg: "var(--color-warning-bg)", color: "var(--color-warning)" },
    PAYMENT_PENDING: { label: "Chờ chuyển khoản", bg: "var(--color-warning-bg)", color: "var(--color-warning)" },
    PAID: { label: "Đã xác nhận thanh toán", bg: "var(--color-blush)", color: "var(--color-accent)" },
    CONFIRMED: { label: "Đã xác nhận, đang đóng gói", bg: "var(--color-blush)", color: "var(--color-accent)" },
    SHIPPED: { label: "Đang giao hàng", bg: "var(--color-warning-bg)", color: "var(--color-warning)" },
    COMPLETED: { label: "Đã giao hàng", bg: "var(--color-success-bg)", color: "var(--color-success)" },
    CANCELLED: { label: "Đã hủy", bg: "var(--color-error-bg)", color: "var(--color-error)" },
  }
  const s = map[status] || { label: status, bg: "var(--color-sand)", color: "var(--color-secondary)" }
  return (
    <span
      className="text-xs px-3 py-1 rounded-full font-semibold border"
      style={{ backgroundColor: s.bg, color: s.color, borderColor: `color-mix(in srgb, ${s.color} 20%, transparent)` }}
    >
      ● {s.label}
    </span>
  )
}

export default function OrderTracking({ onNavigate }: Props) {
  const [orders] = useState<Order[]>(mockOrders)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(orders[0])
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [returnSuccess, setReturnSuccess] = useState(false)

  return (
    <div style={{ background: "var(--color-ivory)", minHeight: '100vh' }}>
      <PageHeader
        category="Theo dõi mua sắm"
        title="Đơn hàng của tôi"
        subtitle="Theo dõi giao hàng, xem lịch sử mua sắm và quản lý đổi trả dễ dàng."
      />

      <div className="px-6 md:px-16 pb-24 grid lg:grid-cols-[1fr_420px] gap-10 items-start">
        {/* Orders List */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
            Lịch sử đơn hàng ({orders.length})
          </h2>

          {orders.map(order => {
            const isSelected = selectedOrder?.id === order.id
            return (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={`p-6 rounded-3xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-surface border-accent ring-2 ring-accent/20 shadow-md'
                    : 'bg-surface-soft border-sand hover:border-sand-dark'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-sand">
                  <div>
                    <span className="font-mono text-sm font-bold text-charcoal">
                      #{order.id}
                    </span>
                    <span className="text-xs text-muted ml-3">{order.date}</span>
                  </div>
                  <div>{getStatusBadge(order.status)}</div>
                </div>

                <div className="flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex gap-3 items-center">
                    {order.items.slice(0, 3).map((item, idx) => (
                      <img
                        key={idx}
                        src={item.image}
                        alt={item.name}
                        className="w-14 h-18 rounded-xl object-cover border border-sand"
                      />
                    ))}
                    {order.items.length > 3 && (
                      <span className="text-xs font-semibold text-secondary px-2 py-1 bg-sand rounded-lg">
                        +{order.items.length - 3} món khác
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-secondary">
                      {order.items.length} món · {order.paymentMethod}
                    </p>
                    <Money amount={order.total} className="text-base font-semibold text-charcoal" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Selected Order Detailed Timeline Inspector */}
        {selectedOrder && (
          <aside className="p-6 md:p-8 rounded-3xl bg-surface border border-sand shadow-xs space-y-6 sticky top-24">
            <div className="flex items-center justify-between pb-4 border-b border-sand">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-rose">
                  Chi tiết đơn hàng
                </span>
                <h3 className="font-display text-xl font-light text-charcoal">
                  #{selectedOrder.id}
                </h3>
              </div>
              <div>{getStatusBadge(selectedOrder.status)}</div>
            </div>

            {/* Delivery Timeline with Friendly Copy (Principle 76) */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-4">
                Tiến trình giao hàng
              </h4>
              <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-sand">
                {selectedOrder.timeline.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-4 relative">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10 flex-none ${
                        step.done
                          ? 'bg-success text-on-accent'
                          : step.active
                          ? 'bg-accent text-on-accent ring-4 ring-accent/20'
                          : 'bg-sand text-muted'
                      }`}
                    >
                      {step.done ? '✓' : idx + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between items-baseline">
                        <span
                          className={`text-xs font-semibold ${
                            step.active ? 'text-accent' : 'text-charcoal'
                          }`}
                        >
                          {step.status}
                        </span>
                        {step.date && (
                          <span className="text-[11px] text-muted">{step.date}</span>
                        )}
                      </div>
                      {step.active && (
                        <p className="text-[11px] text-accent mt-0.5">
                          Kiện hàng đang được GHN vận chuyển. Mã vận đơn #{selectedOrder.tracking}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Items in this order */}
            <div className="pt-4 border-t border-sand space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                Sản phẩm trong đơn
              </h4>
              {selectedOrder.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <img src={item.image} alt="" className="w-10 h-12 rounded-lg object-cover" />
                    <div>
                      <p className="font-medium text-charcoal">{item.name}</p>
                      <p className="text-[11px] text-muted">
                        {item.brand} · Cỡ {item.size} · {item.color}
                      </p>
                    </div>
                  </div>
                  <Money amount={item.price * item.qty} className="font-semibold text-charcoal" />
                </div>
              ))}
            </div>

            {/* Shipping address & payment */}
            <div className="pt-4 border-t border-sand space-y-2 text-xs text-secondary">
              <div>
                <span className="text-muted block">Giao đến:</span>
                <span className="text-charcoal">{selectedOrder.address}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span>Phương thức thanh toán:</span>
                <span className="font-semibold text-charcoal">{selectedOrder.paymentMethod}</span>
              </div>
            </div>

            {/* Return / Support Action */}
            <div className="pt-2">
              <Button
                variant="outline"
                fullWidth
                size="sm"
                onClick={() => setShowReturnModal(true)}
              >
                Yêu cầu đổi trả
              </Button>
            </div>
          </aside>
        )}
      </div>

      {/* Return Request Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay/50 backdrop-blur-xs fade-in" role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-surface rounded-3xl p-6 sm:p-8 shadow-2xl border border-sand">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-2xl font-light text-charcoal">
                Yêu cầu đổi trả
              </h3>
              <button
                onClick={() => {
                  setShowReturnModal(false)
                  setReturnSuccess(false)
                }}
                className="text-muted hover:text-charcoal text-lg font-bold"
                aria-label="Đóng hộp thoại"
              >
                ✕
              </button>
            </div>

            {returnSuccess ? (
              <div className="text-center py-6 space-y-4">
                <span className="w-12 h-12 rounded-full bg-success-bg text-success flex items-center justify-center text-xl font-bold mx-auto">
                  ✓
                </span>
                <h4 className="font-display text-xl font-light text-charcoal">
                  Đã ghi nhận yêu cầu đổi trả
                </h4>
                <p className="text-xs text-secondary leading-relaxed">
                  Vui lòng đóng gói sản phẩm và giữ nguyên nhãn. Đơn vị vận chuyển sẽ đến lấy hàng trong vòng 48 giờ.
                </p>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => {
                    setShowReturnModal(false)
                    setReturnSuccess(false)
                  }}
                >
                  Xong
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-secondary">
                  StyleMind hỗ trợ đổi trả miễn phí trong 14 ngày cho sản phẩm chưa sử dụng, còn nguyên nhãn.
                </p>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1">
                    Chọn lý do
                  </label>
                  <select className="w-full px-4 py-2.5 rounded-xl border border-sand-dark text-sm outline-none bg-surface">
                    <option>Mặc rộng — muốn đổi cỡ nhỏ hơn</option>
                    <option>Mặc chật — muốn đổi cỡ lớn hơn</option>
                    <option>Màu sắc không như mong đợi</option>
                    <option>Đổi ý</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1">
                    Địa chỉ lấy hàng
                  </label>
                  <input
                    defaultValue={selectedOrder?.address}
                    className="w-full px-4 py-2.5 rounded-xl border border-sand-dark text-xs outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    fullWidth
                    onClick={() => setShowReturnModal(false)}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    fullWidth
                    onClick={() => setReturnSuccess(true)}
                  >
                    Gửi yêu cầu
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
