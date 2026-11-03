import { useState } from 'react'
import type { AppState, OutfitPiece } from '../types'
import { mockOutfitSuggestion } from '../data/mockData'
import OutfitItemCard from '../components/fashion/OutfitItemCard'
import { OwnedBadge, ShopBadge } from '../components/ui/Badges'
import Button from '../components/ui/Button'
import Money from '../components/ui/Money'

interface Props {
  onNavigate: (screen: string, opts?: any) => void
  app?: AppState
}

export default function OutfitResult({ onNavigate, app }: Props) {
  const [outfit] = useState(mockOutfitSuggestion)
  const [selectedPieces, setSelectedPieces] = useState<Set<string>>(new Set(['p1', 'p3']))
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'items' | 'why' | 'palette'>('items')

  const toggleSelect = (piece: OutfitPiece) => {
    if (!piece.productId) return
    setSelectedPieces(prev => {
      const next = new Set(prev)
      next.has(piece.productId!) ? next.delete(piece.productId!) : next.add(piece.productId!)
      return next
    })
  }

  const ownedItems = outfit.items.filter(i => i.status === 'owned')
  const shopItems = outfit.items.filter(i => i.status === 'shop')

  const totalBuyAmount = shopItems.reduce((sum, item) => {
    if (item.productId && selectedPieces.has(item.productId) && item.price) {
      return sum + item.price
    }
    return sum
  }, 0)

  const handleAddSelectedToCart = () => {
    if (!app?.addToCart) return

    shopItems
      .filter(item => item.productId && selectedPieces.has(item.productId))
      .forEach(item => {
        app.addToCart({
          productId: item.productId!,
          name: item.name,
          brand: item.brand,
          size: item.size || 'M',
          color: item.color || 'Oat',
          colorHex: item.colorHex,
          price: item.price || 0,
          image: item.image,
          available: true,
          aiRec: `Part of ${outfit.title}`,
        })
      })

    onNavigate('cart')
  }

  return (
    <div style={{ background: '#FAF8F5', minHeight: '100vh' }}>
      {/* Top Header & Breadcrumb */}
      <div className="px-6 md:px-16 pt-8 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EEE8E1]">
        <button
          onClick={() => onNavigate('ai-stylist')}
          className="flex items-center gap-2 text-sm text-[#6F6B67] hover:text-[#222222] transition-colors"
        >
          <span aria-hidden="true">←</span>
          <span>Back to Stylist</span>
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSaved(!saved)}
            className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
              saved
                ? 'bg-[#EAF2EC] text-[#48755A] border-[#48755A]/30'
                : 'bg-white text-[#3A3632] border-[#D8D0C6] hover:bg-[#EEE8E1]'
            }`}
          >
            {saved ? '✓ Saved to Favorites' : '♡ Save Outfit'}
          </button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('studio')}
          >
            Open in Visual Studio
          </Button>
        </div>
      </div>

      {/* Outfit Hero Banner */}
      <div className="px-6 md:px-16 py-8">
        <div className="max-w-4xl">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs uppercase tracking-[0.22em] font-semibold text-[#B98791]">
              ✦ AI Analysis & Breakdown
            </span>
            <div className="flex items-center gap-2">
              <OwnedBadge label={`${ownedItems.length} in wardrobe`} />
              <ShopBadge label={`${shopItems.length} to buy`} price={totalBuyAmount} />
            </div>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-light text-[#222222] mb-3">
            {outfit.title}
          </h1>
          <p className="text-sm sm:text-base text-[#6F6B67] leading-relaxed max-w-2xl">
            {outfit.notes}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-6 border-b border-[#EEE8E1] mt-8" role="tablist" aria-label="Outfit Breakdown Tabs">
          {[
            { key: 'items', label: 'Curated Pieces' },
            { key: 'why', label: 'Why This Works' },
            { key: 'palette', label: 'Color & Texture Story' },
          ].map(tab => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`pb-3 text-xs sm:text-sm font-semibold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === tab.key
                  ? 'border-[#684B5A] text-[#684B5A]'
                  : 'border-transparent text-[#9D9894] hover:text-[#222222]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-6 md:px-16 pb-24">
        {activeTab === 'items' && (
          <div className="grid lg:grid-cols-[1fr_360px] gap-10 items-start">
            <div className="space-y-10">
              {/* ZONE 1: YOU ALREADY OWN (Principle 1) */}
              <section aria-labelledby="owned-section-heading">
                <div className="p-4 rounded-2xl bg-[#EAF2EC]/60 border border-[#48755A]/25 mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-[#48755A] text-white flex items-center justify-center text-xs font-bold">
                      ✓
                    </span>
                    <div>
                      <h2 id="owned-section-heading" className="text-xs font-bold uppercase tracking-wider text-[#48755A]">
                        In Your Wardrobe ({ownedItems.length} items)
                      </h2>
                      <p className="text-xs text-[#48755A]/90">Zero additional spend needed for these pieces.</p>
                    </div>
                  </div>
                  <OwnedBadge label="All verified" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {ownedItems.map(item => (
                    <OutfitItemCard
                      key={item.name}
                      item={item}
                      onViewDetails={() => onNavigate('wardrobe')}
                    />
                  ))}
                </div>
              </section>

              {/* ZONE 2: RECOMMENDED TO BUY (Principle 1 & 2) */}
              <section aria-labelledby="shop-section-heading">
                <div className="p-4 rounded-2xl bg-[#F4E7E8]/70 border border-[#684B5A]/25 mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-[#684B5A] text-white flex items-center justify-center text-xs font-bold">
                      +
                    </span>
                    <div>
                      <h2 id="shop-section-heading" className="text-xs font-bold uppercase tracking-wider text-[#684B5A]">
                        Recommended To Complete Look ({shopItems.length} items)
                      </h2>
                      <p className="text-xs text-[#6F6B67]">Grounded catalog recommendations matched to your silhouettes.</p>
                    </div>
                  </div>
                  <Money amount={totalBuyAmount} className="text-sm font-bold text-[#684B5A]" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                  {shopItems.map(item => (
                    <OutfitItemCard
                      key={item.name}
                      item={item}
                      selected={item.productId ? selectedPieces.has(item.productId) : false}
                      onToggleSelect={toggleSelect}
                      onViewDetails={() => item.productId && onNavigate('product-detail', { productId: item.productId })}
                    />
                  ))}
                </div>
              </section>
            </div>

            {/* Sidebar Summary & Cart Action */}
            <aside className="sticky top-24 p-6 rounded-3xl bg-white border border-[#EEE8E1] shadow-sm space-y-6">
              <div>
                <h3 className="font-display text-xl font-light text-[#222222] mb-1">
                  Outfit Cost Summary
                </h3>
                <p className="text-xs text-[#6F6B67]">
                  {ownedItems.length} owned pieces + {selectedPieces.size} items to buy
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-[#EEE8E1] text-xs">
                <div className="flex justify-between text-[#48755A] font-medium">
                  <span>3 Owned Wardrobe Items</span>
                  <span>0₫ (Free)</span>
                </div>
                {shopItems.map(item => {
                  const isChecked = item.productId ? selectedPieces.has(item.productId) : false
                  return (
                    <div key={item.name} className="flex justify-between text-[#3A3632]">
                      <span className={!isChecked ? 'line-through text-[#9D9894]' : ''}>
                        {item.name} ({item.brand})
                      </span>
                      <span>{isChecked && item.price ? <Money amount={item.price} /> : '–'}</span>
                    </div>
                  )
                })}
                <div className="flex justify-between text-base font-semibold text-[#222222] pt-3 border-t border-[#EEE8E1]">
                  <span>Total to Add</span>
                  <Money amount={totalBuyAmount} className="text-lg text-[#684B5A]" />
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <Button
                  variant="primary"
                  fullWidth
                  size="lg"
                  disabled={selectedPieces.size === 0}
                  onClick={handleAddSelectedToCart}
                  icon={<span>🛒</span>}
                >
                  Add {selectedPieces.size} Selected to Bag
                </Button>
                <Button
                  variant="outline"
                  fullWidth
                  size="md"
                  onClick={() => onNavigate('travel')}
                >
                  Use in Travel Planner
                </Button>
              </div>
            </aside>
          </div>
        )}

        {activeTab === 'why' && (
          <div className="max-w-2xl p-8 rounded-3xl bg-white border border-[#EEE8E1] space-y-6">
            <h2 className="font-display text-2xl font-light text-[#222222]">Why this combination works</h2>
            <p className="text-sm text-[#6F6B67] leading-relaxed">
              {outfit.whyItWorks}
            </p>
            <div className="space-y-4 pt-4 border-t border-[#EEE8E1] text-xs text-[#3A3632]">
              <div className="flex items-start gap-3">
                <span className="text-[#684B5A] font-bold">1.</span>
                <p><strong>Balance of volumes:</strong> The structured shoulders of the TOTÊME blazer counterbalance the breezy drape of the wide-leg French linen trousers.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-[#684B5A] font-bold">2.</span>
                <p><strong>Tonal elevation:</strong> Rather than stark black and white, the soft oat, cream, and ecru tones evoke a relaxed European resort aesthetic.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-[#684B5A] font-bold">3.</span>
                <p><strong>Utility efficiency:</strong> 3 of the 5 pieces are from your saved wardrobe, reducing friction and unnecessary consumption.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'palette' && (
          <div className="max-w-2xl p-8 rounded-3xl bg-white border border-[#EEE8E1] space-y-6">
            <h2 className="font-display text-2xl font-light text-[#222222]">Harmonious Color Story</h2>
            <div className="flex items-center gap-4">
              {outfit.palette.map((hex, i) => (
                <div key={i} className="text-center">
                  <div
                    className="w-14 h-14 rounded-2xl border border-black/10 shadow-xs mb-2 mx-auto"
                    style={{ backgroundColor: hex }}
                  />
                  <span className="text-[11px] font-mono text-[#6F6B67]">{hex}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#6F6B67] leading-relaxed pt-4 border-t border-[#EEE8E1]">
              Composed entirely of natural fiber dyes — unbleached silk, raw Belgian linen, and vegetable-tanned leather.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
