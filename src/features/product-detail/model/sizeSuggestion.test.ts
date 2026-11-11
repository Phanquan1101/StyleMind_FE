import { describe, expect, it } from 'vitest'
import { describeSuggestion, estimateLetterSize, sizeKindForCategory, suggestSize } from './sizeSuggestion'

const options = (sizes: string[], unavailable: string[] = []) => sizes.map(size => ({ size, available: !unavailable.includes(size) }))

describe('size suggestion', () => {
  it('uses the size saved in the profile (top vs bottom by category)', () => {
    const profile = { usualTopSize: 'M', usualBottomSize: 'L', weightKg: 80 }
    expect(suggestSize(profile, 'top', options(['S', 'M', 'L']))).toEqual({ size: 'M', source: 'profile' })
    expect(suggestSize(profile, 'bottom', options(['S', 'M', 'L']))).toEqual({ size: 'L', source: 'profile' })
    expect(sizeKindForCategory('Quần')).toBe('bottom')
    expect(sizeKindForCategory('Váy')).toBe('bottom')
    expect(sizeKindForCategory('Áo khoác')).toBe('top')
    expect(sizeKindForCategory('Đầm')).toBe('top')
  })

  it('falls back to the nearest size in stock and says so', () => {
    const suggestion = suggestSize({ usualTopSize: 'M' }, 'top', options(['S', 'M', 'L', 'XL'], ['M']))
    expect(suggestion).toEqual({ size: 'S', source: 'profile', unavailableWanted: 'M' })
    expect(describeSuggestion(suggestion!)).toBe('Size M (theo hồ sơ) hiện không còn hàng. Gợi ý gần nhất còn hàng: S.')
    // letters are only compared with letters and numbers with numbers
    expect(suggestSize({ usualTopSize: '2XL' }, 'top', options(['S', '38', '40']))?.size).toBe('S')
    expect(suggestSize({ usualBottomSize: '30' }, 'bottom', options(['M', '28', '34']))?.size).toBe('28')
  })

  it('estimates from weight/height when the profile has no size, and labels it as an estimate', () => {
    expect(estimateLetterSize(165, 50)).toBe('S')
    expect(estimateLetterSize(165, 58)).toBe('M')
    expect(estimateLetterSize(178, 58)).toBe('L')
    expect(estimateLetterSize(148, 58)).toBe('S')
    expect(estimateLetterSize(165, 130)).toBe('4XL')
    expect(estimateLetterSize(165, undefined)).toBeNull()
    const suggestion = suggestSize({ heightCm: 165, weightKg: 58 }, 'top', options(['S', 'M', 'L']))
    expect(suggestion).toEqual({ size: 'M', source: 'estimate' })
    expect(describeSuggestion(suggestion!)).toContain('chỉ mang tính tham khảo')
  })

  it('falls back to the estimate when the saved size is on another scale than the product', () => {
    const profile = { usualBottomSize: '30', heightCm: 165, weightKg: 58 }
    expect(suggestSize(profile, 'bottom', options(['S', 'M', 'L']))).toEqual({ size: 'M', source: 'estimate' })
    expect(suggestSize({ usualBottomSize: '30' }, 'bottom', options(['S', 'M', 'L']))).toBeNull()
  })

  it('returns nothing without profile data and treats XXL as 2XL', () => {
    expect(suggestSize(null, 'top', options(['M']))).toBeNull()
    expect(suggestSize({}, 'top', options(['M']))).toBeNull()
    expect(suggestSize({ usualTopSize: 'XXL' }, 'top', options(['XL', '2XL']))?.size).toBe('2XL')
  })
})
