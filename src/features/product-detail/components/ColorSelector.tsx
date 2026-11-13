import type { ProductColorOption } from '../model/productSelection'

interface ColorSelectorProps {
  options: ProductColorOption[]
  selectedColor: string
  onChange: (color: string) => void
  /** Legend text (default "Màu sắc"). */
  label?: string
  compact?: boolean
}

export function ColorSelector({ options, selectedColor, onChange, label = 'Màu sắc', compact = false }: ColorSelectorProps) {
  return (
    <fieldset className="grid gap-3">
      <legend className="text-sm font-semibold text-[#33302D]">
        {label}
        {selectedColor && <span className="ml-2 font-normal text-[#716B66]">· {selectedColor}</span>}
      </legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map(option => (
          <button
            key={option.color}
            type="button"
            aria-label={`Màu ${option.color}${option.available ? '' : ', hiện hết hàng'}`}
            title={`${option.color}${option.available ? '' : ' · Hiện hết hàng'}`}
            aria-pressed={option.color === selectedColor}
            onClick={() => onChange(option.color)}
            className={`inline-flex ${compact ? 'min-h-9' : 'min-h-11'} items-center gap-2 rounded-md border px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B1B] ${
              option.color === selectedColor
                ? 'border-[#1C1B1B] bg-[#F5F3F1] text-[#1C1B1B] ring-1 ring-[#1C1B1B]'
                : 'border-[#D8D4D0] bg-white text-[#3A3632] hover:border-[#8B8178]'
            }`}
          >
            <span className={`h-3.5 w-3.5 rounded-full border border-black/10 ${option.available ? '' : 'opacity-50'}`} style={{ backgroundColor: option.colorHex }} />
            {option.color}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
