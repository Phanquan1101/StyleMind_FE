import { useEffect, useState } from 'react'

import {
  activeVariants,
  commerceCatalogApi,
  lowestPrice,
  productImage,
  type CatalogCategory,
  type CatalogProduct,
  type CatalogVariant,
} from '@/shared/api/commerceCatalogApi'
import { wardrobeErrorMessage } from '@/shared/api/wardrobeApi'
import { commerceImageUrl } from '@/shared/lib/commerceImageUrl'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { Button, LoadingSkeleton } from '@/shared/ui'

import { PRODUCT_SEARCH_KEYWORD_MAX_LENGTH, useProductSearch } from '../model/useProductSearch'
import { ProductVariantChooser } from './ProductVariantChooser'

interface ProductPickerProps {
  /** Variants already in the draft or outfit; they show as "đã có" and cannot be added again. */
  disabledVariantIds: ReadonlySet<string>
  addDisabled?: boolean
  addDisabledReason?: string
  adding?: boolean
  onAdd: (product: CatalogProduct, variant: CatalogVariant) => void
}

const inputClass =
  'min-h-11 rounded-lg border border-[#D8D0C6] bg-white px-3 text-sm font-medium text-[#222222] outline-none transition focus:border-[#684B5A] focus:ring-2 focus:ring-[#684B5A]/20'

/** Search the Commerce catalog and pick one colour/size variant. Used by the builder and by "Thêm món". */
export function ProductPicker({ disabledVariantIds, addDisabled = false, addDisabledReason, adding = false, onAdd }: ProductPickerProps) {
  const [keyword, setKeyword] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [categories, setCategories] = useState<CatalogCategory[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [chosen, setChosen] = useState<CatalogVariant | null>(null)
  const { products, status, error, hasMore, loadingMore, loadMore, retry } = useProductSearch(keyword, categoryId)

  useEffect(() => {
    const controller = new AbortController()
    commerceCatalogApi
      .listCategories(controller.signal)
      .then(items => {
        if (!controller.signal.aborted) setCategories(items.filter(category => category.is_active))
      })
      .catch(() => undefined)
    return () => controller.abort()
  }, [])

  return (
    <section className="grid min-h-0 gap-4 rounded-lg border border-[#E3DAD0] bg-white p-4 shadow-sm md:p-5">
      <div>
        <h2 className="font-display text-2xl font-semibold text-[#222222]">Catalog sản phẩm</h2>
        <p className="mt-2 text-sm leading-6 text-[#6F6B67]">Chọn màu và size của món đang bán để thêm vào outfit.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
        <label className="grid gap-2 text-sm font-semibold text-[#3A3632]">
          Tìm sản phẩm cho outfit
          <input
            value={keyword}
            maxLength={PRODUCT_SEARCH_KEYWORD_MAX_LENGTH}
            onChange={event => setKeyword(event.target.value)}
            className={inputClass}
            placeholder="Nhập tên sản phẩm"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-[#3A3632]">
          Danh mục
          <select value={categoryId} onChange={event => setCategoryId(event.target.value)} className={inputClass}>
            <option value="">Tất cả danh mục</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {status === 'loading' && (
        <div aria-busy="true" aria-label="Đang tìm sản phẩm" className="grid gap-3">
          {[0, 1, 2].map(index => (
            <LoadingSkeleton key={index} className="h-28" />
          ))}
        </div>
      )}

      {status === 'error' && (
        <div role="alert" className="grid justify-items-start gap-3 rounded-lg bg-[#FAF8F5] px-4 py-6">
          <p className="text-sm font-semibold text-[#A94B4B]">{wardrobeErrorMessage(error, 'Không tải được danh sách sản phẩm.')}</p>
          <Button variant="secondary" onClick={retry}>
            Thử lại
          </Button>
        </div>
      )}

      {status === 'ready' && products.length === 0 && (
        <div className="rounded-lg bg-[#FAF8F5] px-4 py-6 text-sm font-medium text-[#6F6B67]">Không có sản phẩm phù hợp.</div>
      )}

      {status === 'ready' && products.length > 0 && (
        <div className="grid gap-3">
          {products.map(product => {
            const variants = activeVariants(product)
            const image = productImage(product, variants[0])
            const imageUrl = commerceImageUrl(image?.image_url)
            const price = lowestPrice(variants)
            const expanded = expandedId === product.product_id

            return (
              <article key={product.product_id} className="grid gap-3 rounded-lg bg-[#FAF8F5] p-3 sm:grid-cols-[96px_minmax(0,1fr)]">
                {imageUrl ? (
                  <img src={imageUrl} alt={image?.alt_text || product.name} className="aspect-[4/5] w-full rounded-md object-cover sm:w-24" />
                ) : (
                  <div
                    role="img"
                    aria-label={`Chưa có ảnh ${product.name}`}
                    className="grid aspect-[4/5] w-full place-items-center rounded-md bg-[#EEE8E1] text-xs font-semibold text-[#8A8179] sm:w-24"
                  >
                    Chưa có ảnh
                  </div>
                )}
                <div className="grid gap-3">
                  <div>
                    <h3 className="font-semibold text-[#222222]">{product.name}</h3>
                    {product.brand_name && <p className="mt-1 text-sm text-[#6F6B67]">{product.brand_name}</p>}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#6F6B67]">
                      <span className="rounded-md bg-white px-2 py-1">{variants.length} phiên bản</span>
                      {product.category_name && <span className="rounded-md bg-white px-2 py-1">{product.category_name}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {price !== null ? (
                      <span className="font-semibold text-[#222222]">Từ {formatCurrency(price)}</span>
                    ) : (
                      <span className="text-sm font-semibold text-[#A94B4B]">Chưa có phiên bản đang bán</span>
                    )}
                    {variants.length > 0 && (
                      <Button
                        size="sm"
                        variant="secondary"
                        aria-expanded={expanded}
                        aria-label={`Chọn phiên bản ${product.name}`}
                        onClick={() => {
                          setExpandedId(expanded ? null : product.product_id)
                          setChosen(null)
                        }}
                      >
                        {expanded ? 'Đóng' : 'Chọn phiên bản'}
                      </Button>
                    )}
                  </div>
                  {expanded && (
                    <div className="grid gap-3 rounded-lg bg-white p-3">
                      <ProductVariantChooser
                        variants={variants}
                        selectedVariantId={chosen?.variant_id ?? null}
                        disabledVariantIds={disabledVariantIds}
                        onSelect={setChosen}
                      />
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          aria-label={`Thêm ${product.name} vào outfit`}
                          disabled={!chosen || addDisabled}
                          loading={adding}
                          onClick={() => {
                            if (!chosen) return
                            onAdd(product, chosen)
                            setChosen(null)
                          }}
                        >
                          Thêm vào outfit
                        </Button>
                        {addDisabled && addDisabledReason && <span className="text-sm text-[#6F6B67]">{addDisabledReason}</span>}
                      </div>
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {status === 'ready' && error !== null && (
        <p role="alert" className="text-sm font-semibold text-[#A94B4B]">
          {wardrobeErrorMessage(error, 'Không tải thêm được sản phẩm.')}
        </p>
      )}
      {status === 'ready' && hasMore && (
        <div>
          <Button variant="secondary" loading={loadingMore} onClick={loadMore}>
            Tải thêm
          </Button>
        </div>
      )}
    </section>
  )
}
