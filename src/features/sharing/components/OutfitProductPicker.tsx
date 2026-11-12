import { Search, Shirt } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { commerceApi } from '@/api/commerce'
import type { CommerceProduct, ProductVariant } from '@/api/commerce.types'
import type { ProductSize } from '@/entities/product/model/types'
import { commerceProductToEntity } from '@/features/commerce/data/commerceEntityAdapters'
import { getProductSelection } from '@/features/product-detail/model/productSelection'
import { Button } from '@/shared/ui'
import { colorSwatchHex } from '@/shared/lib/colorSwatch'
import { formatCurrency } from '@/shared/lib/formatCurrency'

const PAGE_SIZE = 12
const SEARCH_DELAY_MS = 350

interface OutfitProductPickerProps {
  /** Variants already in the outfit: shown but not selectable. */
  usedVariantIds: ReadonlySet<string>
  /** When set (changing a variant) only this product is offered and the search box is hidden. */
  restrictToProductId?: string
  disabled?: boolean
  /** Called with the chosen variant id, or '' when the choice is cleared. */
  onSelect: (variantId: string) => void
}

const activeVariants = (product: CommerceProduct) => product.variants.filter(variant => variant.variant_status === 'ACTIVE')
const imageOf = (variant?: ProductVariant) => variant?.images.find(image => image.is_primary)?.image_url ?? variant?.images[0]?.image_url
const productImage = (product: CommerceProduct) => {
  const variants = activeVariants(product)
  return imageOf(variants.find(variant => imageOf(variant))) ?? undefined
}
const fromPrice = (product: CommerceProduct) => {
  const prices = activeVariants(product).map(variant => variant.unit_price_vnd)
  return prices.length ? Math.min(...prices) : null
}

export function OutfitProductPicker({ usedVariantIds, restrictToProductId, disabled = false, onSelect }: OutfitProductPickerProps) {
  const [keyword, setKeyword] = useState('')
  const [query, setQuery] = useState('')
  const [products, setProducts] = useState<CommerceProduct[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [productId, setProductId] = useState<string | null>(restrictToProductId ?? null)
  const [color, setColor] = useState('')
  const [size, setSize] = useState('')

  // Debounced search term.
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(keyword.trim()), SEARCH_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [keyword])

  // First page (or the single restricted product).
  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    const request = restrictToProductId
      ? commerceApi.products.get(restrictToProductId).then(product => ({ items: [product], page: 0, total_pages: 1 }))
      : commerceApi.products.list({ keyword: query || undefined, page: 0, size: PAGE_SIZE })
    request
      .then(result => { if (active) { setProducts(result.items); setPage(result.page); setTotalPages(result.total_pages) } })
      .catch(() => { if (active) { setProducts([]); setError('Không tải được sản phẩm. Vui lòng thử lại.') } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [query, restrictToProductId, revision])

  const loadMore = async () => {
    setLoadingMore(true); setError('')
    try {
      const next = await commerceApi.products.list({ keyword: query || undefined, page: page + 1, size: PAGE_SIZE })
      setProducts(current => [...current, ...next.items.filter(item => !current.some(existing => existing.product_id === item.product_id))])
      setPage(next.page); setTotalPages(next.total_pages)
    } catch { setError('Không tải thêm được sản phẩm. Vui lòng thử lại.') } finally { setLoadingMore(false) }
  }

  const visible = useMemo(() => products.filter(product => product.product_status === 'ACTIVE' && activeVariants(product).length > 0), [products])
  const product = visible.find(item => item.product_id === productId) ?? null
  // Colour -> size grouping, size order and stock come from the same module the product page uses.
  const entity = useMemo(() => (product ? commerceProductToEntity({ ...product, variants: product.variants.map(variant => ({ ...variant, size: variant.size?.trim() || 'Một cỡ' })) }) : null), [product])
  const colorNames = useMemo(() => (entity ? getProductSelection(entity).colorOptions.map(option => option.color) : []), [entity])
  const activeColor = colorNames.includes(color) ? color : colorNames.length === 1 ? colorNames[0] : ''
  // An empty colour means "none chosen yet" (null would fall back to the first colour).
  const selection = entity ? getProductSelection(entity, { color: activeColor, size: (size || null) as ProductSize | null }) : null
  const sizeOptions = activeColor && selection ? selection.sizeOptions : []
  const variantIdOf = (colorName: string, sizeName: string) => entity?.variants.find(variant => variant.active && variant.color === colorName && variant.size === sizeName)?.id ?? ''
  const preview = (activeColor && selection ? selection.images[0]?.url : undefined) ?? (product ? productImage(product) : undefined)

  const choose = (nextProduct: string | null, nextColor: string, nextSize: string) => {
    setProductId(nextProduct); setColor(nextColor); setSize(nextSize)
    const nextEntity = nextProduct === product?.product_id ? entity : null
    onSelect(nextEntity && nextColor && nextSize ? nextEntity.variants.find(variant => variant.active && variant.color === nextColor && variant.size === nextSize)?.id ?? '' : '')
  }

  return <div className="grid min-w-0 gap-4">
    {!restrictToProductId && <label className="grid gap-2 text-sm font-semibold">
      Tìm sản phẩm
      <span className="relative block">
        <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5E5F5D]" />
        <input
          type="search" value={keyword} disabled={disabled} placeholder="Nhập tên sản phẩm hoặc thương hiệu"
          onChange={event => setKeyword(event.target.value)}
          className="min-h-11 w-full rounded-lg border border-[#C4C7C7] bg-white pl-9 pr-3 text-sm font-medium outline-none transition focus:border-[#1C1B1B] focus:ring-2 focus:ring-[#1C1B1B]/20"
        />
      </span>
    </label>}

    {loading && <p role="status" className="text-sm text-[#5E5F5D]">Đang tải sản phẩm…</p>}
    {error && <div role="alert" className="grid gap-2 text-sm text-[#A94B4B]"><p>{error}</p><div><Button variant="secondary" size="sm" onClick={() => (products.length ? void loadMore() : setRevision(value => value + 1))}>Thử lại</Button></div></div>}
    {!loading && !error && visible.length === 0 && <p className="text-sm text-[#5E5F5D]">{query ? 'Không tìm thấy sản phẩm phù hợp.' : 'Chưa có sản phẩm để thêm.'}</p>}

    {!restrictToProductId && visible.length > 0 && <ul aria-label="Kết quả sản phẩm" className="grid max-h-48 gap-2 overflow-y-auto sm:max-h-64 rounded-lg border border-[#E3E2E2] p-2">
      {visible.map(item => {
        const image = productImage(item); const price = fromPrice(item); const chosen = item.product_id === productId
        return <li key={item.product_id}>
          <button
            type="button" disabled={disabled} aria-pressed={chosen} onClick={() => choose(item.product_id, '', '')}
            className={`grid w-full min-w-0 grid-cols-[56px_minmax(0,1fr)] items-center gap-3 rounded-lg border p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B1B] ${chosen ? 'border-[#1C1B1B] bg-[#E9E8E7]' : 'border-transparent hover:bg-[#F5F3F3]'}`}
          >
            {image
              ? <img src={image} alt="" loading="lazy" className="aspect-[3/4] w-14 rounded-md bg-[#F5F3F3] object-cover" />
              : <span className="grid aspect-[3/4] w-14 place-items-center rounded-md bg-[#F5F3F3] text-[#C4C7C7]"><Shirt size={22} strokeWidth={1.25} aria-hidden="true" /></span>}
            <span className="grid min-w-0 gap-0.5">
              <span className="break-words text-sm font-semibold text-[#222222]">{item.name}</span>
              {item.brand_name && <span className="truncate text-xs text-[#5E5F5D]">{item.brand_name}</span>}
              {price !== null && <span className="text-xs font-semibold text-[#222222]">{formatCurrency(price)}</span>}
            </span>
          </button>
        </li>
      })}
      {page + 1 < totalPages && <li className="grid justify-items-center p-1"><Button variant="secondary" size="sm" loading={loadingMore} onClick={() => void loadMore()}>Tải thêm</Button></li>}
    </ul>}

    {product && <fieldset className="grid min-w-0 gap-3 rounded-lg border border-[#E3E2E2] p-3" disabled={disabled}>
      <legend className="px-1 text-sm font-semibold">Chọn màu và kích cỡ</legend>
      <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3">
        {preview
          ? <img src={preview} alt={product.name} className="aspect-[3/4] w-[72px] rounded-md bg-[#F5F3F3] object-cover" />
          : <span className="grid aspect-[3/4] w-[72px] place-items-center rounded-md bg-[#F5F3F3] text-[#C4C7C7]"><Shirt size={26} strokeWidth={1.25} aria-hidden="true" /></span>}
        <div className="grid min-w-0 content-start gap-3">
          <p className="break-words text-sm font-semibold">{product.name}</p>
          <div role="group" aria-label="Màu" className="flex flex-wrap gap-2">
            {colorNames.map(name => <button
              key={name} type="button" aria-pressed={name === activeColor} aria-label={`Màu ${name}`} onClick={() => choose(product.product_id, name, '')}
              className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B1B] ${name === activeColor ? 'border-[#1C1B1B] bg-[#E9E8E7]' : 'border-[#C4C7C7] bg-white hover:border-[#1C1B1B]'}`}
            >
              <span aria-hidden="true" className="h-4 w-4 rounded-full border border-[#C4C7C7]" style={{ backgroundColor: colorSwatchHex(name) }} />{name}
            </button>)}
          </div>
          {activeColor && <div role="group" aria-label="Kích cỡ" className="flex flex-wrap gap-2">
            {sizeOptions.map(option => {
              const optionId = variantIdOf(activeColor, option.size)
              const used = usedVariantIds.has(optionId); const soldOut = option.stock <= 0
              return <button
                key={option.size} type="button" disabled={used} aria-pressed={option.size === size}
                aria-label={`Kích cỡ ${option.size}${soldOut ? ', hết hàng' : ''}${used ? ', đã có trong outfit' : ''}`}
                onClick={() => choose(product.product_id, activeColor, option.size)}
                className={`grid min-h-10 min-w-12 place-items-center rounded-lg border px-3 py-1 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B1B] disabled:cursor-not-allowed disabled:opacity-50 ${option.size === size ? 'border-[#1C1B1B] bg-[#1C1B1B] text-white' : 'border-[#C4C7C7] bg-white hover:border-[#1C1B1B]'} ${soldOut && !used ? 'opacity-60' : ''}`}
              >
                {option.size}
                {used ? <span className="text-[10px] font-medium">Đã có</span> : soldOut ? <span className="text-[10px] font-medium">Hết hàng</span> : null}
              </button>
            })}
          </div>}
          {activeColor && sizeOptions.some(option => option.stock <= 0) && <p className="text-xs text-[#5E5F5D]">Món hết hàng vẫn thêm được vào outfit để phối đồ; chỉ không mua được khi hết hàng.</p>}
        </div>
      </div>
    </fieldset>}
  </div>
}
