// Allowed sizes for the style profile. They mirror the Identity service (ProfileRequestValidator) and the
// labels used by the catalog, so a saved profile can always be matched with real product variants.
export const TOP_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL']
export const BOTTOM_SIZES = [
  ...TOP_SIZES,
  ...Array.from({ length: 17 }, (_, index) => String(24 + index)), // waist 24-40
  ...Array.from({ length: 10 }, (_, index) => String(index * 2)), // women's 0-18
]
export const SHOE_SIZES = Array.from({ length: 13 }, (_, index) => String(34 + index)) // 34-46

export const HEIGHT_RANGE = { min: 100, max: 230 }
export const WEIGHT_RANGE = { min: 30, max: 200 }
