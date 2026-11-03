import { useState } from 'react'
import type { AppState } from '../types'
import { mockProducts } from '../data/mockData'
import PageHeader from '../components/ui/PageHeader'
import Money from '../components/ui/Money'
import { UnavailableBadge } from '../components/ui/Badges'
import EmptyState from '../components/ui/EmptyState'

const categories = ['All', 'Tops', 'Bottoms', 'Outerwear', 'Dresses', 'Shoes', 'Bags', 'Accessories']
const sortOptions = ['Recommended', 'Wardrobe Synergy', 'Price: Low to High', 'Price: High to Low']

interface Props {
  onNavigate: (screen: string, opts?: any) => void
  app?: AppState
}

export default function Shop({ onNavigate }: Props) {
  const [activeCategory, setActiveCategory] = useState('All')
  const [sort, setSort] = useState('Recommended')
  const [search, setSearch] = useState('')
  const [favorited, setFavorited] = useState<Set<string>>(new Set(['p1']))

  const toggleFav = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setFavorited(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const filtered = mockProducts
    .filter(p => {
      const matchCat =
        activeCategory === 'All' ||
        p.category.toLowerCase() === activeCategory.toLowerCase() ||
        p.tags.some(t => t.toLowerCase() === activeCategory.toLowerCase())
      const matchSearch =
        search.trim() === '' ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.brand.toLowerCase().includes(search.toLowerCase())
      return matchCat && matchSearch
    })
    .sort((a, b) => {
      if (sort === 'Price: Low to High') return a.price - b.price
      if (sort === 'Price: High to Low') return b.price - a.price
      if (sort === 'Wardrobe Synergy') return b.wardrobeMatches - a.wardrobeMatches
      return 0
    })

  return (
    <div style={{ background: '#FAF8F5', minHeight: '100vh' }}>
      <PageHeader
        category="Curated Catalog"
        title="Collection"
        subtitle="Pieces designed to integrate seamlessly into your existing wardrobe, selected for high versatility."
        actions={
          <div className="flex items-center gap-3">
            <label htmlFor="shop-sort" className="sr-only">Sort products</label>
            <select
              id="shop-sort"
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="text-xs px-4 py-2.5 rounded-full border border-[#D8D0C6] bg-white text-[#222222] outline-none focus:border-[#684B5A]"
            >
              {sortOptions.map(opt => (
                <option key={opt} value={opt}>
                  Sort: {opt}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {/* Category Tabs */}
      <div className="px-6 md:px-16 border-b border-[#EEE8E1]" role="tablist" aria-label="Product categories">
        <div className="flex gap-2 overflow-x-auto pb-0" style={{ scrollbarWidth: 'none' }}>
          {categories.map(cat => {
            const isSelected = activeCategory === cat
            return (
              <button
                key={cat}
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveCategory(cat)}
                className={`flex-none px-5 py-3.5 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#684B5A] ${
                  isSelected
                    ? 'border-[#684B5A] text-[#684B5A] font-semibold'
                    : 'border-transparent text-[#6F6B67] hover:text-[#222222]'
                }`}
              >
                {cat}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="px-6 md:px-16 py-8 pb-24">
        {filtered.length === 0 ? (
          <EmptyState
            title="No items found"
            description="We couldn't find any products in this category matching your selection. Try clearing filters."
            primaryAction={{
              label: 'Reset Filters',
              onClick: () => {
                setActiveCategory('All')
                setSearch('')
              },
            }}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map(product => {
              const isFav = favorited.has(product.id)
              const isOutOfStock = product.inStock === false

              return (
                <div
                  key={product.id}
                  onClick={() => onNavigate('product-detail', { productId: product.id })}
                  className={`group rounded-2xl bg-white border overflow-hidden p-3.5 flex flex-col justify-between transition-all duration-200 cursor-pointer ${
                    isOutOfStock
                      ? 'border-[#D8D0C6] opacity-85 hover:border-[#9D9894]'
                      : 'border-[#EEE8E1] hover:border-[#684B5A]/40 hover:shadow-md'
                  }`}
                >
                  <div>
                    {/* Thumbnail */}
                    <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[#EEE8E1] mb-3">
                      <img
                        src={product.image}
                        alt={product.name}
                        className={`w-full h-full object-cover transition-transform duration-500 ${
                          isOutOfStock ? 'grayscale-[30%]' : 'group-hover:scale-103'
                        }`}
                      />

                      {/* Wishlist Button */}
                      <button
                        type="button"
                        onClick={e => toggleFav(product.id, e)}
                        aria-label={isFav ? `Remove ${product.name} from favorites` : `Add ${product.name} to favorites`}
                        className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-sm shadow-xs transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#684B5A]"
                      >
                        <span style={{ color: isFav ? '#A94B4B' : '#9D9894' }}>
                          {isFav ? '♥' : '♡'}
                        </span>
                      </button>

                      {/* Status badge: either Out of Stock or Wardrobe matches */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1">
                        {isOutOfStock ? (
                          <UnavailableBadge reason="Out of Stock" />
                        ) : (
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FAF8F5]/92 backdrop-blur-xs text-[#48755A] border border-[#48755A]/25 shadow-2xs truncate">
                            ✓ {product.wardrobeMatches} wardrobe matches
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="px-1">
                      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-semibold text-[#B98791] mb-1">
                        <span>{product.brand}</span>
                        <span className="text-[#6F6B67] normal-case tracking-normal">{product.fit} fit</span>
                      </div>

                      <h3 className="font-sans text-sm font-medium text-[#222222] truncate mb-1" title={product.name}>
                        {product.name}
                      </h3>

                      <div className="flex items-center justify-between pt-1">
                        <Money amount={product.price} className="text-sm font-semibold text-[#222222]" />

                        {/* Color swatches with visible title */}
                        <div className="flex gap-1" aria-label={`Available colors for ${product.name}`}>
                          {product.colors.map(c => (
                            <div
                              key={c.name}
                              className="w-3.5 h-3.5 rounded-full border border-black/15"
                              style={{ backgroundColor: c.hex }}
                              title={c.name}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Card Footer */}
                  <div className="pt-3 mt-2 border-t border-[#EEE8E1] px-1 flex items-center justify-between text-xs text-[#6F6B67]">
                    <span>
                      {isOutOfStock ? (
                        <span className="text-[#A94B4B] font-medium">Temporarily unavailable</span>
                      ) : (
                        <span>Sizes: {product.availableSizes.join(', ')}</span>
                      )}
                    </span>
                    <span className="text-[#684B5A] font-medium group-hover:underline">
                      View →
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
