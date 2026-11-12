import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { useDemoStore } from '@/app/store/DemoStoreProvider'
import { useAuth } from '@/features/auth'
import { outfitErrorMessage } from '@/features/sharing/model/outfitErrors'
import type { Product } from '@/entities/product/model/types'
import { communityApi } from '@/shared/api/communityApi'
import { apiMode } from '@/shared/api/http'
import { focusFirstInvalid } from '@/shared/lib/apiFieldErrors'
import { ArrowLeft, Sparkles } from 'lucide-react'

import { BuilderCatalogPanel } from '../components/BuilderCatalogPanel'
import { BuilderDraftPanel, type DraftHighlight } from '../components/BuilderDraftPanel'
import {
  createDraftItem,
  createManualOutfitDraft,
  defaultVariantOf,
  draftToOutfit,
  validateOutfitDraft,
  type OutfitDraftErrors,
} from '../model/draftOutfit'
import { useBuilderCatalog } from '../model/useBuilderCatalog'

const MAX_ITEMS = 10
const HIGHLIGHT_MS = 3000

export function ManualOutfitBuilderPage() {
  const navigate = useNavigate()
  const { state, dispatch } = useDemoStore()
  const { currentUser } = useAuth()
  const ownerId = currentUser?.id ?? ''
  const realMode = apiMode()
  const [draft, setDraft] = useState(() => createManualOutfitDraft(ownerId))
  const [errors, setErrors] = useState<OutfitDraftErrors>({})
  const [focusTick, setFocusTick] = useState(0)
  const [highlight, setHighlight] = useState<DraftHighlight | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const savingLock = useRef(false)
  const activeOwner = useRef(ownerId)
  activeOwner.current = ownerId
  const panelRef = useRef<HTMLDivElement>(null)
  const highlightTimer = useRef<number | undefined>(undefined)
  const nonce = useRef(0)

  const demoCategories = useMemo(
    () => (state.categories ?? []).filter(category => category.active).map(category => ({ id: category.id, label: category.label })),
    [state.categories],
  )
  const catalog = useBuilderCatalog({ realMode, demoProducts: state.products ?? [], demoCategories })
  const categoryLabels = useMemo(() => new Map((state.categories ?? []).map(category => [category.id, category.label])), [state.categories])

  useEffect(() => {
    if (!ownerId) return
    setDraft(previous => (previous.ownerId === ownerId ? previous : createManualOutfitDraft(ownerId)))
  }, [ownerId])

  useEffect(() => () => window.clearTimeout(highlightTimer.current), [])

  // Fresh catalog data replaces the snapshot of products already in the draft (a variant may have been switched off).
  const loadedProducts = catalog.products
  useEffect(() => {
    if (!realMode || loadedProducts.length === 0) return
    const fresh = new Map(loadedProducts.map(product => [product.id, product]))
    setDraft(previous => (previous.items.some(item => fresh.has(item.productId))
      ? { ...previous, items: previous.items.map(item => ({ ...item, product: fresh.get(item.productId) ?? item.product })) }
      : previous))
  }, [realMode, loadedProducts])

  useEffect(() => {
    if (focusTick > 0) focusFirstInvalid(panelRef.current)
  }, [focusTick])

  if (!currentUser) return null

  const draftProductIds = new Set(draft.items.map(item => item.productId))

  const showHighlight = (itemId: string) => {
    nonce.current += 1
    setHighlight({ itemId, nonce: nonce.current })
    window.clearTimeout(highlightTimer.current)
    highlightTimer.current = window.setTimeout(() => setHighlight(null), HIGHLIGHT_MS)
  }

  const addProduct = (product: Product) => {
    const existing = draft.items.find(item => item.productId === product.id)
    if (existing) {
      // The same product is never added twice: point at the item so its colour/size can be changed instead.
      showHighlight(existing.id)
      return
    }
    const variant = defaultVariantOf(product)
    if (!variant) return
    if (draft.items.length >= MAX_ITEMS) {
      setErrors(previous => ({ ...previous, items: `Mỗi outfit tối đa ${MAX_ITEMS} món` }))
      return
    }
    const snapshot: Product = { ...product, categoryName: product.categoryName ?? categoryLabels.get(product.categoryId) }
    setErrors(previous => ({ ...previous, items: undefined }))
    setDraft(previous => (previous.items.some(item => item.productId === product.id)
      ? previous
      : { ...previous, items: [...previous.items, createDraftItem(snapshot, variant.id)] }))
  }

  const changeName = (name: string) => {
    setErrors(previous => ({ ...previous, name: undefined }))
    setDraft(previous => ({ ...previous, name }))
  }

  const changeVariant = (itemId: string, variantId: string) => {
    setErrors(previous => ({ ...previous, items: undefined }))
    setDraft(previous => ({
      ...previous,
      items: previous.items.map(item => (item.id === itemId ? { ...item, variantId } : item)),
    }))
  }

  const removeItem = (itemId: string) => {
    setDraft(previous => ({
      ...previous,
      items: previous.items.filter(item => item.id !== itemId),
    }))
  }

  const saveOutfit = async () => {
    if (savingLock.current) return
    const nextErrors = validateOutfitDraft(draft)
    if (realMode && [...draft.name.trim()].length > 100) nextErrors.name = 'Tên outfit tối đa 100 ký tự'
    if (realMode && draft.items.length > MAX_ITEMS) nextErrors.items = `Mỗi outfit tối đa ${MAX_ITEMS} món`
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setFocusTick(value => value + 1)
      return
    }

    if (realMode) {
      savingLock.current = true; setSaving(true); setSaveError('')
      try {
        const created = await communityApi.createOutfit(draft.name.trim(), draft.items.map(item => item.variantId))
        if (activeOwner.current === ownerId) navigate(`/outfits/${created.outfit_id}`)
      } catch (error) {
        if (activeOwner.current === ownerId) setSaveError(outfitErrorMessage(error, 'Không lưu được outfit. Vui lòng thử lại.'))
      } finally { savingLock.current = false; setSaving(false) }
      return
    }
    const now = new Date().toISOString()
    const outfit = draftToOutfit(draft, now)
    dispatch({ type: 'outfit/created', payload: outfit })
    navigate(`/outfits/${outfit.id}`)
  }

  return (
    <section className="mx-auto grid max-w-[1440px] gap-8 px-5 py-8 md:px-8 md:py-12 lg:px-16">
      <div className="flex flex-col gap-4 border-b border-[#E3E2E2] pb-7 md:flex-row md:items-end md:justify-between">
        <div>
          <Link to={ROUTES.wardrobes} className="inline-flex items-center gap-2 text-sm font-semibold text-[#1C1B1B] hover:underline">
            <ArrowLeft size={16} aria-hidden="true" /> Tủ đồ
          </Link>
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-[#222222]">
            Tạo outfit thủ công
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5E5F5D]">
            Chọn sản phẩm thật trong catalog, chọn màu và size từng món rồi lưu vào tủ đồ cá nhân.
          </p>
        </div>
        <Link
          to={ROUTES.outfitNewAi}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#1C1B1B] px-4 text-sm font-semibold text-[#1C1B1B] transition hover:bg-[#EFEDED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B1B]/30"
        >
          <Sparkles size={16} aria-hidden="true" /> Chuyển sang AI Stylist
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
        <BuilderCatalogPanel
          products={catalog.products}
          loading={catalog.loading}
          error={catalog.error}
          onRetry={catalog.retry}
          search={catalog.search}
          onSearchChange={catalog.setSearch}
          categories={catalog.categories}
          selectedCategoryIds={catalog.categoryIds}
          onToggleCategory={catalog.toggleCategory}
          onClearCategories={catalog.clearCategories}
          pagination={catalog.pagination}
          onPageChange={catalog.setPage}
          draftProductIds={draftProductIds}
          onAddProduct={addProduct}
        />
        <div ref={panelRef} role="region" aria-label="Chi tiết outfit đang tạo" tabIndex={0} className="min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B1B]/30 lg:sticky lg:top-28 lg:max-h-[calc(100dvh-8rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain">
        {saveError && <p role="alert" className="mb-3 text-sm text-[#A94B4B]">{saveError}</p>}
        <BuilderDraftPanel
          draft={draft}
          errors={errors}
          highlight={highlight}
          onNameChange={changeName}
          onVariantChange={changeVariant}
          onRemoveItem={removeItem}
          onSave={() => void saveOutfit()}
          saving={saving}
        />
        </div>
      </div>
    </section>
  )
}
