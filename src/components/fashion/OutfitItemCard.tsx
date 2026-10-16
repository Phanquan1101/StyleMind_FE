import React from 'react'
import type { OutfitPiece } from '../../types'
import { OwnedBadge, ShopBadge, UnavailableBadge } from '../ui/Badges'
import Money from '../ui/Money'

interface OutfitItemCardProps {
  item: OutfitPiece
  selected?: boolean
  onToggleSelect?: (item: OutfitPiece) => void
  onViewDetails?: (item: OutfitPiece) => void
  onFindAlternative?: (item: OutfitPiece) => void
  className?: string
}

export default function OutfitItemCard({
  item,
  selected = false,
  onToggleSelect,
  onViewDetails,
  onFindAlternative,
  className = '',
}: OutfitItemCardProps) {
  const isOwned = item.status === 'owned'
  const isShop = item.status === 'shop'
  const isUnavailable = item.status === 'unavailable' || item.status === 'size_unavailable'

  return (
    <div
      className={`group relative rounded-2xl overflow-hidden border transition-all duration-200 flex flex-col justify-between ${
        isOwned
          ? 'bg-ivory border-sand-dark hover:border-success/50'
          : isShop
          ? selected
            ? 'bg-surface border-accent ring-2 ring-accent/20 shadow-md'
            : 'bg-surface border-sand hover:border-accent/40 shadow-xs'
          : 'bg-disabled-bg border-sand-dark opacity-80'
      } ${className}`}
    >
      <div>
        {/* Thumbnail container */}
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-sand">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
          />

          {/* Top badge indicating OWNED vs BUY vs UNAVAILABLE */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1">
            {isOwned && (
              <OwnedBadge label={item.reused ? "Tận dụng đồ đã có" : "Đã có"} />
            )}
            {isShop && (
              <ShopBadge price={item.price} />
            )}
            {isUnavailable && (
              <UnavailableBadge reason={item.status === 'size_unavailable' ? "Cỡ này đã hết hàng" : "Hết hàng"} />
            )}

            {/* Quick check toggle for shop items */}
            {isShop && onToggleSelect && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleSelect(item)
                }}
                aria-label={`${selected ? "Bỏ chọn" : "Chọn"} ${item.name} để mua`}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-xs border ${
                  selected
                    ? 'bg-accent text-on-accent border-accent'
                    : 'bg-surface/90 text-secondary border-sand-dark hover:border-accent'
                }`}
              >
                {selected ? '✓' : '+'}
              </button>
            )}
          </div>

          {/* Slot tag (Top, Bottom, Outerwear, etc.) */}
          {item.slot && (
            <div className="absolute bottom-2 left-2.5">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-overlay/65 text-on-accent backdrop-blur-xs">
                {item.slot}
              </span>
            </div>
          )}
        </div>

        {/* Content details */}
        <div className="p-3.5 sm:p-4">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-rose">
              {item.brand}
            </p>
            {item.size && (
              <span className="text-[11px] text-secondary font-medium">
                Cỡ {item.size}
              </span>
            )}
          </div>

          <h3 className="font-sans text-sm font-medium text-charcoal line-clamp-1 mb-1.5" title={item.name}>
            {item.name}
          </h3>

          {/* Color metadata with visible text label */}
          {item.color && (
            <div className="flex items-center gap-1.5 text-xs text-secondary mb-2">
              {item.colorHex && (
                <span
                  className="w-3 h-3 rounded-full border border-overlay/15 flex-none"
                  style={{ backgroundColor: item.colorHex }}
                  aria-hidden="true"
                />
              )}
              <span>{item.color}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer / CTA Area */}
      <div className="px-3.5 pb-3.5 pt-0 sm:px-4 sm:pb-4 border-t border-sand/60 mt-1">
        {isOwned && (
          <div className="flex items-center justify-between text-xs text-success font-medium pt-2">
            <span className="flex items-center gap-1">
              <span>✓</span> Đã có trong tủ đồ
            </span>
            {onViewDetails && (
              <button
                type="button"
                onClick={() => onViewDetails(item)}
                className="text-accent hover:underline text-xs"
              >
                Xem
              </button>
            )}
          </div>
        )}

        {isShop && (
          <div className="flex items-center justify-between pt-2">
            <div>
              {item.price !== undefined && (
                <Money amount={item.price} className="text-sm font-semibold text-charcoal" />
              )}
            </div>
            <div className="flex items-center gap-2">
              {onViewDetails && (
                <button
                  type="button"
                  onClick={() => onViewDetails(item)}
                  className="text-xs text-secondary hover:text-accent underline underline-offset-2"
                >
                  Chi tiết
                </button>
              )}
              {onToggleSelect && (
                <button
                  type="button"
                  onClick={() => onToggleSelect(item)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                    selected
                      ? 'bg-accent text-on-accent'
                      : 'bg-blush text-accent hover:bg-blush-dark'
                  }`}
                >
                  {selected ? "✓ Đã thêm" : "+ Thêm"}
                </button>
              )}
            </div>
          </div>
        )}

        {isUnavailable && (
          <div className="pt-2">
            <p className="text-[11px] text-error mb-2 font-medium">
              {item.unavailableReason || "Hiện đã hết hàng"}
            </p>
            {onFindAlternative && (
              <button
                type="button"
                onClick={() => onFindAlternative(item)}
                className="w-full text-xs py-1.5 px-3 rounded-lg border border-sand-dark text-ink hover:bg-sand transition-all"
              >
                Tìm món thay thế
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
