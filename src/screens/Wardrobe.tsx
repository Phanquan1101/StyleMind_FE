import { useState } from 'react'
import type { AppState, WardrobeItem } from '../types'
import { mockWardrobeItems } from '../data/mockData'
import PageHeader from '../components/ui/PageHeader'
import { OwnedBadge } from '../components/ui/Badges'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'

const categories = ['All', 'Tops', 'Bottoms', 'Outerwear', 'Dresses', 'Shoes', 'Bags', 'Accessories']

interface Props {
  onNavigate: (screen: string, opts?: any) => void
  app?: AppState
}

export default function Wardrobe({ onNavigate }: Props) {
  const [items, setItems] = useState<WardrobeItem[]>(mockWardrobeItems)
  const [activeCategory, setActiveCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  // New item form state
  const [newItemName, setNewItemName] = useState('')
  const [newItemBrand, setNewItemBrand] = useState('')
  const [newItemCat, setNewItemCat] = useState('Tops')
  const [newItemColor, setNewItemColor] = useState('Cream')

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setItems(prev =>
      prev.map(i => (i.id === id ? { ...i, favorite: !i.favorite } : i))
    )
  }

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim()) return

    const created: WardrobeItem = {
      id: `w-${Date.now()}`,
      name: newItemName,
      brand: newItemBrand || 'Own / Vintage',
      category: newItemCat,
      color: '#F5EDD8',
      colorName: newItemColor,
      size: 'S',
      image: 'https://images.unsplash.com/photo-1598032895397-b9472444bf93?w=400&h=500&fit=crop&auto=format',
      outfitCount: 3,
      material: 'Cotton Blend',
      favorite: false,
    }

    setItems(prev => [created, ...prev])
    setShowAddModal(false)
    setNewItemName('')
    setNewItemBrand('')
  }

  const filtered = items.filter(item => {
    const matchCat = activeCategory === 'All' || item.category === activeCategory
    const matchSearch =
      search.trim() === '' ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.brand.toLowerCase().includes(search.toLowerCase())
    const matchFav = onlyFavorites ? item.favorite : true
    return matchCat && matchSearch && matchFav
  })

  return (
    <div style={{ background: '#FAF8F5', minHeight: '100vh' }}>
      <PageHeader
        category="Personal Collection"
        title="My Wardrobe"
        subtitle={`Your digital closet of ${items.length} verified pieces. StyleMind builds all recommendations around these items.`}
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOnlyFavorites(!onlyFavorites)}
              className={`text-xs px-4 py-2.5 rounded-full border transition-colors ${
                onlyFavorites
                  ? 'bg-[#F4E7E8] text-[#684B5A] border-[#684B5A]'
                  : 'bg-white text-[#6F6B67] border-[#D8D0C6]'
              }`}
            >
              {onlyFavorites ? '♥ Favorites Only' : '♡ All Items'}
            </button>
            <Button
              variant="primary"
              size="md"
              onClick={() => setShowAddModal(true)}
              icon={<span>+</span>}
            >
              Add Item
            </Button>
          </div>
        }
      />

      {/* Wardrobe AI Insights Strip */}
      <div className="px-6 md:px-16 mb-6">
        <div className="p-4 md:p-5 rounded-2xl bg-[#EEE8E1] border border-[#D8D0C6] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-[#684B5A] text-white flex items-center justify-center text-sm font-bold flex-none">
              ✦
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#684B5A]">
                Wardrobe Utilization Insight
              </p>
              <p className="text-xs text-[#3A3632]">
                Your <strong>Cream Silk Blouse</strong> and <strong>White Loafers</strong> anchor 8 out of 10 recommended capsules.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="bg-white self-start sm:self-auto"
            onClick={() => onNavigate('ai-stylist')}
          >
            Ask Stylist to Mix & Match →
          </Button>
        </div>
      </div>

      {/* Categories Bar */}
      <div className="px-6 md:px-16 border-b border-[#EEE8E1]">
        <div className="flex gap-2 overflow-x-auto pb-0" style={{ scrollbarWidth: 'none' }}>
          {categories.map(cat => {
            const isSelected = activeCategory === cat
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-none px-5 py-3.5 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-150 ${
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

      {/* Items Grid */}
      <div className="px-6 md:px-16 py-8 pb-24">
        {filtered.length === 0 ? (
          <EmptyState
            title="No wardrobe items found"
            description="No items match your active filter. Add your first item or switch to another category."
            primaryAction={{
              label: '+ Add Wardrobe Item',
              onClick: () => setShowAddModal(true),
            }}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map(item => (
              <div
                key={item.id}
                className="group rounded-2xl bg-white border border-[#D8D0C6] overflow-hidden p-3.5 flex flex-col justify-between hover:border-[#48755A] hover:shadow-xs transition-all"
              >
                <div>
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[#EEE8E1] mb-3">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500" />
                    <div className="absolute top-2.5 left-2.5">
                      <OwnedBadge label="Owned" />
                    </div>
                    <button
                      type="button"
                      onClick={e => toggleFavorite(item.id, e)}
                      aria-label={item.favorite ? 'Remove favorite' : 'Mark as favorite'}
                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-sm shadow-xs transition-transform hover:scale-110"
                    >
                      <span style={{ color: item.favorite ? '#A94B4B' : '#9D9894' }}>
                        {item.favorite ? '♥' : '♡'}
                      </span>
                    </button>
                    <div className="absolute bottom-2 left-2 right-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-xs">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] uppercase tracking-wider font-semibold text-[#B98791] mb-0.5">
                    {item.brand}
                  </p>
                  <h3 className="font-sans text-sm font-medium text-[#222222] truncate mb-1" title={item.name}>
                    {item.name}
                  </h3>
                  <div className="flex items-center justify-between text-xs text-[#6F6B67] mb-2">
                    <span>{item.colorName}</span>
                    <span>Size {item.size}</span>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-[#EEE8E1] flex items-center justify-between text-xs font-medium text-[#48755A]">
                  <span>✓ {item.outfitCount} active combos</span>
                  <button
                    onClick={() => onNavigate('ai-stylist', { occasion: item.name })}
                    className="text-[#684B5A] hover:underline text-[11px]"
                  >
                    Style this →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs fade-in" role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#EEE8E1]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl font-light text-[#222222]">Add Wardrobe Piece</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#9D9894] hover:text-[#222222] text-lg font-bold"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-[#6F6B67] mb-6">
              Add a piece you already own. StyleMind will immediately incorporate it into your daily outfit recommendations.
            </p>

            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6F6B67] mb-1">
                  Item Name
                </label>
                <input
                  required
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  placeholder="e.g. Ivory Wool Cardigan"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D8D0C6] text-sm outline-none focus:border-[#684B5A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6F6B67] mb-1">
                    Brand (Optional)
                  </label>
                  <input
                    value={newItemBrand}
                    onChange={e => setNewItemBrand(e.target.value)}
                    placeholder="e.g. COS, Zara"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#D8D0C6] text-sm outline-none focus:border-[#684B5A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6F6B67] mb-1">
                    Category
                  </label>
                  <select
                    value={newItemCat}
                    onChange={e => setNewItemCat(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#D8D0C6] text-sm outline-none focus:border-[#684B5A] bg-white"
                  >
                    {categories.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6F6B67] mb-1">
                  Dominant Color
                </label>
                <input
                  value={newItemColor}
                  onChange={e => setNewItemColor(e.target.value)}
                  placeholder="e.g. Oatmeal, Cream, Navy"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D8D0C6] text-sm outline-none focus:border-[#684B5A]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  fullWidth
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                >
                  Save Piece
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
