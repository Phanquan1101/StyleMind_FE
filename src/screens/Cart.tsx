import React from 'react'
import type { AppState } from '../types'
import Money from '../components/ui/Money'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'

interface Props {
  onNavigate: (screen: string, opts?: any) => void
  cartCount?: number
  setCartCount?: (n: number | ((prev: number) => number)) => void
  app?: AppState
}

export default function Cart({ onNavigate, app }: Props) {
  const items = app?.cartItems || []
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0)
  const shipping = subtotal >= 2000000 || subtotal === 0 ? 0 : 30000
  const total = subtotal + shipping

  if (items.length === 0) {
    return (
      <div style={{ background: '#FAF8F5', minHeight: '100vh' }}>
        <EmptyState
          icon="🛍"
          title="Your Shopping Bag is Empty"
          description="StyleMind only recommends pieces that complete outfits with clothes you already own. Ask the AI stylist or explore the catalog to find your next key addition."
          primaryAction={{
            label: '✦ Ask StyleMind Stylist',
            onClick: () => onNavigate('ai-stylist'),
          }}
          secondaryAction={{
            label: 'Explore Collection',
            onClick: () => onNavigate('shop'),
          }}
        />
      </div>
    )
  }

  return (
    <div style={{ background: '#FAF8F5', minHeight: '100vh' }}>
      <div className="px-6 md:px-16 pt-10 pb-6">
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-light text-[#222222] mb-1">
          Shopping Bag
        </h1>
        <p className="text-sm text-[#6F6B67]">
          {items.reduce((sum, i) => sum + i.qty, 0)} item{items.length !== 1 ? 's' : ''} · Selected to complete your saved outfits
        </p>
      </div>

      <div className="px-6 md:px-16 pb-24 grid lg:grid-cols-[1fr_380px] gap-10 items-start">
        {/* Cart Items List */}
        <div className="space-y-4">
          {/* AI Outfit Synergy Banner */}
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#F4E7E8] border border-[#684B5A]/20">
            <span className="text-[#684B5A] text-base" aria-hidden="true">✦</span>
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-[#684B5A]">
                These pieces unlock complete outfits across your saved <strong>Da Lat Travel Capsule</strong>.
              </p>
            </div>
            <button
              onClick={() => onNavigate('outfit-result')}
              className="text-xs font-semibold text-[#684B5A] underline hover:opacity-80 flex-none"
            >
              View outfits →
            </button>
          </div>

          {items.map(item => (
            <div
              key={item.id}
              className="p-4 sm:p-5 rounded-3xl bg-white border border-[#EEE8E1] shadow-2xs flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
            >
              <div className="flex gap-4 items-center">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-20 h-24 sm:w-24 sm:h-28 rounded-2xl object-cover bg-[#EEE8E1] border border-[#EEE8E1] flex-none"
                />
                <div>
                  {item.aiRec && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#F4E7E8] text-[#684B5A] mb-1 inline-block">
                      ✦ {item.aiRec}
                    </span>
                  )}
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#B98791]">
                    {item.brand}
                  </p>
                  <h3 className="font-sans text-sm sm:text-base font-medium text-[#222222] mb-1">
                    {item.name}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-[#6F6B67] mb-2">
                    <span>Size: <strong className="text-[#222222]">{item.size}</strong></span>
                    <span>Color: <strong className="text-[#222222]">{item.color}</strong></span>
                  </div>
                  <Money amount={item.price} className="text-sm font-semibold text-[#222222]" />
                </div>
              </div>

              {/* Quantity controls & Remove */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4 pt-3 sm:pt-0 border-t sm:border-0 border-[#EEE8E1]">
                <div className="flex items-center border border-[#D8D0C6] rounded-full overflow-hidden bg-[#FAF8F5]">
                  <button
                    type="button"
                    onClick={() => app?.updateCartQty(item.id, -1)}
                    aria-label={`Decrease quantity of ${item.name}`}
                    className="w-8 h-8 flex items-center justify-center text-sm text-[#6F6B67] hover:bg-[#EEE8E1] transition-colors"
                  >
                    –
                  </button>
                  <span className="w-8 text-center text-xs font-semibold text-[#222222]" aria-label={`Quantity: ${item.qty}`}>
                    {item.qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => app?.updateCartQty(item.id, 1)}
                    aria-label={`Increase quantity of ${item.name}`}
                    className="w-8 h-8 flex items-center justify-center text-sm text-[#6F6B67] hover:bg-[#EEE8E1] transition-colors"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => app?.removeFromCart(item.id)}
                  aria-label={`Remove ${item.name} from bag`}
                  className="text-xs text-[#9D9894] hover:text-[#A94B4B] underline"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary Sidebar */}
        <aside className="p-6 md:p-8 rounded-3xl bg-white border border-[#EEE8E1] shadow-xs space-y-6 sticky top-24">
          <div>
            <h2 className="font-display text-2xl font-light text-[#222222] mb-1">
              Order Summary
            </h2>
            <p className="text-xs text-[#6F6B67]">All orders include carbon-neutral packaging</p>
          </div>

          <div className="space-y-3 pt-4 border-t border-[#EEE8E1] text-sm">
            <div className="flex justify-between text-[#6F6B67]">
              <span>Subtotal</span>
              <Money amount={subtotal} className="text-[#222222] font-semibold" />
            </div>
            <div className="flex justify-between text-[#6F6B67]">
              <span>Standard Shipping (Vietnam)</span>
              <span>{shipping === 0 ? <span className="text-[#48755A] font-semibold">Free</span> : <Money amount={shipping} />}</span>
            </div>
            {subtotal < 2000000 && (
              <p className="text-[11px] text-[#B67A32] bg-[#FBF1E0] p-2 rounded-lg">
                Add <Money amount={2000000 - subtotal} /> more to qualify for Free Shipping.
              </p>
            )}
            <div className="flex justify-between text-base font-semibold text-[#222222] pt-3 border-t border-[#EEE8E1]">
              <span>Total</span>
              <Money amount={total} className="text-xl text-[#684B5A]" />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              variant="primary"
              fullWidth
              size="lg"
              onClick={() => onNavigate('checkout')}
              icon={<span>💳</span>}
            >
              Proceed to Checkout
            </Button>
            <Button
              variant="outline"
              fullWidth
              size="md"
              onClick={() => onNavigate('shop')}
            >
              Continue Shopping
            </Button>
          </div>
        </aside>
      </div>
    </div>
  )
}
