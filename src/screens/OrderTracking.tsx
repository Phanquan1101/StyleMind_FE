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
    PENDING: { label: 'Order Placed', bg: '#FBF1E0', color: '#B67A32' },
    PAYMENT_PENDING: { label: 'Awaiting Bank Transfer', bg: '#FBF1E0', color: '#B67A32' },
    PAID: { label: 'Payment Confirmed', bg: '#F4E7E8', color: '#684B5A' },
    CONFIRMED: { label: 'Confirmed & Packing', bg: '#F4E7E8', color: '#684B5A' },
    SHIPPED: { label: 'On the Way (With Courier)', bg: '#FBF1E0', color: '#B67A32' },
    COMPLETED: { label: 'Delivered', bg: '#EAF2EC', color: '#48755A' },
    CANCELLED: { label: 'Cancelled', bg: '#FCEAEA', color: '#A94B4B' },
  }
  const s = map[status] || { label: status, bg: '#EEE8E1', color: '#6F6B67' }
  return (
    <span
      className="text-xs px-3 py-1 rounded-full font-semibold border"
      style={{ backgroundColor: s.bg, color: s.color, borderColor: `${s.color}33` }}
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
    <div style={{ background: '#FAF8F5', minHeight: '100vh' }}>
      <PageHeader
        category="Account Activity"
        title="My Orders"
        subtitle="Track delivery progress, review past wardrobe purchases, and manage hassle-free exchanges."
      />

      <div className="px-6 md:px-16 pb-24 grid lg:grid-cols-[1fr_420px] gap-10 items-start">
        {/* Orders List */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#9D9894] mb-2">
            Order History ({orders.length})
          </h2>

          {orders.map(order => {
            const isSelected = selectedOrder?.id === order.id
            return (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={`p-6 rounded-3xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white border-[#684B5A] ring-2 ring-[#684B5A]/20 shadow-md'
                    : 'bg-[#FDFCFA] border-[#EEE8E1] hover:border-[#D8D0C6]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-[#EEE8E1]">
                  <div>
                    <span className="font-mono text-sm font-bold text-[#222222]">
                      #{order.id}
                    </span>
                    <span className="text-xs text-[#9D9894] ml-3">{order.date}</span>
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
                        className="w-14 h-18 rounded-xl object-cover border border-[#EEE8E1]"
                      />
                    ))}
                    {order.items.length > 3 && (
                      <span className="text-xs font-semibold text-[#6F6B67] px-2 py-1 bg-[#EEE8E1] rounded-lg">
                        +{order.items.length - 3} more
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-[#6F6B67]">
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''} · {order.paymentMethod}
                    </p>
                    <Money amount={order.total} className="text-base font-semibold text-[#222222]" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Selected Order Detailed Timeline Inspector */}
        {selectedOrder && (
          <aside className="p-6 md:p-8 rounded-3xl bg-white border border-[#EEE8E1] shadow-xs space-y-6 sticky top-24">
            <div className="flex items-center justify-between pb-4 border-b border-[#EEE8E1]">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-[#B98791]">
                  Order Details
                </span>
                <h3 className="font-display text-xl font-light text-[#222222]">
                  #{selectedOrder.id}
                </h3>
              </div>
              <div>{getStatusBadge(selectedOrder.status)}</div>
            </div>

            {/* Delivery Timeline with Friendly Copy (Principle 76) */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#9D9894] mb-4">
                Delivery Timeline
              </h4>
              <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#EEE8E1]">
                {selectedOrder.timeline.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-4 relative">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10 flex-none ${
                        step.done
                          ? 'bg-[#48755A] text-white'
                          : step.active
                          ? 'bg-[#684B5A] text-white ring-4 ring-[#684B5A]/20'
                          : 'bg-[#EEE8E1] text-[#9D9894]'
                      }`}
                    >
                      {step.done ? '✓' : idx + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between items-baseline">
                        <span
                          className={`text-xs font-semibold ${
                            step.active ? 'text-[#684B5A]' : 'text-[#222222]'
                          }`}
                        >
                          {step.status}
                        </span>
                        {step.date && (
                          <span className="text-[11px] text-[#9D9894]">{step.date}</span>
                        )}
                      </div>
                      {step.active && (
                        <p className="text-[11px] text-[#684B5A] mt-0.5">
                          Package is in transit with GHN. Tracking #{selectedOrder.tracking}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Items in this order */}
            <div className="pt-4 border-t border-[#EEE8E1] space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#9D9894]">
                Items Included
              </h4>
              {selectedOrder.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <img src={item.image} alt="" className="w-10 h-12 rounded-lg object-cover" />
                    <div>
                      <p className="font-medium text-[#222222]">{item.name}</p>
                      <p className="text-[11px] text-[#9D9894]">
                        {item.brand} · Size {item.size} · {item.color}
                      </p>
                    </div>
                  </div>
                  <Money amount={item.price * item.qty} className="font-semibold text-[#222222]" />
                </div>
              ))}
            </div>

            {/* Shipping address & payment */}
            <div className="pt-4 border-t border-[#EEE8E1] space-y-2 text-xs text-[#6F6B67]">
              <div>
                <span className="text-[#9D9894] block">Shipping to:</span>
                <span className="text-[#222222]">{selectedOrder.address}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span>Payment Method:</span>
                <span className="font-semibold text-[#222222]">{selectedOrder.paymentMethod}</span>
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
                Request Exchange / Return
              </Button>
            </div>
          </aside>
        )}
      </div>

      {/* Return Request Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs fade-in" role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#EEE8E1]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-2xl font-light text-[#222222]">
                Exchange or Return
              </h3>
              <button
                onClick={() => {
                  setShowReturnModal(false)
                  setReturnSuccess(false)
                }}
                className="text-[#9D9894] hover:text-[#222222] text-lg font-bold"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            {returnSuccess ? (
              <div className="text-center py-6 space-y-4">
                <span className="w-12 h-12 rounded-full bg-[#EAF2EC] text-[#48755A] flex items-center justify-center text-xl font-bold mx-auto">
                  ✓
                </span>
                <h4 className="font-display text-xl font-light text-[#222222]">
                  Return Request Registered
                </h4>
                <p className="text-xs text-[#6F6B67] leading-relaxed">
                  Our courier will pick up the item within 48 hours. No printing needed — just have the parcel packed.
                </p>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => {
                    setShowReturnModal(false)
                    setReturnSuccess(false)
                  }}
                >
                  Done
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-[#6F6B67]">
                  StyleMind offers complimentary 14-day exchanges and returns for unworn pieces with tags attached.
                </p>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6F6B67] mb-1">
                    Select Reason
                  </label>
                  <select className="w-full px-4 py-2.5 rounded-xl border border-[#D8D0C6] text-sm outline-none bg-white">
                    <option>Size too large — exchange for smaller size</option>
                    <option>Size too small — exchange for larger size</option>
                    <option>Color different than expected</option>
                    <option>Change of mind</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6F6B67] mb-1">
                    Pickup Address
                  </label>
                  <input
                    defaultValue={selectedOrder?.address}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#D8D0C6] text-xs outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    fullWidth
                    onClick={() => setShowReturnModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    fullWidth
                    onClick={() => setReturnSuccess(true)}
                  >
                    Submit Request
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
