import { useState } from 'react'

import type { CatalogVariant } from '@/shared/api/commerceCatalogApi'
import { formatCurrency } from '@/shared/lib/formatCurrency'

interface ProductVariantChooserProps {
  /** Active variants of one product. */
  variants: CatalogVariant[]
  selectedVariantId: string | null
  /** Variants that cannot be picked (already in the outfit or draft). */
  disabledVariantIds: ReadonlySet<string>
  /** The variant being replaced, shown but not selectable. */
  currentVariantId?: string
  onSelect: (variant: CatalogVariant | null) => void
}

const colorKey = (variant: CatalogVariant) => variant.color ?? ''
const colorLabel = (variant: CatalogVariant) => variant.color || 'Mặc định'
const sizeLabel = (variant: CatalogVariant) => variant.size || 'Một cỡ'

const optionClass = (selected: boolean) =>
  `inline-flex min-h-10 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#684B5A]/30 disabled:cursor-not-allowed disabled:opacity-50 ${
    selected ? 'border-[#684B5A] bg-[#F4E7E8] text-[#684B5A]' : 'border-[#D8D0C6] bg-white text-[#222222] hover:bg-[#FAF8F5]'
  }`

/** Colour first, then the sizes of that colour; variants without a colour or size get a default label. */
export function ProductVariantChooser({ variants, selectedVariantId, disabledVariantIds, currentVariantId, onSelect }: ProductVariantChooserProps) {
  const [pickedColor, setPickedColor] = useState<string | null>(null)
  const selected = variants.find(variant => variant.variant_id === selectedVariantId) ?? null
  const activeColor = pickedColor ?? (selected ? colorKey(selected) : variants[0] ? colorKey(variants[0]) : '')
  const colors = [...new Map(variants.map(variant => [colorKey(variant), variant])).values()]
  const sizes = variants.filter(variant => colorKey(variant) === activeColor)

  return (
    <div className="grid gap-3">
      <div role="group" aria-label="Màu sắc" className="flex flex-wrap gap-2">
        {colors.map(variant => (
          <button
            key={colorKey(variant)}
            type="button"
            aria-pressed={colorKey(variant) === activeColor}
            aria-label={`Màu ${colorLabel(variant)}`}
            className={optionClass(colorKey(variant) === activeColor)}
            onClick={() => {
              setPickedColor(colorKey(variant))
              onSelect(null)
            }}
          >
            {colorLabel(variant)}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Kích cỡ" className="flex flex-wrap gap-2">
        {sizes.map(variant => {
          const isCurrent = variant.variant_id === currentVariantId
          const taken = disabledVariantIds.has(variant.variant_id)
          const note = isCurrent ? ' (đang chọn)' : taken ? ' (đã có)' : ''
          return (
            <button
              key={variant.variant_id}
              type="button"
              disabled={isCurrent || taken}
              aria-pressed={variant.variant_id === selectedVariantId}
              aria-label={`Kích cỡ ${sizeLabel(variant)}${note}`}
              className={optionClass(variant.variant_id === selectedVariantId)}
              onClick={() => onSelect(variant)}
            >
              {sizeLabel(variant)}
            </button>
          )
        })}
      </div>
      {selected && (
        <p className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-semibold text-[#222222]">{formatCurrency(selected.unit_price_vnd)}</span>
          {selected.available_quantity <= 0 && <span className="font-semibold text-[#A94B4B]">Hết hàng</span>}
        </p>
      )}
    </div>
  )
}
