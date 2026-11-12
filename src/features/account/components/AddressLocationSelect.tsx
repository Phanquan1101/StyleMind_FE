import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface AddressLocationSelectProps {
  id?: string
  label: string
  placeholder: string
  emptyLabel: string
  options: { code: string; name: string }[]
  value: string
  onChange: (code: string) => void
  disabled?: boolean
  error?: string
}

function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().trim()
}

export function AddressLocationSelect({ id: providedId, label, placeholder, emptyLabel, options: locations, value, onChange, disabled = false, error }: AddressLocationSelectProps) {
  const generatedId = useId()
  const id = providedId ?? generatedId
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [active, setActive] = useState(-1)
  const selected = locations.find(location => location.code === value)
  const matches = locations.filter(location => normalizeSearch(location.name).includes(normalizeSearch(search)))
  const options = [{ code: '', name: emptyLabel }, ...matches]
  const expanded = open && !disabled

  const select = (code: string) => {
    onChange(code)
    setOpen(false)
    setSearch('')
    setActive(-1)
  }

  return <div className="grid min-w-0 content-start gap-2 text-sm font-semibold text-[#3A3632]">
    <label htmlFor={id}>{label}</label>
    <div className="relative">
      <input
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={`${id}-list`}
        aria-activedescendant={expanded && options[active] ? `${id}-option-${active}` : undefined}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        autoComplete="off"
        disabled={disabled}
        placeholder={selected?.name || placeholder}
        value={expanded ? search : selected?.name || ''}
        onFocus={() => { setSearch(''); setActive(-1); setOpen(true) }}
        onClick={() => setOpen(true)}
        onBlur={() => { setOpen(false); setActive(-1) }}
        onChange={event => { setSearch(event.target.value); setActive(-1); setOpen(true) }}
        onKeyDown={event => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setOpen(true)
            setActive(current => Math.min(current + 1, options.length - 1))
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault()
            setOpen(true)
            setActive(current => Math.max(current - 1, 0))
          }
          if (event.key === 'Enter' && open) {
            event.preventDefault()
            if (options[active]) select(options[active].code)
          }
          if (event.key === 'Escape') { event.preventDefault(); setOpen(false); setActive(-1) }
        }}
        className="h-11 min-w-0 w-full rounded-lg border border-[#C4C7C7] bg-white pl-3 pr-10 text-sm font-medium outline-none focus:border-[#1C1B1B] focus:ring-2 focus:ring-[#1C1B1B]/20 disabled:cursor-not-allowed disabled:bg-[#F5F2EE]"
      />
      <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#5E5F5D]" />
      {expanded && <div className="absolute top-full z-20 mt-1 w-full overflow-hidden rounded-lg border border-[#E3E2E2] bg-white shadow-lg">
        <ul id={`${id}-list`} role="listbox" aria-label={label} className="max-h-60 overflow-auto">
          {options.map((location, index) => <li
            id={`${id}-option-${index}`}
            key={location.code}
            role="option"
            aria-selected={location.code === value}
            onMouseDown={event => event.preventDefault()}
            onClick={() => select(location.code)}
            className={`cursor-pointer px-3 py-3 text-sm font-normal hover:bg-[#F5F2EE] ${index === active ? 'bg-[#F5F2EE]' : ''}`}
          >{location.name}</li>)}
        </ul>
        {!matches.length && <p role="status" className="px-3 py-3 text-sm font-normal text-[#5E5F5D]">Không tìm thấy kết quả phù hợp.</p>}
      </div>}
    </div>
    {error && <span id={`${id}-error`} className="text-xs font-medium text-[#A94B4B]">{error}</span>}
  </div>
}
