import type { CatalogVariant } from '@/shared/api/commerceCatalogApi'
import { commerceImageUrl } from '@/shared/lib/commerceImageUrl'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { Button } from '@/shared/ui'

import { draftTotal, MAX_DRAFT_ITEMS, type OutfitDraft, type OutfitDraftErrors } from '../model/draftOutfit'

interface BuilderDraftPanelProps {
  draft: OutfitDraft
  errors: OutfitDraftErrors
  saving: boolean
  saveError: string
  onNameChange: (name: string) => void
  onVariantChange: (variantId: string, next: CatalogVariant) => void
  onRemoveItem: (variantId: string) => void
  onSave: () => void
}

const variantLabel = (variant: { color: string | null; size: string | null }) =>
  `${variant.color || 'Mặc định'} · ${variant.size || 'Một cỡ'}`

export function BuilderDraftPanel({ draft, errors, saving, saveError, onNameChange, onVariantChange, onRemoveItem, onSave }: BuilderDraftPanelProps) {
  const draftVariantIds = new Set(draft.items.map(item => item.variantId))

  return (
    <section
      aria-label="Outfit đang tạo"
      className="grid h-fit gap-5 rounded-lg border border-[#E3DAD0] bg-white p-4 shadow-sm md:p-5"
    >
      <div>
        <h2 className="font-display text-2xl font-semibold text-[#222222]">Outfit đang tạo</h2>
        <p className="mt-2 text-sm leading-6 text-[#6F6B67]">
          Đặt tên, kiểm tra phiên bản từng món rồi lưu vào tủ đồ (tối đa {MAX_DRAFT_ITEMS} món).
        </p>
      </div>

      <label className="grid gap-2 text-sm font-semibold text-[#3A3632]">
        Tên outfit
        <input
          value={draft.name}
          onChange={event => onNameChange(event.target.value)}
          disabled={saving}
          aria-invalid={errors.name ? true : undefined}
          className="min-h-11 rounded-lg border border-[#D8D0C6] bg-white px-3 text-sm font-medium text-[#222222] outline-none transition focus:border-[#684B5A] focus:ring-2 focus:ring-[#684B5A]/20 disabled:opacity-60"
          placeholder="Ví dụ: Outfit đi chơi"
        />
        {errors.name && <span className="text-xs font-medium text-[#A94B4B]">{errors.name}</span>}
      </label>

      <div className="grid gap-3">
        {draft.items.length === 0 ? (
          <div className="rounded-lg bg-[#FAF8F5] px-4 py-6 text-sm font-medium text-[#6F6B67]">Chưa có món nào trong outfit</div>
        ) : (
          draft.items.map(item => {
            const image = commerceImageUrl(item.imageUrl)
            return (
              <article key={item.variantId} className={`rounded-lg p-4 ${item.discontinued ? 'border border-dashed border-[#A94B4B] bg-[#FFF8F8]' : 'bg-[#FAF8F5]'}`}>
                <div className="flex items-start gap-3">
                  {image ? (
                    <img src={image} alt={item.imageAlt || item.productName} className="h-20 w-16 flex-none rounded-md object-cover" />
                  ) : (
                    <div role="img" aria-label={`Chưa có ảnh ${item.productName}`} className="grid h-20 w-16 flex-none place-items-center rounded-md bg-[#EEE8E1] text-[10px] font-semibold text-[#8A8179]">
                      Chưa có ảnh
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[#222222]">{item.productName}</h3>
                    <p className="mt-1 text-sm text-[#6F6B67]">{variantLabel(item)}</p>
                    {item.discontinued && <p className="mt-1 text-sm font-semibold text-[#A94B4B]">Ngừng bán</p>}
                  </div>
                </div>

                {item.alternatives.length > 1 && (
                  <label className="mt-4 grid gap-2 text-sm font-semibold text-[#3A3632]">
                    Đổi phiên bản draft {item.productName}
                    <select
                      value={item.variantId}
                      disabled={saving}
                      onChange={event => {
                        const next = item.alternatives.find(variant => variant.variant_id === event.target.value)
                        if (next) onVariantChange(item.variantId, next)
                      }}
                      className="min-h-10 rounded-lg border border-[#D8D0C6] bg-white px-3 text-sm font-semibold text-[#222222] outline-none focus:border-[#684B5A] focus:ring-2 focus:ring-[#684B5A]/20"
                    >
                      {item.discontinued && <option value={item.variantId}>{variantLabel(item)} (ngừng bán)</option>}
                      {item.alternatives.map(variant => (
                        <option
                          key={variant.variant_id}
                          value={variant.variant_id}
                          disabled={variant.variant_id !== item.variantId && draftVariantIds.has(variant.variant_id)}
                        >
                          {variantLabel(variant)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-[#222222]">{formatCurrency(item.unitPriceVnd)}</span>
                  <Button variant="danger-soft" size="sm" disabled={saving} onClick={() => onRemoveItem(item.variantId)}>
                    Xóa {item.productName} khỏi draft
                  </Button>
                </div>
              </article>
            )
          })
        )}
        {errors.items && <span className="text-xs font-medium text-[#A94B4B]">{errors.items}</span>}
      </div>

      {saveError && (
        <p role="alert" className="rounded-lg border border-[#E3DAD0] bg-white px-4 py-3 text-sm font-semibold text-[#A94B4B]">
          {saveError}
        </p>
      )}

      <div className="rounded-lg bg-[#EEE8E1] p-4">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="font-medium text-[#6F6B67]">Tạm tính</span>
          <span className="font-semibold text-[#222222]">{formatCurrency(draftTotal(draft))}</span>
        </div>
        <Button className="mt-4 w-full" disabled={saving} loading={saving} onClick={onSave}>
          Lưu outfit
        </Button>
      </div>
    </section>
  )
}
