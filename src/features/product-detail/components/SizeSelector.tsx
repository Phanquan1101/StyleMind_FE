import type { ProductSize } from '@/entities/product/model/types'

import type { ProductSizeOption } from '../model/productSelection'

interface SizeSelectorProps {
  options: ProductSizeOption[]
  selectedSize: ProductSize | null
  onChange: (size: ProductSize) => void
  /** Legend text (default "Kích thước"). */
  label?: string
  compact?: boolean
  /** Dim sizes with no stock but keep them selectable (outfits may include sold-out items). */
  dimOutOfStock?: boolean
}

export function SizeSelector({ options, selectedSize, onChange, label = 'Kích thước', compact = false, dimOutOfStock = false }: SizeSelectorProps) {
  return (
    <fieldset className="grid gap-3">
      <legend className={compact ? 'sr-only' : 'text-sm font-semibold text-[#33302D]'}>{label}</legend>
      <div className={`flex flex-wrap ${compact ? 'gap-2' : 'mt-2 gap-2'}`}>
        {options.map(option => (
          <button
            key={option.size}
            type="button"
            aria-label={`Kích thước ${option.size}`}
            aria-pressed={option.size === selectedSize}
            disabled={!option.available}
            title={dimOutOfStock && option.stock <= 0 ? 'Hết hàng' : undefined}
            onClick={() => onChange(option.size)}
            className={`${compact ? 'min-h-10 min-w-10' : 'min-h-11 min-w-11'} ${dimOutOfStock && option.stock <= 0 ? 'opacity-50 line-through' : ''} rounded-md border px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B1B] disabled:cursor-not-allowed disabled:opacity-45 ${
              option.size === selectedSize
                ? 'border-[#1C1B1B] bg-[#1C1B1B] text-white'
                : 'border-[#D8D4D0] bg-white text-[#3A3632] hover:border-[#8B8178]'
            }`}
          >
            {option.size}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
