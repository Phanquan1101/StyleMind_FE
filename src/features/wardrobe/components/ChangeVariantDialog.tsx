import { useEffect, useState } from 'react'

import { ProductVariantChooser } from '@/features/outfit-builder'
import { commerceCatalogApi, type CatalogProduct, type CatalogVariant } from '@/shared/api/commerceCatalogApi'
import { IdentityApiError } from '@/shared/api/identityApi'
import { wardrobeErrorMessage, type OutfitItemView } from '@/shared/api/wardrobeApi'
import { Button, LoadingSkeleton, Modal } from '@/shared/ui'

interface ChangeVariantDialogProps {
  item: OutfitItemView
  /** Variants used by the other items of the outfit. */
  takenVariantIds: ReadonlySet<string>
  saving: boolean
  error: string
  /** True after OUTFIT_ITEM_UNAVAILABLE: the variant is gone, so offer to remove the item instead. */
  suggestRemoval: boolean
  /** The last item cannot be removed, so no removal suggestion is offered for it. */
  canRemove: boolean
  onSave: (variantId: string) => void
  onRemoveItem: () => void
  onClose: () => void
}

type ProductState =
  | { status: 'loading' }
  | { status: 'ready'; variants: CatalogVariant[] }
  | { status: 'gone' }
  | { status: 'error'; error: unknown }

/** Lists the ACTIVE variants of the same product (colour/size) and switches the outfit item to the chosen one. */
export function ChangeVariantDialog({ item, takenVariantIds, saving, error, suggestRemoval, canRemove, onSave, onRemoveItem, onClose }: ChangeVariantDialogProps) {
  const [product, setProduct] = useState<ProductState>({ status: 'loading' })
  const [chosen, setChosen] = useState<CatalogVariant | null>(null)
  const [attempt, setAttempt] = useState(0)
  const productId = item.product_id
  const name = item.product_name ?? 'sản phẩm'

  useEffect(() => {
    if (!productId) return undefined
    const controller = new AbortController()
    setProduct({ status: 'loading' })
    setChosen(null)
    commerceCatalogApi
      .getProduct(productId, controller.signal)
      .then((response: CatalogProduct) => {
        if (controller.signal.aborted) return
        const variants = response.variants.filter(variant => variant.variant_status === 'ACTIVE' && variant.product_id === productId)
        setProduct({ status: 'ready', variants })
      })
      .catch(caught => {
        if (controller.signal.aborted) return
        setProduct(caught instanceof IdentityApiError && caught.status === 404 ? { status: 'gone' } : { status: 'error', error: caught })
      })
    return () => controller.abort()
  }, [productId, attempt])

  const removeSuggestion = canRemove && (product.status === 'gone' || (product.status === 'ready' && product.variants.length === 0) || suggestRemoval)

  return (
    <Modal
      open
      title={`Đổi màu/size ${name}`}
      description="Chỉ hiện các phiên bản đang bán của cùng sản phẩm."
      onClose={saving ? () => undefined : onClose}
      footer={
        <>
          <Button variant="secondary" disabled={saving} onClick={onClose}>
            Hủy
          </Button>
          <Button disabled={!chosen || saving} loading={saving} onClick={() => chosen && onSave(chosen.variant_id)}>
            Lưu thay đổi
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {product.status === 'loading' && (
          <div aria-busy="true" aria-label="Đang tải phiên bản" className="grid gap-3">
            <LoadingSkeleton className="h-10" />
            <LoadingSkeleton className="h-10" />
          </div>
        )}
        {product.status === 'error' && (
          <div role="alert" className="grid justify-items-start gap-3">
            <p className="text-sm font-semibold text-[#A94B4B]">{wardrobeErrorMessage(product.error, 'Không tải được các phiên bản của sản phẩm.')}</p>
            <Button variant="secondary" onClick={() => setAttempt(value => value + 1)}>
              Thử lại
            </Button>
          </div>
        )}
        {product.status === 'gone' && <p className="text-sm font-semibold text-[#A94B4B]">Sản phẩm này không còn bán.</p>}
        {product.status === 'ready' && product.variants.length === 0 && (
          <p className="text-sm font-semibold text-[#A94B4B]">Sản phẩm này không còn phiên bản nào đang bán.</p>
        )}
        {product.status === 'ready' && product.variants.length > 0 && (
          <ProductVariantChooser
            variants={product.variants}
            selectedVariantId={chosen?.variant_id ?? null}
            disabledVariantIds={takenVariantIds}
            currentVariantId={item.variant_id}
            onSelect={setChosen}
          />
        )}
        {error && (
          <p role="alert" className="rounded-lg border border-[#E3DAD0] bg-white px-4 py-3 text-sm font-semibold text-[#A94B4B]">
            {error}
          </p>
        )}
        {removeSuggestion && (
          <div>
            <Button variant="danger-soft" size="sm" disabled={saving} onClick={onRemoveItem}>
              Xóa món này khỏi outfit
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
