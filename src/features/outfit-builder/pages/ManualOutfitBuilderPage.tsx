import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { commerceCatalogApi, type CatalogProduct, type CatalogVariant } from '@/shared/api/commerceCatalogApi'
import { IdentityApiError } from '@/shared/api/identityApi'
import { wardrobeApi, wardrobeErrorMessage } from '@/shared/api/wardrobeApi'

import { BuilderDraftPanel } from '../components/BuilderDraftPanel'
import { ProductPicker } from '../components/ProductPicker'
import {
  addDraftItem,
  changeDraftVariant,
  createManualOutfitDraft,
  markDiscontinued,
  MAX_DRAFT_ITEMS,
  removeDraftItem,
  validateOutfitDraft,
  type OutfitDraftErrors,
} from '../model/draftOutfit'

export function ManualOutfitBuilderPage() {
  const navigate = useNavigate()
  const [draft, setDraft] = useState(createManualOutfitDraft)
  const [errors, setErrors] = useState<OutfitDraftErrors>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [pickerMessage, setPickerMessage] = useState('')
  const saveInFlight = useRef(false)
  const draftVariantIds = useMemo(() => new Set(draft.items.map(item => item.variantId)), [draft.items])
  const full = draft.items.length >= MAX_DRAFT_ITEMS

  const addVariant = (product: CatalogProduct, variant: CatalogVariant) => {
    const result = addDraftItem(draft, product, variant)
    setErrors(previous => ({ ...previous, items: undefined }))
    setSaveError('')
    if (result.added) {
      setDraft(result.draft)
      setPickerMessage('')
      return
    }
    setPickerMessage(result.reason === 'full' ? `Outfit đã đủ ${MAX_DRAFT_ITEMS} món.` : 'Món này đã có trong outfit.')
  }

  const changeName = (name: string) => {
    setErrors(previous => ({ ...previous, name: undefined }))
    setDraft(previous => ({ ...previous, name }))
  }

  const changeVariant = (variantId: string, next: CatalogVariant) => {
    setErrors(previous => ({ ...previous, items: undefined }))
    setDraft(previous => changeDraftVariant(previous, variantId, next))
  }

  const removeItem = (variantId: string) => {
    setErrors(previous => ({ ...previous, items: undefined }))
    setDraft(previous => removeDraftItem(previous, variantId))
  }

  /** Commerce did not say which variant is gone, so ask the public lookup and mark the missing ones. */
  const markDiscontinuedItems = async () => {
    const active = await commerceCatalogApi.lookupVariants(draft.items.map(item => item.variantId))
    const activeIds = new Set(active.map(variant => variant.variant_id))
    if (draft.items.every(item => activeIds.has(item.variantId))) return false
    setDraft(previous => markDiscontinued(previous, activeIds))
    return true
  }

  const saveOutfit = async () => {
    if (saveInFlight.current) return
    const nextErrors = validateOutfitDraft(draft)
    setErrors(nextErrors)
    setSaveError('')
    if (Object.keys(nextErrors).length > 0) return

    saveInFlight.current = true
    setSaving(true)
    try {
      const created = await wardrobeApi.createOutfit({
        name: draft.name.trim(),
        creation_source: 'MANUAL',
        items: draft.items.map(item => ({ variant_id: item.variantId })),
      })
      navigate(`/outfits/${created.outfit_id}`)
    } catch (caught) {
      if (caught instanceof IdentityApiError && caught.code === 'VARIANT_NOT_ACTIVE') {
        let marked = false
        try {
          marked = await markDiscontinuedItems()
        } catch {
          marked = false
        }
        setSaveError(
          marked
            ? 'Một số món đã ngừng bán. Hãy xóa hoặc đổi phiên bản các món được đánh dấu rồi lưu lại.'
            : wardrobeErrorMessage(caught, 'Không lưu được outfit.'),
        )
      } else {
        setSaveError(wardrobeErrorMessage(caught, 'Không lưu được outfit. Vui lòng thử lại.'))
      }
    } finally {
      saveInFlight.current = false
      setSaving(false)
    }
  }

  return (
    <section className="mx-auto grid max-w-[var(--container-wide)] gap-8 px-5 py-8 md:px-8 md:py-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Link to={ROUTES.wardrobes} className="text-sm font-semibold text-[#684B5A] hover:underline">
            Tủ đồ
          </Link>
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-[#222222]">
            Tạo outfit thủ công
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6F6B67]">
            Chọn sản phẩm thật trong catalog, chọn màu và size rồi lưu vào tủ đồ cá nhân.
          </p>
        </div>
        {/* TODO: mở lại "Chuyển sang AI Stylist" khi có AI Stylist BE. */}
      </div>

      {pickerMessage && (
        <p role="status" className="rounded-lg border border-[#E3DAD0] bg-white px-4 py-3 text-sm font-semibold text-[#A94B4B]">
          {pickerMessage}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
        <ProductPicker
          disabledVariantIds={draftVariantIds}
          addDisabled={full || saving}
          addDisabledReason={full ? `Outfit đã đủ ${MAX_DRAFT_ITEMS} món.` : undefined}
          onAdd={addVariant}
        />
        <BuilderDraftPanel
          draft={draft}
          errors={errors}
          saving={saving}
          saveError={saveError}
          onNameChange={changeName}
          onVariantChange={changeVariant}
          onRemoveItem={removeItem}
          onSave={() => void saveOutfit()}
        />
      </div>
    </section>
  )
}
