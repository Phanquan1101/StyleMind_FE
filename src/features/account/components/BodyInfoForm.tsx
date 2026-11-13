import { useState, type FormEvent } from 'react'
import { Info } from 'lucide-react'

import { SelectField, TextField } from '@/shared/ui'

import { BOTTOM_SIZES, HEIGHT_RANGE, SHOE_SIZES, TOP_SIZES, WEIGHT_RANGE } from '../model/sizeOptions'
import type { FieldErrors, StyleProfileInput } from '../model/validators'

interface BodyInfoFormProps {
  value: StyleProfileInput
  errors: FieldErrors<StyleProfileInput>
  onChange: (value: StyleProfileInput) => void
}

interface PreferenceOption {
  value: string
  label: string
  swatch?: string
}

const FIT_OPTIONS: PreferenceOption[] = [
  { value: 'SLIM', label: 'Ôm dáng' },
  { value: 'REGULAR', label: 'Vừa vặn' },
  { value: 'RELAXED', label: 'Thoải mái' },
  { value: 'OVERSIZED', label: 'Rộng' },
]

const STYLE_OPTIONS: PreferenceOption[] = [
  { value: 'MINIMALIST_CONTEMPORARY', label: 'Tối giản hiện đại' },
  { value: 'QUIET_LUXURY', label: 'Thanh lịch tối giản' },
  { value: 'SMART_CASUAL', label: 'Smart casual' },
  { value: 'SARTORIAL_CLASSIC', label: 'Cổ điển' },
  { value: 'ARCHITECTURAL_CLEAN', label: 'Đường nét tinh gọn' },
]

const COLOR_OPTIONS: PreferenceOption[] = [
  { value: 'BLACK', label: 'Đen', swatch: '#1C1B1B' },
  { value: 'WHITE', label: 'Trắng', swatch: '#FFFFFF' },
  { value: 'BEIGE', label: 'Be', swatch: '#D6C5A8' },
  { value: 'NAVY', label: 'Xanh navy', swatch: '#24364B' },
  { value: 'BROWN', label: 'Nâu', swatch: '#76533F' },
  { value: 'GREY', label: 'Xám', swatch: '#8A8C8D' },
  { value: 'OLIVE', label: 'Xanh olive', swatch: '#747653' },
]

function splitCodes(value: string): string[] {
  return value.split(',').map(item => item.trim()).filter(Boolean)
}

function formatCode(value: string): string {
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map(part => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function normalizeCode(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, '_')
    .replace(/^[_-]+|[_-]+$/g, '')
}

function SizeSelect({ label, value, options, error, onChange }: {
  label: string
  value: string
  options: string[]
  error?: string
  onChange: (next: string) => void
}) {
  // Keep old values visible so an update never silently clears a size the current list no longer offers.
  const legacy = value && !options.includes(value.toUpperCase()) ? value : ''
  return (
    <SelectField label={label} value={value} error={error} onChange={event => onChange(event.target.value)}>
      <option value="">Chưa chọn</option>
      {legacy && <option value={legacy}>{legacy} (đã lưu)</option>}
      {options.map(option => <option key={option} value={option}>{option}</option>)}
    </SelectField>
  )
}

function PreferencePicker({ id, title, description, placeholder, value, options, error, onChange }: {
  id: string
  title: string
  description: string
  placeholder: string
  value: string
  options: PreferenceOption[]
  error?: string
  onChange: (next: string) => void
}) {
  const [customValue, setCustomValue] = useState('')
  const [customError, setCustomError] = useState('')
  const selectedCodes = splitCodes(value)
  const selectedSet = new Set(selectedCodes.map(code => code.toUpperCase()))
  const customOptions: PreferenceOption[] = selectedCodes
    .filter(code => !options.some(option => option.value === code.toUpperCase()))
    .map(code => ({ value: code, label: formatCode(code) }))
  const displayOptions = [...options, ...customOptions]

  const toggle = (code: string) => {
    const isSelected = selectedSet.has(code.toUpperCase())
    const next = isSelected
      ? selectedCodes.filter(item => item.toUpperCase() !== code.toUpperCase())
      : [...selectedCodes, code]
    onChange(next.join(', '))
  }

  const addCustom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const code = normalizeCode(customValue)
    if (!/^[A-Z0-9][A-Z0-9_-]{0,63}$/.test(code)) {
      setCustomError('Nhập lựa chọn bằng chữ, số, dấu gạch ngang hoặc gạch dưới.')
      return
    }
    if (selectedSet.has(code)) {
      setCustomError('Lựa chọn này đã có trong danh sách.')
      return
    }
    if (selectedCodes.length >= 50) {
      setCustomError('Mỗi danh sách có thể lưu tối đa 50 lựa chọn.')
      return
    }
    onChange([...selectedCodes, code].join(', '))
    setCustomValue('')
    setCustomError('')
  }

  return (
    <fieldset>
      <legend className="text-sm font-semibold text-[#222222]">{title}</legend>
      <p className="mt-1 text-xs leading-5 text-[#5E5F5D]">{description}</p>
      <div role="group" aria-label={title} className="mt-3 flex flex-wrap gap-2">
        {displayOptions.map(option => {
          const isSelected = selectedSet.has(option.value.toUpperCase())
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => toggle(option.value)}
              className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B1B] focus-visible:ring-offset-2 ${isSelected ? 'border-[#1C1B1B] bg-[#1C1B1B] text-white' : 'border-[#E3E2E2] bg-white text-[#3A3632] hover:border-[#777777]'}`}
            >
              {option.swatch && <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/15" style={{ backgroundColor: option.swatch }} aria-hidden="true" />}
              {option.label}
            </button>
          )
        })}
      </div>
      <form onSubmit={addCustom} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor={`${id}-custom`}>Thêm lựa chọn khác cho {title.toLowerCase()}</label>
        <input
          id={`${id}-custom`}
          value={customValue}
          maxLength={64}
          onChange={event => { setCustomValue(event.target.value); setCustomError('') }}
          placeholder={placeholder}
          className="min-h-10 min-w-0 flex-1 rounded-lg border border-[#C4C7C7] bg-white px-3 text-sm text-[#222222] outline-none transition focus:border-[#1C1B1B] focus:ring-2 focus:ring-[#1C1B1B]/20"
        />
        <button type="submit" className="min-h-10 rounded-lg border border-[#C4C7C7] px-4 text-sm font-semibold text-[#222222] transition hover:bg-[#F5F3F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B1B] focus-visible:ring-offset-2">
          Thêm
        </button>
      </form>
      {(customError || error) && <p className="mt-2 text-xs font-medium text-[#A94B4B]" role="alert">{customError || error}</p>}
    </fieldset>
  )
}

/** API-backed measurements, sizes and preference codes. Previously stored brand IDs remain untouched by this form. */
export function BodyInfoForm({ value, errors, onChange }: BodyInfoFormProps) {
  const legacyFit = value.fitPreference && !FIT_OPTIONS.some(option => option.value === value.fitPreference.toUpperCase())
    ? value.fitPreference
    : ''

  return (
    <div className="space-y-6">
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
        <SelectField
          label="Độ vừa vặn ưa thích"
          value={value.fitPreference}
          error={errors.fitPreference}
          onChange={event => onChange({ ...value, fitPreference: event.target.value })}
        >
          <option value="">Chưa chọn</option>
          {legacyFit && <option value={legacyFit}>{formatCode(legacyFit)} (đã lưu)</option>}
          {FIT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </SelectField>
      </div>

      <div className="flex items-start gap-3 rounded-lg bg-[#F5F3F3] px-4 py-3 text-sm leading-6 text-[#3A3632]">
        <Info size={17} className="mt-1 shrink-0" aria-hidden="true" />
        <p>Số đo và kích cỡ là thông tin tùy chọn. Bạn có thể cập nhật hoặc xóa chúng bất cứ lúc nào.</p>
      </div>

      <div className="space-y-6 border-t border-[#E3E2E2] pt-5">
        <PreferencePicker
          id="style-codes"
          title="Phong cách yêu thích"
          description="Chọn gợi ý có sẵn hoặc thêm lựa chọn riêng."
          placeholder="Ví dụ: STREETWEAR"
          value={value.styleCodes}
          options={STYLE_OPTIONS}
          error={errors.styleCodes}
          onChange={styleCodes => onChange({ ...value, styleCodes })}
        />
        <PreferencePicker
          id="color-codes"
          title="Màu sắc yêu thích"
          description="Các màu này được lưu cùng hồ sơ phong cách của bạn."
          placeholder="Ví dụ: BURGUNDY"
          value={value.colorCodes}
          options={COLOR_OPTIONS}
          error={errors.colorCodes}
          onChange={colorCodes => onChange({ ...value, colorCodes })}
        />
      </div>
    </div>
  )
}
