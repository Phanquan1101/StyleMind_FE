import { ProductPicker } from '@/features/outfit-builder'
import { Button } from '@/shared/ui'

import { OUTFIT_MAX_ITEMS } from '../model/backendOutfit'

interface AddOutfitItemPanelProps {
  /** Variants already in the outfit. */
  variantIds: ReadonlySet<string>
  full: boolean
  adding: boolean
  error: string
  onAdd: (variantId: string) => void
  onClose: () => void
}

/** Inline "Thêm món" section: the same catalog picker as the builder, adding one variant at a time to an existing outfit. */
export function AddOutfitItemPanel({ variantIds, full, adding, error, onAdd, onClose }: AddOutfitItemPanelProps) {
  return (
    <section aria-label="Thêm món vào outfit" className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold text-[#222222]">Thêm món vào outfit</h2>
        <Button variant="ghost" size="sm" disabled={adding} onClick={onClose}>
          Đóng
        </Button>
      </div>
      {error && (
        <p role="alert" className="rounded-lg border border-[#E3DAD0] bg-white px-4 py-3 text-sm font-semibold text-[#A94B4B]">
          {error}
        </p>
      )}
      <ProductPicker
        disabledVariantIds={variantIds}
        addDisabled={full || adding}
        addDisabledReason={full ? `Outfit đã đủ ${OUTFIT_MAX_ITEMS} món.` : undefined}
        adding={adding}
        onAdd={(_product, variant) => onAdd(variant.variant_id)}
      />
    </section>
  )
}
