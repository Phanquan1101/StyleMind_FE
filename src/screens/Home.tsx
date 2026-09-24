import { useState } from 'react'
import type { AppState, OutfitPiece } from '../types'
import { mockProducts, mockWardrobeItems } from '../data/mockData'
import Money from '../components/ui/Money'
import { OwnedBadge, ShopBadge } from '../components/ui/Badges'
import Button from '../components/ui/Button'
import OutfitItemCard from '../components/fashion/OutfitItemCard'

const occasions = ['Work', 'Date Night', 'Weekend', 'Party', 'Wedding', 'Travel', 'Casual', 'Special Occasion']

// Cohesive Outfit of the Day with clear Owned vs Shop separation
const outfitOfTheDayPieces: OutfitPiece[] = [
  {
    wardrobeId: 'w1',
    name: 'Cream Silk Blouse',
    brand: '& Other Stories',
    slot: 'Top',
    status: 'owned',
    image: 'https://images.unsplash.com/photo-1629511565591-a1d494ad6c58?w=300&h=400&fit=crop&auto=format',
    color: 'Cream',
    colorHex: '#F5EDD8',
    size: 'S',
  },
  {
    wardrobeId: 'w2',
    name: 'Wide-Leg Linen Trousers',
    brand: 'COS',
    slot: 'Bottom',
    status: 'owned',
    image: 'https://images.unsplash.com/photo-1645996830718-127f7e4f74fc?w=300&h=400&fit=crop&auto=format',
    color: 'Sand Ecru',
    colorHex: '#EEE8E1',
    size: 'S',
  },
  {
    productId: 'p1',
    name: 'Linen Oversized Blazer',
    brand: 'TOTÊME',
    slot: 'Outerwear',
    status: 'shop',
    price: 1850000,
    image: 'https://images.unsplash.com/photo-1619603364853-c92ff1fca11f?w=300&h=400&fit=crop&auto=format',
    color: 'Oat',
    colorHex: '#E8DDD2',
    size: 'M',
  },
  {
    wardrobeId: 'w3',
    name: 'White Leather Loafers',
    brand: 'Common Projects',
    slot: 'Shoes',
    status: 'owned',
    image: 'https://images.unsplash.com/photo-1625860191460-10a66c7384fb?w=300&h=400&fit=crop&auto=format',
    color: 'Warm White',
    colorHex: '#F2F0ED',
    size: '37',
  },
]

interface Props {
  onNavigate: (screen: string, opts?: any) => void
  app?: AppState
}

export default function Home({ onNavigate, app }: Props) {
  const [selectedOccasion, setSelectedOccasion] = useState<string | null>(null)
  const [favorited, setFavorited] = useState<Set<string>>(new Set(['p1']))

  const curatedProducts = mockProducts.slice(0, 4)

  const handleToggleFav = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setFavorited(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleAddMissingToCart = () => {
    const missing = outfitOfTheDayPieces.find(p => p.status === 'shop')
    if (missing && missing.productId && app?.addToCart) {
      app.addToCart({
        productId: missing.productId,
        name: missing.name,
        brand: missing.brand,
        size: missing.size || 'M',
        color: missing.color || 'Oat',
        colorHex: missing.colorHex,
        price: missing.price || 1850000,
        image: missing.image,
        available: true,
        aiRec: 'Outfit of the Day — Work Meeting',
      })
      onNavigate('cart')
    } else {
      onNavigate('outfit-result')
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#FAF8F5' }}>
      {/* Editorial Hero Section */}
      <section className="relative overflow-hidden" style={{ minHeight: '84vh' }} aria-label="StyleMind Introduction">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(https://images.unsplash.com/photo-1601762603339-fd61e28b698a?w=1600&h=1000&fit=crop&auto=format)` }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(105deg, rgba(34,34,34,0.72) 0%, rgba(34,34,34,0.32) 55%, transparent 100%)' }}
        />

        <div className="relative z-10 flex flex-col justify-end h-full px-6 md:px-16 pb-20 md:pb-28 max-w-5xl" style={{ minHeight: '84vh' }}>
          <div className="max-w-2xl fade-up">
            <p className="text-xs uppercase tracking-[0.24em] mb-4 font-semibold text-[#E8D0D2]">
              ✦ Personal Fashion Intelligence
            </p>
            <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-light text-white leading-[1.08] mb-6">
              Style what you own.
              <em className="block not-italic text-[#F4E7E8]">Discover what completes you.</em>
            </h1>
            <p className="text-white/85 text-base sm:text-lg mb-8 leading-relaxed max-w-xl font-normal">
              StyleMind grounds AI recommendations directly into your real wardrobe — suggesting only the exact pieces you need to unlock dozens of new looks.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button
                variant="primary"
                size="lg"
                onClick={() => onNavigate('ai-stylist')}
                icon={<span>✦</span>}
              >
                Ask StyleMind
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-white/60 text-white hover:bg-white/10"
                onClick={() => onNavigate('shop')}
              >
                Explore Catalog
              </Button>
            </div>
          </div>
        </div>

        {/* Occasion Discovery Strip */}
        <div
          className="absolute bottom-0 left-0 right-0 z-20 backdrop-blur-md border-t border-white/15"
          style={{ background: 'rgba(34,34,34,0.55)' }}
        >
          <div className="px-6 md:px-16 py-3.5">
            <p className="text-white/65 text-[11px] uppercase tracking-widest font-semibold mb-2.5">
              What occasion are you dressing for?
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }} role="group" aria-label="Occasion filters">
              {occasions.map(occ => {
                const isSelected = selectedOccasion === occ
                return (
                  <button
                    key={occ}
                    type="button"
                    onClick={() => {
                      setSelectedOccasion(occ)
                      onNavigate('ai-stylist', { occasion: occ })
                    }}
                    className={`flex-none px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                      isSelected
                        ? 'bg-[#684B5A] text-[#FAF8F5] shadow-xs'
                        : 'bg-white/10 text-white/90 border border-white/20 hover:bg-white/20'
                    }`}
                  >
                    {occ}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Outfit of the Day Section with Strict Owned vs Shop Separation */}
      <section className="px-6 md:px-16 py-16" aria-labelledby="ootd-heading">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[#B98791] mb-1">
              Daily Curated Look
            </p>
            <h2 id="ootd-heading" className="font-display text-3xl md:text-4xl font-light text-[#222222]">
              Outfit of the Day
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('outfit-result')}
            className="text-sm font-medium text-[#684B5A] hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>View Full Outfit Analysis</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
          {/* Grid of Outfit Pieces */}
          <div className="space-y-4">
            {/* Context Notice */}
            <div className="p-4 rounded-2xl border border-[#D8D0C6] bg-[#FFFFFF] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-[#F4E7E8] text-[#684B5A] flex items-center justify-center text-sm font-semibold flex-none">
                  ✦
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-[#222222]">Work Meeting Capsule</h3>
                  <p className="text-xs text-[#6F6B67]">
                    You already own <strong>3 out of 4 pieces</strong>. Adding the Linen Blazer completes this look.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <OwnedBadge label="3 Owned" />
                <ShopBadge label="1 To Buy" price={1850000} />
              </div>
            </div>

            {/* Pieces Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {outfitOfTheDayPieces.map((piece) => (
                <OutfitItemCard
                  key={piece.name}
                  item={piece}
                  onViewDetails={() => {
                    if (piece.productId) {
                      onNavigate('product-detail', { productId: piece.productId })
                    } else {
                      onNavigate('wardrobe')
                    }
                  }}
                  onToggleSelect={() => handleAddMissingToCart()}
                />
              ))}
            </div>
          </div>

          {/* Editorial AI Reasoning Card */}
          <div className="p-6 md:p-8 rounded-2xl bg-[#F4E7E8] border border-[#684B5A]/15 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[#684B5A] font-bold">✦</span>
                <span className="text-xs font-bold uppercase tracking-wider text-[#684B5A]">StyleMind Stylist Insight</span>
              </div>
              <blockquote className="font-serif italic text-base md:text-lg text-[#222222] leading-relaxed mb-4">
                "This outfit balances effortless structure with breathable comfort. Your silk blouse and wide-leg linen pants form the base; the TOTÊME blazer adds tailoring without feeling restrictive."
              </blockquote>
              <div className="pt-4 border-t border-[#684B5A]/15">
                <p className="text-xs font-medium text-[#6F6B67] mb-2">Palette harmony:</p>
                <div className="flex items-center gap-2">
                  {['#F5EDD8', '#EEE8E1', '#E8DDD2', '#F2F0ED'].map((hex, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full border border-black/10 shadow-2xs"
                      style={{ backgroundColor: hex }}
                      title={hex}
                    />
                  ))}
                  <span className="text-xs text-[#6F6B67] ml-1">Warm Ecru & Ivory</span>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <Button
                variant="primary"
                fullWidth
                size="md"
                onClick={handleAddMissingToCart}
                icon={<span>+</span>}
              >
                Add Blazer to Cart (1.850.000₫)
              </Button>
              <Button
                variant="outline"
                fullWidth
                size="md"
                className="bg-white/40 border-[#684B5A]/30 text-[#684B5A]"
                onClick={() => onNavigate('studio')}
              >
                Preview in Visual Studio
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Recommended For You — Grounded Catalog Products */}
      <section className="px-6 md:px-16 py-12 pb-16 bg-[#EEE8E1]/30 border-y border-[#EEE8E1]" aria-labelledby="curated-heading">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[#B98791] mb-1">
              Curated for your aesthetic
            </p>
            <h2 id="curated-heading" className="font-display text-3xl md:text-4xl font-light text-[#222222]">
              Recommended For You
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('shop')}
            className="text-sm font-medium text-[#684B5A] hover:underline"
          >
            Browse all collection →
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {curatedProducts.map(product => {
            const isFav = favorited.has(product.id)
            return (
              <div
                key={product.id}
                onClick={() => onNavigate('product-detail', { productId: product.id })}
                className="group cursor-pointer rounded-2xl bg-white border border-[#EEE8E1] overflow-hidden p-3 transition-all hover:border-[#684B5A]/40 hover:shadow-md"
              >
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[#EEE8E1] mb-3">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
                  />
                  <button
                    type="button"
                    onClick={(e) => handleToggleFav(product.id, e)}
                    aria-label={isFav ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
                    className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-sm shadow-xs transition-transform hover:scale-110"
                  >
                    <span style={{ color: isFav ? '#A94B4B' : '#9D9894' }}>
                      {isFav ? '♥' : '♡'}
                    </span>
                  </button>
                  <div className="absolute bottom-2 left-2 right-2">
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#FAF8F5]/92 backdrop-blur-xs text-[#48755A] border border-[#48755A]/20 shadow-2xs block truncate">
                      ✓ {product.aiHint}
                    </span>
                  </div>
                </div>

                <div className="px-1">
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-[#B98791] mb-0.5">
                    {product.brand}
                  </p>
                  <h3 className="font-sans text-sm font-medium text-[#222222] truncate mb-1" title={product.name}>
                    {product.name}
                  </h3>
                  <div className="flex items-center justify-between pt-1">
                    <Money amount={product.price} className="text-sm font-semibold text-[#222222]" />
                    <div className="flex gap-1" aria-label="Available colors">
                      {product.colors.map(c => (
                        <div
                          key={c.name}
                          className="w-3 h-3 rounded-full border border-black/15"
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Wardrobe Smart Insights Banner */}
      <section className="px-6 md:px-16 py-14" aria-label="Smart Wardrobe Insights">
        <div className="rounded-3xl p-8 md:p-12 text-white relative overflow-hidden" style={{ background: '#684B5A' }}>
          <div className="grid md:grid-cols-2 gap-8 items-center relative z-10">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] font-semibold text-[#E8D0D2] mb-3">
                Smart Wardrobe Optimization
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-light mb-4 leading-tight text-white">
                Your cream blouse works with <em className="not-italic text-[#F4E7E8]">8 different outfits.</em>
              </h2>
              <p className="text-white/80 text-sm md:text-base leading-relaxed mb-6 max-w-lg">
                StyleMind automatically identifies cross-outfit synergy in your wardrobe so you buy fewer, higher-utility pieces.
              </p>
              <Button
                variant="secondary"
                size="md"
                className="bg-[#FAF8F5] text-[#684B5A] border-none font-semibold hover:bg-white"
                onClick={() => onNavigate('wardrobe')}
              >
                Explore My Wardrobe
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Wardrobe Items', value: `${mockWardrobeItems.length}` },
                { label: 'Calculated Combos', value: '124' },
                { label: 'Reused Rate', value: '78%' },
              ].map(stat => (
                <div key={stat.label} className="rounded-2xl p-4 sm:p-5 text-center bg-white/10 backdrop-blur-xs border border-white/10">
                  <p className="font-display text-2xl sm:text-3xl font-light text-white mb-1">{stat.value}</p>
                  <p className="text-[11px] text-white/70 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Travel Planner Teaser Card */}
      <section className="px-6 md:px-16 pb-24" aria-label="Travel Planning Capsule">
        <div
          onClick={() => onNavigate('travel')}
          className="rounded-3xl overflow-hidden relative cursor-pointer border border-[#EEE8E1] group transition-all hover:border-[#684B5A]/40 hover:shadow-lg"
          style={{ background: '#EEE8E1' }}
        >
          <div className="grid md:grid-cols-2 items-center">
            <div className="p-8 md:p-12">
              <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[#B98791] mb-2">
                Travel Capsule Planner
              </p>
              <h3 className="font-display text-2xl md:text-3xl font-light text-[#222222] mb-3 leading-snug">
                Planning a getaway to <em className="not-italic text-[#684B5A]">Da Lat</em>?
              </h3>
              <p className="text-sm text-[#6F6B67] mb-6 leading-relaxed max-w-md">
                Pack lighter and smarter. StyleMind plans a complete 4-day capsule using your owned wardrobe first, with only 2 gap-filling recommendations.
              </p>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#684B5A] group-hover:translate-x-1 transition-transform">
                <span>View 4-Day Travel Plan</span>
                <span aria-hidden="true">→</span>
              </span>
            </div>
            <div className="h-64 md:h-full min-h-[260px] overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1662532577856-e8ee8b138a8b?w=800&h=600&fit=crop&auto=format"
                alt="Da Lat mountain landscape"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
