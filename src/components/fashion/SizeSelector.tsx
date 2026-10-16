import React from 'react'

interface SizeSelectorProps {
  sizes: string[]
  availableSizes?: string[]
  selectedSize?: string | null
  recommendedSize?: string
  onSelectSize: (size: string) => void
  className?: string
}

export default function SizeSelector({
  sizes,
  availableSizes,
  selectedSize,
  recommendedSize,
  onSelectSize,
  className = '',
}: SizeSelectorProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Các kích cỡ sản phẩm">
        {sizes.map((size) => {
          const isAvailable = availableSizes ? availableSizes.includes(size) : true
          const isSelected = selectedSize === size
          const isRecommended = recommendedSize === size

          return (
            <div key={size} className="relative flex flex-col items-center">
              <button
                type="button"
                disabled={!isAvailable}
                onClick={() => isAvailable && onSelectSize(size)}
                aria-pressed={isSelected}
                aria-label={`Cỡ ${size}${!isAvailable ? "- hiện đã hết hàng" : ''}${isRecommended ? "- được gợi ý cho bạn" : ''}`}
                className={`relative min-w-[48px] h-11 px-3.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-150 flex items-center justify-center border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  isSelected
                    ? 'bg-accent text-ivory border-accent shadow-xs'
                    : isAvailable
                    ? 'bg-ivory text-charcoal border-sand-dark hover:border-accent hover:bg-blush/40'
                    : 'bg-sand/60 text-muted border-disabled-border cursor-not-allowed opacity-60'
                }`}
              >
                {size}
                {!isAvailable && (
                  <span className="sr-only"> (Hết hàng)</span>
                )}
              </button>
              {isRecommended && isAvailable && (
                <span className="absolute -top-2.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blush text-accent border border-blush-dark shadow-2xs whitespace-nowrap">
                  Gợi ý
                </span>
              )}
            </div>
          )
        })}
      </div>
      {recommendedSize && (
        <p className="text-xs text-secondary flex items-center gap-1.5 pt-1">
          <span className="text-accent">✦</span>
          <span>Cỡ <strong>{recommendedSize}</strong> được gợi ý theo phom dáng bạn thích.</span>
        </p>
      )}
    </div>
  )
}
