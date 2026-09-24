import { useState } from 'react'
import type { AppState } from '../types'
import { mockProducts, mockWardrobeItems } from '../data/mockData'
import Money from '../components/ui/Money'
import { OwnedBadge, UnavailableBadge } from '../components/ui/Badges'
import Button from '../components/ui/Button'
import ColorSwatch from '../components/fashion/ColorSwatch'
import SizeSelector from '../components/fashion/SizeSelector'

interface Props {
  onNavigate: (screen: string, opts?: any) => void
  app?: AppState
}

export default function ProductDetail({ onNavigate, app }: Props) {
  const productId = app?.opts?.productId || 'p1'
  const product = mockProducts.find(p => p.id === productId) || mockProducts[0]

  const [selectedColorIdx, setSelectedColorIdx] = useState(0)
  const [selectedSize, setSelectedSize] = useState<string | null>(
    product.availableSizes.includes(product.recommendedSize)
      ? product.recommendedSize
      : product.availableSizes[0] || null
  )
  const [activeImg, setActiveImg] = useState(0)
  const [addedFeedback, setAddedFeedback] = useState(false)
  const [favorited, setFavorited] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'materials' | 'fit'>('details')

  const selectedColor = product.colors[selectedColorIdx] || product.colors[0]
  const isOutOfStock = product.inStock === false || product.availableSizes.length === 0
  const isSizeAvailable = selectedSize ? product.availableSizes.includes(selectedSize) : false

  // Wardrobe pieces that match this item
  const matchingWardrobeItems = mockWardrobeItems.slice(0, 3)

  const handleAddToCart = () => {
    if (!isSizeAvailable || isOutOfStock || !selectedSize) return

    if (app?.addToCart) {
      app.addToCart({
        productId: product.id,
        name: product.name,
        brand: product.brand,
        size: selectedSize,
        color: selectedColor.name,
        colorHex: selectedColor.hex,
        price: product.price,
        image: product.image,
        available: true,
        aiRec: `Matches ${product.wardrobeMatches} items in your wardrobe`,
      })
    }

    setAddedFeedback(true)
    setTimeout(() => setAddedFeedback(false), 2200)
  }

  return (
    <div style={{ background: '#FAF8F5', minHeight: '100vh' }}>
      <div className="px-6 md:px-16 py-6">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs mb-8 text-[#9D9894]">
          <button
            onClick={() => onNavigate('shop')}
            className="hover:text-[#222222] transition-colors"
          >
            Shop
          </button>
          <span aria-hidden="true">/</span>
          <button
            onClick={() => onNavigate('shop')}
            className="hover:text-[#222222] transition-colors"
          >
            {product.category}
          </button>
          <span aria-hidden="true">/</span>
          <span className="text-[#3A3632] font-medium" aria-current="page">
            {product.name}
          </span>
        </nav>

        {/* Product Workspace Grid */}
        <div className="grid lg:grid-cols-[1fr_480px] gap-12 items-start">
          {/* Gallery Gallery Panel */}
          <div className="flex flex-col-reverse md:flex-row gap-4">
            {/* Thumbnails */}
            <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-visible flex-none" role="group" aria-label="Product image thumbnails">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImg(i)}
                  aria-label={`View image ${i + 1} of ${product.name}`}
                  aria-current={activeImg === i ? 'true' : undefined}
                  className={`w-16 h-20 rounded-xl overflow-hidden border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#684B5A] ${
                    activeImg === i ? 'border-[#684B5A] ring-2 ring-[#684B5A]/20' : 'border-[#EEE8E1] hover:border-[#D8D0C6]'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            {/* Main Featured Image */}
            <div className="relative flex-1 aspect-[3/4] rounded-2xl overflow-hidden bg-[#EEE8E1] border border-[#EEE8E1]">
              <img
                src={product.images[activeImg] || product.image}
                alt={`${product.name} in ${selectedColor.name}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setFavorited(!favorited)}
                aria-label={favorited ? 'Remove from favorites' : 'Save to favorites'}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center shadow-sm text-base transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#684B5A]"
              >
                <span style={{ color: favorited ? '#A94B4B' : '#9D9894' }}>
                  {favorited ? '♥' : '♡'}
                </span>
              </button>
              {isOutOfStock && (
                <div className="absolute top-4 left-4">
                  <UnavailableBadge reason="Out of Stock" size="md" />
                </div>
              )}
            </div>
          </div>

          {/* Product Details Panel */}
          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] font-semibold text-[#B98791] mb-1">
                {product.brand}
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-light text-[#222222] mb-3">
                {product.name}
              </h1>
              <div className="flex items-center gap-3 mb-4">
                <Money amount={product.price} className="text-2xl font-semibold text-[#222222]" />
                <span className="text-xs px-2.5 py-1 rounded-full bg-[#EEE8E1] text-[#6F6B67] font-medium">
                  {product.fit} Fit
                </span>
              </div>
            </div>

            {/* Wardrobe AI Context Alert */}
            <div className="p-4 rounded-2xl bg-[#F4E7E8] border border-[#684B5A]/20 flex items-start gap-3">
              <span className="text-[#684B5A] text-lg leading-none mt-0.5" aria-hidden="true">✦</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#684B5A] mb-1">
                  StyleMind Synergy
                </p>
                <p className="text-xs sm:text-sm text-[#3A3632] leading-relaxed">
                  Matches <strong>{product.wardrobeMatches} items</strong> in your existing wardrobe. Pairing this with your Cream Silk Blouse and Loafers creates a complete work-to-dinner look.
                </p>
              </div>
            </div>

            {/* Color Swatch Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6F6B67]">
                  Color: <strong className="text-[#222222] font-medium">{selectedColor.name}</strong>
                </span>
              </div>
              <ColorSwatch
                colors={product.colors}
                selectedColor={selectedColor.name}
                onSelect={(_, idx) => setSelectedColorIdx(idx)}
                showLabels={true}
              />
            </div>

            {/* Size Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6F6B67]">
                  Select Size
                </span>
                <span className="text-xs text-[#6F6B67]">
                  Usual size: <strong>S / M</strong>
                </span>
              </div>
              <SizeSelector
                sizes={product.sizes}
                availableSizes={product.availableSizes}
                selectedSize={selectedSize}
                recommendedSize={product.recommendedSize}
                onSelectSize={setSelectedSize}
              />
              {/* Product Principle 74: Respectful fit advisory */}
              <div className="mt-3 p-3 rounded-xl bg-[#EEE8E1]/50 border border-[#D8D0C6] text-xs text-[#6F6B67] leading-relaxed">
                <p>
                  <strong>Fit note:</strong> {product.recommendedSizeReason}
                </p>
                <p className="text-[11px] text-[#9D9894] mt-1">
                  Fit suggestions are based on your optional profile preferences and can be updated anytime in Settings.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <Button
                variant="primary"
                fullWidth
                size="lg"
                disabled={isOutOfStock || !isSizeAvailable}
                onClick={handleAddToCart}
                icon={addedFeedback ? <span>✓</span> : <span>+</span>}
              >
                {addedFeedback
                  ? 'Added to Bag!'
                  : isOutOfStock
                  ? 'Product Out of Stock'
                  : !isSizeAvailable
                  ? 'Selected Size Unavailable'
                  : `Add to Bag · ${selectedSize ? `Size ${selectedSize}` : ''}`}
              </Button>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  fullWidth
                  size="md"
                  onClick={() => onNavigate('ai-stylist')}
                  icon={<span>✦</span>}
                >
                  Style With My Wardrobe
                </Button>
                <Button
                  variant="outline"
                  fullWidth
                  size="md"
                  onClick={() => onNavigate('studio')}
                >
                  View in Studio
                </Button>
              </div>
            </div>

            {/* Editorial Information Tabs */}
            <div className="pt-6 border-t border-[#EEE8E1]">
              <div className="flex gap-4 border-b border-[#EEE8E1] pb-2 mb-4" role="tablist">
                {[
                  { key: 'details', label: 'Description' },
                  { key: 'materials', label: 'Material & Care' },
                  { key: 'fit', label: 'Sizing Guide' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    role="tab"
                    aria-selected={activeTab === tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`text-xs font-semibold uppercase tracking-wider pb-1 transition-colors ${
                      activeTab === tab.key
                        ? 'border-b-2 border-[#684B5A] text-[#684B5A]'
                        : 'text-[#9D9894] hover:text-[#222222]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === 'details' && (
                <p className="text-sm text-[#6F6B67] leading-relaxed">
                  {product.description}
                </p>
              )}
              {activeTab === 'materials' && (
                <div className="text-xs text-[#6F6B67] space-y-2">
                  <p><strong>Composition:</strong> {product.material}</p>
                  <p><strong>Care:</strong> Dry clean only or gentle hand wash cold. Do not tumble dry.</p>
                </div>
              )}
              {activeTab === 'fit' && (
                <div className="text-xs text-[#6F6B67] space-y-2">
                  <p><strong>Cut:</strong> {product.fit}</p>
                  <p>Designed for relaxed movement through the chest and waist while holding clean shoulder geometry.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* "Works With Your Wardrobe" — Explicitly Owned Items */}
        <section className="mt-20 pt-12 border-t border-[#EEE8E1]" aria-labelledby="wardrobe-pairing-heading">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[#B98791] mb-1">
                Your Wardrobe Synergy
              </p>
              <h2 id="wardrobe-pairing-heading" className="font-display text-2xl md:text-3xl font-light text-[#222222]">
                Pieces You Already Own That Pair With This
              </h2>
            </div>
            <button
              onClick={() => onNavigate('wardrobe')}
              className="text-xs font-semibold text-[#684B5A] hover:underline flex items-center gap-1 self-start"
            >
              <span>View all wardrobe ({mockWardrobeItems.length})</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            {matchingWardrobeItems.map(item => (
              <div
                key={item.id}
                onClick={() => onNavigate('wardrobe')}
                className="rounded-2xl border border-[#D8D0C6] bg-white p-3.5 flex flex-col justify-between hover:border-[#48755A] hover:shadow-xs transition-all cursor-pointer"
              >
                <div>
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[#EEE8E1] mb-3">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    <div className="absolute top-2.5 left-2.5">
                      <OwnedBadge label="Owned" />
                    </div>
                  </div>
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-[#B98791]">
                    {item.brand}
                  </p>
                  <h3 className="font-sans text-sm font-medium text-[#222222] truncate">
                    {item.name}
                  </h3>
                </div>
                <div className="pt-3 border-t border-[#EEE8E1] mt-2 flex items-center justify-between text-xs text-[#48755A] font-medium">
                  <span>✓ In your wardrobe</span>
                  <span className="text-[#6F6B67]">{item.outfitCount} looks</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
