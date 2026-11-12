import type { Product } from '@/entities/product/model/types'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { Plus, Shirt } from 'lucide-react'

import { defaultVariantOf } from '../model/draftOutfit'

export interface BuilderCategoryOption {
  id: string
  label: string
}

export interface BuilderPagination {
  /** 1-based. */
  page: number
  totalPages: number
  total: number
}

interface BuilderCatalogPanelProps {
  products: Product[]
  loading?: boolean
  error?: string
  onRetry?: () => void
  search: string
  onSearchChange: (value: string) => void
  categories: BuilderCategoryOption[]
  selectedCategoryIds: string[]
  onToggleCategory: (categoryId: string) => void
  onClearCategories: () => void
  pagination: BuilderPagination
  onPageChange: (page: number) => void
  /** Products already in the draft: they are not added twice. */
  draftProductIds: ReadonlySet<string>
  onAddProduct: (product: Product) => void
}

const chipClass = (active: boolean) =>
  `inline-flex min-h-9 items-center rounded-full border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B1B]/30 ${active ? 'border-[#1C1B1B] bg-[#1C1B1B] text-white' : 'border-[#C4C7C7] bg-white text-[#3A3632] hover:border-[#1C1B1B]'}`

export function BuilderCatalogPanel({
  products,
  loading = false,
  error = '',
  onRetry,
  search,
  onSearchChange,
  categories,
  selectedCategoryIds,
  onToggleCategory,
  onClearCategories,
  pagination,
  onPageChange,
  draftProductIds,
  onAddProduct,
}: BuilderCatalogPanelProps) {
  return (
    <section className="grid min-h-0 min-w-0 content-start gap-5 rounded-xl border border-[#E3E2E2] bg-white p-5 md:p-7">
      <div>
        <h2 className="font-display text-2xl font-semibold text-[#222222]">Catalog sản phẩm</h2>
        <p className="mt-2 text-sm leading-6 text-[#5E5F5D]">
          Chọn các món đang hoạt động để ghép outfit riêng của bạn.
        </p>
      </div>

      <label className="grid gap-2 text-sm font-semibold text-[#3A3632]">
        Tìm sản phẩm cho outfit
        <input
          value={search}
          onChange={event => onSearchChange(event.target.value)}
          className="min-h-11 rounded-lg border border-[#C4C7C7] bg-white px-3 text-sm font-medium text-[#222222] outline-none transition focus:border-[#1C1B1B] focus:ring-2 focus:ring-[#1C1B1B]/20"
          placeholder="Nhập tên, chất liệu hoặc phong cách"
        />
      </label>

      {categories.length > 0 && (
        <div role="group" aria-label="Lọc theo danh mục" className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={selectedCategoryIds.length === 0} className={chipClass(selectedCategoryIds.length === 0)} onClick={onClearCategories}>
            Tất cả
          </button>
          {categories.map(category => {
            const active = selectedCategoryIds.includes(category.id)
            return (
              <button key={category.id} type="button" aria-pressed={active} className={chipClass(active)} onClick={() => onToggleCategory(category.id)}>
                {category.label}
              </button>
            )
          })}
        </div>
      )}

      {error ? (
        <div role="alert" className="rounded-lg border border-[#E3E2E2] bg-white p-4 text-sm text-[#A94B4B]">
          {error}{' '}
          {onRetry && <button type="button" className="font-semibold underline" onClick={onRetry}>Thử lại</button>}
        </div>
      ) : loading && products.length === 0 ? (
        <p role="status" className="text-sm text-[#5E5F5D]">Đang tải sản phẩm…</p>
      ) : products.length === 0 ? (
        <div className="rounded-lg bg-[#FBF9F9] px-4 py-6 text-sm font-medium text-[#5E5F5D]">
          Không có sản phẩm phù hợp.
        </div>
      ) : (
        <div className={`grid gap-3 transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
          {products.map(product => {
            const variantCount = product.variants.filter(variant => variant.active).length
            const defaultVariant = defaultVariantOf(product)
            const image = defaultVariant?.images.find(item => item.isPrimary) ?? defaultVariant?.images[0]
            const inDraft = draftProductIds.has(product.id)

            return (
              <article
                key={product.id}
                className="grid min-w-0 grid-cols-[80px_minmax(0,1fr)] gap-4 rounded-lg border border-[#E3E2E2] bg-white p-3 sm:grid-cols-[96px_minmax(0,1fr)]"
              >
                {image ? (
                  <img
                    src={image.url}
                    alt={image.alt}
                    className="aspect-[4/5] w-full rounded-md object-cover sm:w-24"
                  />
                ) : <div className="grid aspect-[4/5] place-items-center rounded-md bg-[#F5F3F3] text-[#C4C7C7]"><Shirt size={28} aria-hidden="true" /></div>}
                <div className="grid min-w-0 gap-3">
                  <div>
                    <h3 className="break-words font-semibold text-[#222222]">{product.name}</h3>
                    <p className="mt-1 text-sm text-[#5E5F5D]">{product.brand}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#5E5F5D]">
                      {product.categoryName && <span className="rounded-md bg-[#F5F3F3] px-2 py-1">{product.categoryName}</span>}
                      <span className="rounded-md bg-[#F5F3F3] px-2 py-1">{variantCount} phiên bản</span>
                      {inDraft && <span className="rounded-md bg-[#EFEDED] px-2 py-1 text-[#222222]">Đã có trong outfit</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-semibold text-[#222222]">{formatCurrency(product.basePrice)}</span>
                    <button
                      type="button"
                      aria-label={`Thêm ${product.name} vào outfit`}
                      className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg bg-[#1C1B1B] px-3 text-sm font-semibold text-white transition hover:bg-[#563E4A] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B1B]/30"
                      onClick={() => onAddProduct(product)}
                    >
                      <Plus size={15} aria-hidden="true" /> Thêm
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {!error && (products.length > 0 || pagination.total > 0) && (
        <nav aria-label="Phân trang catalog sản phẩm" className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E3E2E2] pt-4 text-sm">
          <button type="button" disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)} className="min-h-10 rounded-lg border px-3 disabled:opacity-40">Trang trước</button>
          <span aria-live="polite">Trang {pagination.page} / {pagination.totalPages} · {pagination.total} sản phẩm</span>
          <button type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => onPageChange(pagination.page + 1)} className="min-h-10 rounded-lg border px-3 disabled:opacity-40">Trang sau</button>
        </nav>
      )}
    </section>
  )
}
