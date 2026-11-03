import { useState } from 'react'
import type { AppState, OutfitPiece } from '../types'
import { OwnedBadge, ShopBadge } from '../components/ui/Badges'
import Button from '../components/ui/Button'
import Money from '../components/ui/Money'
import { formatVND } from '../data/mockData'

const studioSlots: OutfitPiece[] = [
  {
    wardrobeId: 'w1',
    slot: 'Top',
    name: 'Cream Silk Blouse',
    brand: '& Other Stories',
    status: 'owned',
    image: 'https://images.unsplash.com/photo-1629511565591-a1d494ad6c58?w=200&h=260&fit=crop&auto=format',
    color: 'Cream',
    colorHex: '#F5EDD8',
    size: 'S',
  },
  {
    productId: 'p1',
    slot: 'Outerwear',
    name: 'Linen Oversized Blazer',
    brand: 'TOTÊME',
    status: 'shop',
    price: 1850000,
    image: 'https://images.unsplash.com/photo-1619603364853-c92ff1fca11f?w=200&h=260&fit=crop&auto=format',
    color: 'Oat',
    colorHex: '#E8DDD2',
    size: 'M',
  },
  {
    wardrobeId: 'w2',
    slot: 'Bottom',
    name: 'Wide-Leg Linen Trousers',
    brand: 'COS',
    status: 'owned',
    image: 'https://images.unsplash.com/photo-1645996830718-127f7e4f74fc?w=200&h=260&fit=crop&auto=format',
    color: 'Sand Ecru',
    colorHex: '#EEE8E1',
    size: 'S',
  },
  {
    wardrobeId: 'w3',
    slot: 'Shoes',
    name: 'White Leather Loafers',
    brand: 'Common Projects',
    status: 'owned',
    image: 'https://images.unsplash.com/photo-1625860191460-10a66c7384fb?w=200&h=260&fit=crop&auto=format',
    color: 'Warm White',
    colorHex: '#F2F0ED',
    size: '37',
  },
  {
    productId: 'p3',
    slot: 'Bag',
    name: 'Structured Mini Bag',
    brand: 'A.P.C.',
    status: 'shop',
    price: 2300000,
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200&h=260&fit=crop&auto=format',
    color: 'Tan',
    colorHex: '#C4956A',
    size: 'One Size',
  },
]

interface Props {
  onNavigate: (screen: string, opts?: any) => void
  app?: AppState
}

export default function Studio({ onNavigate, app }: Props) {
  const [selectedSlot, setSelectedSlot] = useState<string>('Outerwear')
  const [rotation, setRotation] = useState(0)
  const [saved, setSaved] = useState(false)

  const activePiece = studioSlots.find(s => s.slot === selectedSlot) || studioSlots[1]
  const shopPieces = studioSlots.filter(s => s.status === 'shop')
  const ownedPieces = studioSlots.filter(s => s.status === 'owned')

  const totalMissingCost = shopPieces.reduce((sum, p) => sum + (p.price || 0), 0)

  const handleAddAllMissing = () => {
    if (!app?.addToCart) return

    shopPieces.forEach(piece => {
      if (piece.productId) {
        app.addToCart({
          productId: piece.productId,
          name: piece.name,
          brand: piece.brand,
          size: piece.size || 'M',
          color: piece.color || 'Oat',
          colorHex: piece.colorHex,
          price: piece.price || 0,
          image: piece.image,
          available: true,
          aiRec: 'Visual Studio Mannequin Capsule',
        })
      }
    })

    onNavigate('cart')
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] bg-[#FAF8F5]">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 md:px-12 py-4 border-b border-[#EEE8E1] bg-white flex-none">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#B98791]">
              Visual Studio Workspace
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EEE8E1] text-[#6F6B67] border border-[#D8D0C6]">
              Concept Preview
            </span>
          </div>
          <h1 className="font-display text-lg font-light text-[#222222]">
            3D Mannequin Preview — Da Lat Arrival Capsule
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSaved(!saved)}
            className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
              saved
                ? 'bg-[#EAF2EC] text-[#48755A] border-[#48755A]/30'
                : 'bg-white text-[#3A3632] border-[#D8D0C6] hover:bg-[#EEE8E1]'
            }`}
          >
            {saved ? '✓ Saved' : '♡ Save Look'}
          </button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleAddAllMissing}
            icon={<span>🛒</span>}
          >
            Add {shopPieces.length} Missing to Bag
          </Button>
        </div>
      </div>

      {/* Main Studio Split */}
      <div className="flex-1 grid lg:grid-cols-[1fr_420px] overflow-hidden">
        {/* Mannequin Display Stage */}
        <div className="relative flex flex-col items-center justify-center p-8 bg-gradient-to-b from-[#F4E7E8]/40 via-[#FAF8F5] to-[#EEE8E1]/60 overflow-hidden min-h-[440px]">
          {/* Concept Banner Requirement (Principle 75) */}
          <div className="absolute top-4 inset-x-4 flex justify-center z-10">
            <div className="px-4 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-[#D8D0C6] text-xs text-[#6F6B67] shadow-xs">
              ✦ <strong>Future Concept:</strong> Multi-layer silhouette preview with realistic fabric drape
            </div>
          </div>

          {/* Stylized Mannequin Rendering Stage */}
          <div className="relative w-64 sm:w-80 h-[480px] flex flex-col items-center justify-center my-6">
            <div
              className="w-full h-full rounded-3xl bg-white/70 backdrop-blur-xs border border-[#EEE8E1] shadow-lg p-6 flex flex-col items-center justify-between relative overflow-hidden transition-transform duration-500"
              style={{ transform: `rotate(${rotation}deg)` }}
            >
              {/* Silhouette layer previews */}
              <div className="w-16 h-16 rounded-full bg-[#EEE8E1] border border-[#D8D0C6] flex items-center justify-center text-xs text-[#9D9894]">
                Head
              </div>
              <div className="space-y-2 w-full text-center">
                <button
                  onClick={() => setSelectedSlot('Outerwear')}
                  className={`w-full p-2.5 rounded-xl border text-xs font-medium transition-all ${
                    selectedSlot === 'Outerwear'
                      ? 'bg-[#684B5A] text-white border-[#684B5A]'
                      : 'bg-[#F4E7E8] text-[#684B5A] border-[#E8D0D2]'
                  }`}
                >
                  Outerwear: Linen Blazer (+ Buy)
                </button>
                <button
                  onClick={() => setSelectedSlot('Top')}
                  className={`w-full p-2.5 rounded-xl border text-xs font-medium transition-all ${
                    selectedSlot === 'Top'
                      ? 'bg-[#48755A] text-white border-[#48755A]'
                      : 'bg-[#EAF2EC] text-[#48755A] border-[#B4D3BD]'
                  }`}
                >
                  Top: Cream Silk Blouse (✓ Owned)
                </button>
                <button
                  onClick={() => setSelectedSlot('Bottom')}
                  className={`w-full p-2.5 rounded-xl border text-xs font-medium transition-all ${
                    selectedSlot === 'Bottom'
                      ? 'bg-[#48755A] text-white border-[#48755A]'
                      : 'bg-[#EAF2EC] text-[#48755A] border-[#B4D3BD]'
                  }`}
                >
                  Bottom: Linen Trousers (✓ Owned)
                </button>
                <button
                  onClick={() => setSelectedSlot('Shoes')}
                  className={`w-full p-2.5 rounded-xl border text-xs font-medium transition-all ${
                    selectedSlot === 'Shoes'
                      ? 'bg-[#48755A] text-white border-[#48755A]'
                      : 'bg-[#EAF2EC] text-[#48755A] border-[#B4D3BD]'
                  }`}
                >
                  Shoes: White Loafers (✓ Owned)
                </button>
              </div>
              <button
                onClick={() => setSelectedSlot('Bag')}
                className={`w-3/4 p-2 rounded-xl border text-xs font-medium transition-all ${
                  selectedSlot === 'Bag'
                    ? 'bg-[#684B5A] text-white border-[#684B5A]'
                    : 'bg-[#F4E7E8] text-[#684B5A] border-[#E8D0D2]'
                }`}
              >
                Accessory: Mini Bag (+ Buy)
              </button>
            </div>
          </div>

          {/* Rotation Controls */}
          <div className="absolute bottom-4 inset-x-4 flex justify-center gap-2 z-10">
            <button
              onClick={() => setRotation(r => r - 45)}
              className="px-4 py-2 rounded-full bg-white border border-[#D8D0C6] text-xs font-medium shadow-xs hover:bg-[#EEE8E1]"
            >
              ↺ Rotate Left
            </button>
            <button
              onClick={() => setRotation(0)}
              className="px-4 py-2 rounded-full bg-white border border-[#D8D0C6] text-xs font-medium shadow-xs hover:bg-[#EEE8E1]"
            >
              Reset View
            </button>
            <button
              onClick={() => setRotation(r => r + 45)}
              className="px-4 py-2 rounded-full bg-white border border-[#D8D0C6] text-xs font-medium shadow-xs hover:bg-[#EEE8E1]"
            >
              ↻ Rotate Right
            </button>
          </div>
        </div>

        {/* Right Inspector Column */}
        <div className="p-6 md:p-8 bg-white border-l border-[#EEE8E1] flex flex-col justify-between overflow-y-auto space-y-6">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#EEE8E1] mb-6">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-[#B98791]">
                  Slot Inspector
                </span>
                <h2 className="font-display text-xl font-light text-[#222222]">
                  {activePiece.slot}: {activePiece.name}
                </h2>
              </div>
              {activePiece.status === 'owned' ? (
                <OwnedBadge label="Owned Piece" />
              ) : (
                <ShopBadge price={activePiece.price} />
              )}
            </div>

            {/* Active Piece Card */}
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EEE8E1] mb-6 flex gap-4">
              <img
                src={activePiece.image}
                alt={activePiece.name}
                className="w-20 h-26 rounded-xl object-cover border border-[#EEE8E1]"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-[#B98791]">
                  {activePiece.brand}
                </p>
                <h3 className="font-sans text-sm font-medium text-[#222222] truncate mb-1">
                  {activePiece.name}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-[#6F6B67] mb-2">
                  {activePiece.colorHex && (
                    <span
                      className="w-3 h-3 rounded-full border border-black/15"
                      style={{ backgroundColor: activePiece.colorHex }}
                    />
                  )}
                  <span>{activePiece.color}</span>
                </div>
                {activePiece.price ? (
                  <Money amount={activePiece.price} className="text-sm font-bold text-[#222222]" />
                ) : (
                  <span className="text-xs text-[#48755A] font-semibold">✓ In your wardrobe</span>
                )}
              </div>
            </div>

            {/* All Outfit Slots List */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#9D9894] block mb-2">
                All Outfit Layers ({studioSlots.length})
              </span>
              {studioSlots.map(slot => (
                <div
                  key={slot.slot}
                  onClick={() => setSelectedSlot(slot.slot || '')}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    selectedSlot === slot.slot
                      ? 'border-[#684B5A] bg-[#F4E7E8]/40 shadow-xs'
                      : 'border-[#EEE8E1] bg-white hover:bg-[#FAF8F5]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-[#6F6B67] w-18">
                      {slot.slot}
                    </span>
                    <span className="text-xs font-medium text-[#222222] truncate">
                      {slot.name}
                    </span>
                  </div>
                  {slot.status === 'owned' ? (
                    <span className="text-[11px] font-bold text-[#48755A]">✓ Owned</span>
                  ) : (
                    <span className="text-[11px] font-semibold text-[#684B5A]">
                      {slot.price ? <Money amount={slot.price} /> : '+ Buy'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Action */}
          <div className="pt-4 border-t border-[#EEE8E1] space-y-2.5">
            <div className="flex justify-between items-center text-xs text-[#6F6B67] pb-1">
              <span>{ownedPieces.length} Wardrobe Pieces (0₫)</span>
              <span>{shopPieces.length} Items to Buy</span>
            </div>
            <Button
              variant="primary"
              fullWidth
              size="lg"
              onClick={handleAddAllMissing}
              icon={<span>🛒</span>}
            >
              Add Missing to Bag · {formatVND(totalMissingCost)}
            </Button>
            <Button
              variant="outline"
              fullWidth
              size="md"
              onClick={() => onNavigate('outfit-result')}
            >
              Back to Analysis Breakdown
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
