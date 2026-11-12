import { Shirt } from 'lucide-react'
import { useEffect, useRef } from 'react'

import type { Product } from '@/entities/product/model/types'
import { ColorSelector } from '@/features/product-detail/components/ColorSelector'
import { SizeSelector } from '@/features/product-detail/components/SizeSelector'
import { getProductSelection } from '@/features/product-detail/model/productSelection'
import { formatCurrency } from '@/shared/lib/formatCurrency'

import {
  groupDraftItemsByCategory,
  isDraftItemUnavailable,
  type OutfitDraft,
  type OutfitDraftErrors,
  type OutfitDraftItem,
} from '../model/draftOutfit'

/** Asks the panel to scroll to and highlight an item. `nonce` changes on every request so the same item can be asked twice. */
export interface DraftHighlight {
  itemId: string
  nonce: number
}

interface BuilderDraftPanelProps {
  draft: OutfitDraft
  errors: OutfitDraftErrors
  highlight?: DraftHighlight | null
  onNameChange: (value: string) => void
  onVariantChange: (itemId: string, variantId: string) => void
  onRemoveItem: (itemId: string) => void
  onSave: () => void
  saving?: boolean
}

function itemPrice(item: OutfitDraftItem) {
  const variant = item.product.variants.find(candidate => candidate.id === item.variantId)
  return variant?.priceOverride ?? item.product.basePrice
}

function variantIdFor(product: Product, color: string, size: string) {
  return product.variants.find(variant => variant.active && variant.color === color && variant.size === size)?.id
}

interface DraftItemCardProps {
  item: OutfitDraftItem
  highlighted: boolean
  register: (itemId: string, element: HTMLElement | null) => void
  onVariantChange: (itemId: string, variantId: string) => void
  onRemoveItem: (itemId: string) => void
}

function DraftItemCard({ item, highlighted, register, onVariantChange, onRemoveItem }: DraftItemCardProps) {
  const { product } = item
  const variant = product.variants.find(candidate => candidate.id === item.variantId)
  const unavailable = isDraftItemUnavailable(item)
  const selection = getProductSelection(product, { color: variant?.color ?? '', size: variant?.size ?? null })
  const image = selection.images[0]

  const changeColor = (color: string) => {
    const sizes = getProductSelection(product, { color }).sizeOptions.filter(option => option.available)
    // Keep the chosen size when the new colour has it, otherwise the first size still in stock.
    const next = sizes.find(option => option.size === variant?.size) ?? sizes.find(option => option.stock > 0) ?? sizes[0]
    const nextId = next ? variantIdFor(product, color, next.size) : undefined
    if (nextId) onVariantChange(item.id, nextId)
  }

  const changeSize = (size: string) => {
    const nextId = variantIdFor(product, selection.selectedColor, size)
    if (nextId) onVariantChange(item.id, nextId)
  }

  return (
    <article
      ref={element => register(item.id, element)}
      aria-label={product.name}
      data-draft-item={item.id}
      className={`grid gap-3 rounded-lg bg-[#FBF9F9] p-3 transition ${highlighted ? 'ring-2 ring-[#1C1B1B]' : ''} ${unavailable ? 'border border-[#A94B4B]' : ''}`}
    >
      <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-3">
        {image
          ? <img src={image.url} alt="" className="aspect-[3/4] w-14 rounded-md bg-[#F5F3F3] object-cover" />
          : <span className="grid aspect-[3/4] w-14 place-items-center rounded-md bg-[#F5F3F3] text-[#C4C7C7]"><Shirt size={22} strokeWidth={1.25} aria-hidden="true" /></span>}
        <div className="min-w-0">
          <h4 className="break-words text-sm font-semibold text-[#222222]">{product.name}</h4>
          {product.brand && <p className="mt-0.5 truncate text-xs text-[#5E5F5D]">{product.brand}</p>}
          <p className="mt-1 text-sm font-semibold text-[#222222]">{formatCurrency(itemPrice(item))}</p>
        </div>
      </div>

      {unavailable && (
        <p role="alert" className="rounded-md bg-[#FCEAEA] px-3 py-2 text-xs font-medium text-[#A94B4B]">
          Phiên bản này không còn bán. Hãy chọn lại màu/size hoặc xóa món này để lưu được outfit.
        </p>
      )}
      {highlighted && (
        <p role="status" className="rounded-md bg-[#EFEDED] px-3 py-2 text-xs font-medium text-[#222222]">
          Đã có trong outfit, đổi màu/size tại đây.
        </p>
      )}

      <ColorSelector compact label="Màu" options={selection.colorOptions} selectedColor={unavailable && !variant?.active ? '' : selection.selectedColor} onChange={changeColor} />
      <SizeSelector compact dimOutOfStock label="Size" options={selection.sizeOptions} selectedSize={variant?.active ? variant.size : null} onChange={changeSize} />

      <div className="flex justify-end">
        <button
          type="button"
          aria-label={`Xóa ${product.name} khỏi outfit`}
          className="inline-flex min-h-9 items-center justify-center rounded-lg bg-[#FCEAEA] px-3 text-sm font-semibold text-[#A94B4B] transition hover:bg-[#F7D8D8] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94B4B]/30"
          onClick={() => onRemoveItem(item.id)}
        >
          Xóa
        </button>
      </div>
    </article>
  )
}

export function BuilderDraftPanel({
  draft,
  errors,
  highlight = null,
  onNameChange,
  onVariantChange,
  onRemoveItem,
  onSave,
  saving = false,
}: BuilderDraftPanelProps) {
  const elements = useRef(new Map<string, HTMLElement>())
  const register = (itemId: string, element: HTMLElement | null) => {
    if (element) elements.current.set(itemId, element)
    else elements.current.delete(itemId)
  }

  useEffect(() => {
    if (highlight) elements.current.get(highlight.itemId)?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }, [highlight])

  const groups = groupDraftItemsByCategory(draft.items)
  const total = draft.items.filter(item => !isDraftItemUnavailable(item)).reduce((sum, item) => sum + itemPrice(item), 0)

  return (
    <section
      aria-label="Outfit đang tạo"
      className="grid h-fit min-w-0 gap-5 rounded-xl border border-[#E3E2E2] bg-white p-5 md:p-7"
    >
      <div>
        <h2 className="font-display text-2xl font-semibold text-[#222222]">Outfit đang tạo</h2>
        <p className="mt-2 text-sm leading-6 text-[#5E5F5D]">
          Đặt tên, chọn màu và size từng món rồi lưu vào tủ đồ.
        </p>
      </div>

      <label className="grid gap-2 text-sm font-semibold text-[#3A3632]">
        Tên outfit
        <input
          value={draft.name}
          onChange={event => onNameChange(event.target.value)}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? 'draft-name-error' : undefined}
          className={`min-h-11 rounded-lg border bg-white px-3 text-sm font-medium text-[#222222] outline-none transition focus:ring-2 ${errors.name ? 'border-[#A94B4B] focus:border-[#A94B4B] focus:ring-[#A94B4B]/20' : 'border-[#C4C7C7] focus:border-[#1C1B1B] focus:ring-[#1C1B1B]/20'}`}
          placeholder="Ví dụ: Outfit đi chơi"
        />
        {errors.name && <span id="draft-name-error" className="text-xs font-medium text-[#A94B4B]">{errors.name}</span>}
      </label>

      <div
        role="group"
        aria-label="Các món trong outfit"
        tabIndex={-1}
        aria-invalid={errors.items ? true : undefined}
        aria-describedby={errors.items ? 'draft-items-error' : undefined}
        className={`grid gap-4 rounded-lg focus:outline-none ${errors.items ? 'border border-[#A94B4B] p-3' : ''}`}
      >
        {draft.items.length === 0 ? (
          <div className="rounded-lg bg-[#FBF9F9] px-4 py-6 text-sm font-medium text-[#5E5F5D]">
            Chưa có món nào trong outfit
          </div>
        ) : (
          groups.map(group => (
            <section key={group.key} aria-label={`${group.name} (${group.items.length})`} className="grid gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[#5E5F5D]">{group.name} ({group.items.length})</h3>
              {group.items.map(item => (
                <DraftItemCard
                  key={item.id}
                  item={item}
                  highlighted={highlight?.itemId === item.id}
                  register={register}
                  onVariantChange={onVariantChange}
                  onRemoveItem={onRemoveItem}
                />
              ))}
            </section>
          ))
        )}
        {errors.items && <span id="draft-items-error" className="text-xs font-medium text-[#A94B4B]">{errors.items}</span>}
      </div>

      <div className="rounded-lg bg-[#EFEDED] p-4">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="font-medium text-[#5E5F5D]">Tạm tính</span>
          <span className="font-semibold text-[#222222]">{formatCurrency(total)}</span>
        </div>
        <button
          type="button"
          disabled={saving}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#1C1B1B] px-4 text-sm font-semibold text-white transition hover:bg-[#563E4A] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B1B]/30"
          onClick={onSave}
        >
          Lưu outfit
        </button>
      </div>
    </section>
  )
}
