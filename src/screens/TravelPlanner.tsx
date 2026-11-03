import { useState } from 'react'
import type { AppState } from '../types'
import { travelDayOutfits, formatVND } from '../data/mockData'
import PageHeader from '../components/ui/PageHeader'
import { OwnedBadge, ShopBadge } from '../components/ui/Badges'
import Button from '../components/ui/Button'
import Money from '../components/ui/Money'

interface Props {
  onNavigate: (screen: string, opts?: any) => void
  app?: AppState
}

export default function TravelPlanner({ onNavigate, app }: Props) {
  const [selectedDay, setSelectedDay] = useState(1)
  const [destination] = useState('Da Lat, Vietnam')
  const [duration] = useState('4 Days · 3 Nights')

  const currentDayData = travelDayOutfits.find(d => d.day === selectedDay) || travelDayOutfits[0]

  // Calculate unique shop items across entire 4-day capsule
  const allShopItemsMap = new Map<string, (typeof travelDayOutfits)[0]['shopItems'][0]>()
  travelDayOutfits.forEach(day => {
    day.shopItems.forEach(item => {
      if (!allShopItemsMap.has(item.id)) {
        allShopItemsMap.set(item.id, item)
      }
    })
  })
  const uniqueShopItems = Array.from(allShopItemsMap.values())
  const totalTravelShopCost = uniqueShopItems.reduce((sum, i) => sum + i.price, 0)

  // Calculate unique owned items across 4-day capsule
  const allOwnedItemsMap = new Map<string, (typeof travelDayOutfits)[0]['ownedItems'][0]>()
  travelDayOutfits.forEach(day => {
    day.ownedItems.forEach(item => {
      if (!allOwnedItemsMap.has(item.id)) {
        allOwnedItemsMap.set(item.id, item)
      }
    })
  })
  const uniqueOwnedItems = Array.from(allOwnedItemsMap.values())

  const handleAddAllMissingToCart = () => {
    if (!app?.addToCart) return

    uniqueShopItems.forEach(item => {
      app.addToCart({
        productId: item.id,
        name: item.name,
        brand: item.brand,
        size: 'S',
        color: 'Standard',
        price: item.price,
        image: item.image,
        available: true,
        aiRec: `4-Day Travel Capsule for ${destination}`,
      })
    })

    onNavigate('cart')
  }

  return (
    <div style={{ background: '#FAF8F5', minHeight: '100vh' }}>
      <PageHeader
        category="✦ AI Travel Capsule Planner"
        title="Da Lat Itinerary Capsule"
        subtitle={`Packing plan for ${destination} · ${duration}. Maximizes wardrobe reuse so you pack less and travel light.`}
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={handleAddAllMissingToCart}
              icon={<span>🛒</span>}
            >
              Add {uniqueShopItems.length} Missing Pieces to Bag ({formatVND(totalTravelShopCost)})
            </Button>
          </div>
        }
      />

      {/* Capsule Stats Bar */}
      <div className="px-6 md:px-16 mb-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 rounded-3xl bg-white border border-[#EEE8E1] shadow-2xs">
          <div>
            <span className="text-[11px] uppercase font-bold tracking-wider text-[#9D9894]">Destination</span>
            <p className="font-serif text-lg font-semibold text-[#222222] mt-0.5">{destination}</p>
          </div>
          <div>
            <span className="text-[11px] uppercase font-bold tracking-wider text-[#9D9894]">Owned Reused</span>
            <p className="font-serif text-lg font-semibold text-[#48755A] mt-0.5">{uniqueOwnedItems.length} Pieces (70%)</p>
          </div>
          <div>
            <span className="text-[11px] uppercase font-bold tracking-wider text-[#9D9894]">New Additions</span>
            <p className="font-serif text-lg font-semibold text-[#684B5A] mt-0.5">{uniqueShopItems.length} Pieces Needed</p>
          </div>
          <div>
            <span className="text-[11px] uppercase font-bold tracking-wider text-[#9D9894]">Luggage Efficiency</span>
            <p className="font-serif text-lg font-semibold text-[#222222] mt-0.5">Carry-on Only</p>
          </div>
        </div>
      </div>

      {/* Day Selector Tabs */}
      <div className="px-6 md:px-16 mb-8">
        <div className="flex gap-3 overflow-x-auto pb-2" role="tablist" aria-label="Travel days">
          {travelDayOutfits.map(d => {
            const isSelected = selectedDay === d.day
            const is100Owned = d.shopItems.length === 0
            return (
              <button
                key={d.day}
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedDay(d.day)}
                className={`flex-none p-4 rounded-2xl border text-left min-w-[200px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#684B5A] ${
                  isSelected
                    ? 'bg-[#FFFFFF] border-[#684B5A] ring-2 ring-[#684B5A]/20 shadow-sm'
                    : 'bg-[#FDFCFA] border-[#EEE8E1] hover:border-[#D8D0C6]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#B98791]">
                    Day {d.day}
                  </span>
                  {is100Owned ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EAF2EC] text-[#48755A]">
                      100% Owned
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F4E7E8] text-[#684B5A]">
                      +{d.shopItems.length} piece
                    </span>
                  )}
                </div>
                <h3 className="font-display text-base font-normal text-[#222222] truncate">
                  {d.label}
                </h3>
                <p className="text-xs text-[#6F6B67] mt-1">{d.weather}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected Day View with Strict Owned vs Shop Distinction */}
      <div className="px-6 md:px-16 pb-24">
        <div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">
          {/* Day Pieces Breakdown */}
          <div className="space-y-8">
            {/* Day Header & Stylist Weather Advice */}
            <div className="p-6 rounded-3xl bg-[#F4E7E8] border border-[#684B5A]/15">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[#684B5A] font-bold">✦</span>
                <span className="text-xs font-bold uppercase tracking-wider text-[#684B5A]">
                  Day {currentDayData.day} Styling Rationale · {currentDayData.weather}
                </span>
              </div>
              <p className="text-sm text-[#222222] leading-relaxed mb-3">
                {currentDayData.note}
              </p>
              <div className="flex items-center gap-2 pt-2 border-t border-[#684B5A]/15 text-xs text-[#684B5A] font-medium">
                <span>Color story:</span>
                {currentDayData.colorStory.map((c, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 rounded-full border border-black/10"
                    style={{ backgroundColor: c }}
                  />
                ))}
                <span className="text-[#6F6B67] ml-2">({currentDayData.aiNote})</span>
              </div>
            </div>

            {/* ZONE 1: PIECES ALREADY OWNED FOR THIS DAY */}
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EEE8E1]">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#EAF2EC] text-[#48755A] flex items-center justify-center text-xs font-bold">
                    ✓
                  </span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#48755A]">
                    Owned Wardrobe Pieces ({currentDayData.ownedItems.length} items)
                  </h3>
                </div>
                <span className="text-xs text-[#48755A] font-medium">No purchase needed</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {currentDayData.ownedItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => onNavigate('wardrobe')}
                    className="rounded-2xl border border-[#D8D0C6] bg-white p-3 flex flex-col justify-between hover:border-[#48755A] cursor-pointer transition-all"
                  >
                    <div>
                      <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[#EEE8E1] mb-2.5">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        <div className="absolute top-2 left-2">
                          <OwnedBadge label="Owned" />
                        </div>
                      </div>
                      <p className="text-[11px] uppercase tracking-wider font-semibold text-[#B98791]">
                        {item.brand || 'Your Wardrobe'}
                      </p>
                      <h4 className="font-sans text-xs font-medium text-[#222222] truncate">
                        {item.name}
                      </h4>
                    </div>
                    <div className="pt-2 border-t border-[#EEE8E1] mt-2 text-[11px] text-[#48755A]">
                      ✓ In your packing list
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ZONE 2: SHOP RECOMMENDATIONS FOR THIS DAY */}
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EEE8E1]">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#F4E7E8] text-[#684B5A] flex items-center justify-center text-xs font-bold">
                    +
                  </span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#684B5A]">
                    Recommended Additions ({currentDayData.shopItems.length} items)
                  </h3>
                </div>
                {currentDayData.shopItems.length === 0 && (
                  <span className="text-xs font-bold text-[#48755A]">100% Wardrobe Complete!</span>
                )}
              </div>

              {currentDayData.shopItems.length === 0 ? (
                <div className="p-6 rounded-2xl border border-[#D8D0C6] bg-white text-center">
                  <span className="text-2xl block mb-2">🌿</span>
                  <h4 className="font-display text-lg font-light text-[#222222] mb-1">
                    Zero purchases required for Day {currentDayData.day}
                  </h4>
                  <p className="text-xs text-[#6F6B67] max-w-sm mx-auto">
                    This look is entirely composed of clothes you already own, perfectly suited to returning home.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {currentDayData.shopItems.map(item => (
                    <div
                      key={item.id}
                      onClick={() => onNavigate('product-detail', { productId: item.id })}
                      className="rounded-2xl border border-[#EEE8E1] bg-white p-3.5 flex flex-col justify-between hover:border-[#684B5A] cursor-pointer shadow-2xs transition-all"
                    >
                      <div>
                        <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[#EEE8E1] mb-2.5">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          <div className="absolute top-2 left-2">
                            <ShopBadge price={item.price} />
                          </div>
                        </div>
                        <p className="text-[11px] uppercase tracking-wider font-semibold text-[#B98791]">
                          {item.brand}
                        </p>
                        <h4 className="font-sans text-xs font-medium text-[#222222] truncate">
                          {item.name}
                        </h4>
                      </div>
                      <div className="pt-2 border-t border-[#EEE8E1] mt-2 flex items-center justify-between">
                        <Money amount={item.price} className="text-xs font-bold text-[#222222]" />
                        <span className="text-xs text-[#684B5A] font-semibold hover:underline">
                          View details →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Packing Checklist Sidebar */}
          <aside className="sticky top-24 p-6 rounded-3xl bg-white border border-[#EEE8E1] space-y-6">
            <div>
              <h3 className="font-display text-xl font-light text-[#222222] mb-1">
                Capsule Packing List
              </h3>
              <p className="text-xs text-[#6F6B67]">
                Everything you need for all 4 days in Da Lat
              </p>
            </div>

            <div className="space-y-3 pt-3 border-t border-[#EEE8E1]">
              <p className="text-xs font-bold uppercase tracking-wider text-[#48755A]">
                ✓ From Wardrobe to Pack ({uniqueOwnedItems.length})
              </p>
              <div className="space-y-1.5">
                {uniqueOwnedItems.map(i => (
                  <div key={i.id} className="flex items-center gap-2 text-xs text-[#3A3632]">
                    <span className="w-4 h-4 rounded-full bg-[#EAF2EC] text-[#48755A] flex items-center justify-center text-[10px] font-bold">
                      ✓
                    </span>
                    <span>{i.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-[#EEE8E1]">
              <p className="text-xs font-bold uppercase tracking-wider text-[#684B5A]">
                + Recommended to Buy ({uniqueShopItems.length})
              </p>
              <div className="space-y-1.5">
                {uniqueShopItems.map(i => (
                  <div key={i.id} className="flex items-center justify-between text-xs text-[#3A3632]">
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-[#F4E7E8] text-[#684B5A] flex items-center justify-center text-[10px] font-bold">
                        +
                      </span>
                      <span>{i.name}</span>
                    </span>
                    <Money amount={i.price} className="font-medium text-[11px]" />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-[#EEE8E1]">
              <Button
                variant="primary"
                fullWidth
                size="lg"
                onClick={handleAddAllMissingToCart}
                icon={<span>🛒</span>}
              >
                Add {uniqueShopItems.length} Missing to Bag ({formatVND(totalTravelShopCost)})
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
