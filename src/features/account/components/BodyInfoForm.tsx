import { useEffect, useState } from 'react'

import { commerceApi } from '@/api/commerce'
import { SelectField, TextField } from '@/shared/ui'

import { BOTTOM_SIZES, HEIGHT_RANGE, SHOE_SIZES, TOP_SIZES, WEIGHT_RANGE } from '../model/sizeOptions'
import type { FieldErrors, StyleProfileInput } from '../model/validators'

interface BodyInfoFormProps {
  value: StyleProfileInput
  errors: FieldErrors<StyleProfileInput>
  onChange: (value: StyleProfileInput) => void
}

interface BrandOption {
  id: string
  name: string
}

function SizeSelect({ label, value, options, error, onChange }: {
  label: string
  value: string
  options: string[]
  error?: string
  onChange: (next: string) => void
}) {
  // Old data may hold a size that is no longer allowed; keep it visible (and flagged) instead of hiding it.
  const legacy = value && !options.includes(value.toUpperCase()) ? value : ''
  return (
    <SelectField label={label} value={value} error={error} onChange={event => onChange(event.target.value)}>
      <option value="">Chưa chọn</option>
      {legacy && <option value={legacy}>{legacy} (giá trị cũ, hãy chọn lại)</option>}
      {options.map(option => <option key={option} value={option}>{option}</option>)}
    </SelectField>
  )
}

const splitIds = (csv: string) => csv.split(',').map(item => item.trim()).filter(Boolean)

/**
 * Body measurements and usual sizes. Style/colour/fit codes have no source list in any API, so they are not editable
 * here; they are kept untouched in `value` and sent back unchanged when the profile is saved.
 */
export function BodyInfoForm({ value, errors, onChange }: BodyInfoFormProps) {
  const [brands, setBrands] = useState<BrandOption[]>([])
  const [advancedOpen, setAdvancedOpen] = useState(false)

  useEffect(() => {
    let active = true
    void commerceApi.brands.list()
      .then(response => { if (active) setBrands(response.items.map(item => ({ id: item.id, name: item.name }))) })
      .catch(() => { /* brand picker stays hidden when the catalog is unreachable */ })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (errors.brandIds) setAdvancedOpen(true)
  }, [errors])

  const selectedBrands = new Set(splitIds(value.brandIds).map(id => id.toLowerCase()))
  const toggleBrand = (id: string, checked: boolean) => {
    const current = splitIds(value.brandIds)
    const next = checked ? [...current, id] : current.filter(item => item.toLowerCase() !== id.toLowerCase())
    onChange({ ...value, brandIds: next.join(', ') })
  }

  return (
    <section>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Chiều cao (cm)"
          type="number"
          min={HEIGHT_RANGE.min}
          max={HEIGHT_RANGE.max}
          step="0.1"
          value={value.heightCm}
          error={errors.heightCm}
          onChange={event => onChange({ ...value, heightCm: event.target.value })}
        />
        <TextField
          label="Cân nặng (kg)"
          type="number"
          min={WEIGHT_RANGE.min}
          max={WEIGHT_RANGE.max}
          step="0.1"
          value={value.weightKg}
          error={errors.weightKg}
          onChange={event => onChange({ ...value, weightKg: event.target.value })}
        />
        <SizeSelect label="Cỡ áo thường dùng" value={value.usualTopSize} options={TOP_SIZES} error={errors.usualTopSize} onChange={next => onChange({ ...value, usualTopSize: next })} />
        <SizeSelect label="Cỡ quần/váy thường dùng" value={value.usualBottomSize} options={BOTTOM_SIZES} error={errors.usualBottomSize} onChange={next => onChange({ ...value, usualBottomSize: next })} />
        <SizeSelect label="Cỡ giày" value={value.shoeSize} options={SHOE_SIZES} error={errors.shoeSize} onChange={next => onChange({ ...value, shoeSize: next })} />
      </div>
      {brands.length > 0 && (
        <details open={advancedOpen} onToggle={event => setAdvancedOpen(event.currentTarget.open)} className="mt-5 rounded-lg border border-[#E3E2E2] bg-[#FBF9F9] p-4">
          <summary className="cursor-pointer text-sm font-semibold text-[#222222] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B1B]">Tùy chọn nâng cao</summary>
          <fieldset className="mt-4 grid gap-2">
            <legend className="text-sm font-semibold text-[#3A3632]">Thương hiệu yêu thích</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {brands.map(brand => (
                <label key={brand.id} className="inline-flex items-center gap-2 rounded-lg border border-[#E3E2E2] bg-white px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedBrands.has(brand.id.toLowerCase())}
                    onChange={event => toggleBrand(brand.id, event.target.checked)}
                    className="h-4 w-4 accent-[#1C1B1B]"
                  />
                  {brand.name}
                </label>
              ))}
            </div>
            {errors.brandIds && <span className="text-xs font-medium text-[#A94B4B]">{errors.brandIds}</span>}
          </fieldset>
        </details>
      )}
    </section>
  )
}
