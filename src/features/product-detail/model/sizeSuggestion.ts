// Minimal size suggestion for the product page. Everything about sizing lives here (one place to tune).

/** Letter sizes from smallest to largest. */
export const LETTER_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL']

export interface BodyProfile {
  heightCm?: number
  weightKg?: number
  usualTopSize?: string
  usualBottomSize?: string
}

export interface SizeOption {
  size: string
  available: boolean
}

export interface SizeSuggestion {
  /** Size to pre-select (always one that can be bought). */
  size: string
  /** `profile` = the size saved in the customer profile, `estimate` = derived from height/weight. */
  source: 'profile' | 'estimate'
  /** The size the suggestion was based on when it is not available and `size` is the nearest one in stock. */
  unavailableWanted?: string
}

const ALIASES: Record<string, string> = { XXL: '2XL', XXXL: '3XL', XXXXL: '4XL' }

export function normalizeSize(size: string): string {
  const value = size.trim().toUpperCase()
  return ALIASES[value] ?? value
}

/** Skirts and trousers use the bottom size; tops, jackets, dresses and sets use the top size. */
export function sizeKindForCategory(categoryLabel: string | undefined): 'top' | 'bottom' {
  return /quần|váy/i.test(categoryLabel ?? '') ? 'bottom' : 'top'
}

/** Upper weight limit (kg) of each letter size. */
const WEIGHT_BANDS: Array<[number, string]> = [[44, 'XS'], [52, 'S'], [60, 'M'], [68, 'L'], [78, 'XL'], [90, '2XL'], [105, '3XL']]

/**
 * ESTIMATE ONLY. Rough letter-size table by weight (kg), nudged one step by height.
 * Used only when the profile has no usual size; always shown to the customer as an estimate.
 */
export function estimateLetterSize(heightCm?: number, weightKg?: number): string | null {
  if (!weightKg || weightKg <= 0) return null
  const band = WEIGHT_BANDS.find(([limit]) => weightKg <= limit)
  let index = band ? LETTER_SIZES.indexOf(band[1]) : LETTER_SIZES.length - 1
  if (heightCm && heightCm >= 175) index += 1
  else if (heightCm && heightCm <= 150) index -= 1
  return LETTER_SIZES[Math.min(LETTER_SIZES.length - 1, Math.max(0, index))]
}

/** Position on the size scale: letters 0-7, numeric sizes 1000+. Null when the label is not a known size. */
function rank(size: string): number | null {
  const letter = LETTER_SIZES.indexOf(size)
  if (letter >= 0) return letter
  return /^\d+$/.test(size) ? 1000 + Number(size) : null
}

function suggestFor(wanted: string, source: 'profile' | 'estimate', options: SizeOption[]): SizeSuggestion | null {
  const normalized = options.map(option => ({ ...option, key: normalizeSize(option.size) }))
  const exact = normalized.find(option => option.key === wanted)
  if (exact?.available) return { size: exact.size, source }

  // Not sold or out of stock: nearest size in stock on the same scale (letters with letters, numbers with numbers).
  const target = rank(wanted)
  if (target === null) return null
  const candidates = normalized
    .filter(option => option.available)
    .flatMap(option => {
      const position = rank(option.key)
      return position !== null && (position >= 1000) === (target >= 1000)
        ? [{ option, position, distance: Math.abs(position - target) }]
        : []
    })
    .sort((a, b) => a.distance - b.distance || a.position - b.position)
  return candidates[0] ? { size: candidates[0].option.size, source, unavailableWanted: wanted } : null
}

export function suggestSize(profile: BodyProfile | null | undefined, kind: 'top' | 'bottom', options: SizeOption[]): SizeSuggestion | null {
  if (!profile) return null
  const saved = kind === 'top' ? profile.usualTopSize : profile.usualBottomSize
  const savedSize = saved ? normalizeSize(saved) : null
  const estimated = estimateLetterSize(profile.heightCm, profile.weightKg)
  // The saved size wins; when the product uses another scale (e.g. profile says 30 but the item is S-XL), fall back to the estimate.
  return (savedSize ? suggestFor(savedSize, 'profile', options) : null) ?? (estimated ? suggestFor(estimated, 'estimate', options) : null)
}

export function describeSuggestion(suggestion: SizeSuggestion): string {
  if (suggestion.unavailableWanted) {
    const base = suggestion.source === 'profile' ? 'theo hồ sơ' : 'ước lượng từ chiều cao/cân nặng'
    return `Size ${suggestion.unavailableWanted} (${base}) hiện không còn hàng. Gợi ý gần nhất còn hàng: ${suggestion.size}.`
  }
  return suggestion.source === 'profile'
    ? `Gợi ý cho bạn: ${suggestion.size} (theo hồ sơ)`
    : `Gợi ý cho bạn: ${suggestion.size} (ước lượng từ chiều cao/cân nặng trong hồ sơ, chỉ mang tính tham khảo)`
}
