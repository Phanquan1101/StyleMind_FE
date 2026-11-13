import { AlertCircle, CheckCircle2, ChevronDown, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'

import { commerceApi } from '@/api/commerce'
import { apiMode } from '@/shared/api/http'
import { CommerceApiError } from '@/api/http'
import type { CatalogReference, CommerceProduct, ProductListResponse, VariantInput } from '@/api/commerce.types'
import type { DemoAction, DemoDatabase } from '@/app/store/types'
import { selectAdminProducts } from '@/features/admin/model/adminSelectors'
import type { AdminProductFilters } from '@/features/admin/model/adminTypes'
import { commerceProductToEntity } from '@/features/commerce/data/commerceEntityAdapters'
import { fieldErrorsFromProblem, focusFirstInvalid, mapFieldErrors } from '@/shared/lib/apiFieldErrors'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { MAX_IMAGE_BYTES, prepareImageForUpload, validateImageFile } from '@/shared/lib/imageUpload'
import { Button, Modal, SelectField, TextField, ToggleSwitch, useToast } from '@/shared/ui'
import VariantImagesManager from './VariantImagesManager'

interface AdminProductsPanelProps {
  database: DemoDatabase
  dispatch: React.Dispatch<DemoAction>
}

/** Only fields the commerce API actually stores. */
interface ProductFormState {
  name: string
  brandId: string
  categoryId: string
  price: string
  description: string
  material: string
  productActive: boolean
  color: string
  size: string
  quantity: string
  variantActive: boolean
  imageUrl: string
}

interface AdditionalVariantForm {
  key: string
  color: string
  size: string
  material: string
  price: string
  quantity: string
  active: boolean
  imageFile: File | null
  imagePreview: string
  imageUrl: string
}

interface VariantEditState {
  productId: string
  productName: string
  variantId: string
  sku: string
  color: string
  size: string
  material: string
  price: string
  quantity: string
  active: boolean
}

type FieldKey = 'name' | 'brandId' | 'categoryId' | 'price' | 'description' | 'material' | 'color' | 'size' | 'quantity' | 'image'
type FieldErrors = Partial<Record<FieldKey, string>>
type StepKey = 'product' | 'variant' | 'image'
type StepStatus = 'idle' | 'running' | 'done' | 'error'
interface StepState { status: StepStatus; message?: string }
type Steps = Record<StepKey, StepState>

/** API field name -> form field. Fields not listed here are shown in the banner. */
const SERVER_FIELD_MAP: Record<string, FieldKey> = {
  category_id: 'categoryId',
  brand_id: 'brandId',
  name: 'name',
  description: 'description',
  size: 'size',
  color: 'color',
  material: 'material',
  unit_price_vnd: 'price',
  quantity: 'quantity',
  file: 'image',
}

const PAGE_SIZE = 20
/** A sellable variant with this many units or fewer left is flagged "Sắp hết hàng". */
const LOW_STOCK = 5

const SIZE_SUGGESTIONS = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', 'Một cỡ']
const COLOR_SUGGESTIONS = ['Đen', 'Trắng', 'Xám', 'Be', 'Kem', 'Nâu', 'Đỏ', 'Hồng', 'Cam', 'Vàng', 'Xanh lá', 'Xanh dương', 'Tím']
const STEP_LABEL: Record<StepKey, string> = {
  product: '1. Lưu thông tin sản phẩm',
  variant: '2. Lưu phiên bản (màu, size, giá, tồn kho)',
  image: '3. Tải ảnh cho từng biến thể',
}
const freshSteps = (): Steps => ({ product: { status: 'idle' }, variant: { status: 'idle' }, image: { status: 'idle' } })

function toSlug(value: string) {
  return (
    value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'mau'
  )
}

function createInitialForm(categoryId: string): ProductFormState {
  return {
    name: '', brandId: '', categoryId, price: '', description: '', material: '', productActive: true,
    color: 'Đen', size: 'M', quantity: '10', variantActive: true, imageUrl: '',
  }
}

/** Builds the form from the raw API product so nothing is lost (sizes such as "2XL" or "Một cỡ" stay as they are). */
function createFormFromProduct(product: CommerceProduct): ProductFormState {
  const variant = product.variants[0]
  const image = variant?.images.find(item => item.is_primary) ?? variant?.images[0]
  return {
    name: product.name,
    brandId: product.brand_id,
    categoryId: product.category_id,
    price: variant ? String(variant.unit_price_vnd) : '',
    description: product.description ?? '',
    material: variant?.material ?? '',
    productActive: product.product_status === 'ACTIVE',
    color: variant?.color ?? '',
    size: variant?.size ?? '',
    quantity: variant ? String(variant.available_quantity) : '0',
    variantActive: variant ? variant.variant_status === 'ACTIVE' : true,
    imageUrl: image?.image_url ?? '',
  }
}

function validateForm(form: ProductFormState, requireImage: boolean, imageFile: File | null): FieldErrors {
  const errors: FieldErrors = {}
  if (!form.name.trim()) errors.name = 'Vui lòng nhập tên sản phẩm.'
  else if ([...form.name.trim()].length > 160) errors.name = 'Tên sản phẩm tối đa 160 ký tự.'
  if (!form.brandId) errors.brandId = 'Vui lòng chọn thương hiệu.'
  if (!form.categoryId) errors.categoryId = 'Vui lòng chọn danh mục.'
  if ([...form.description.trim()].length > 2000) errors.description = 'Mô tả tối đa 2000 ký tự.'
  if ([...form.material.trim()].length > 64) errors.material = 'Chất liệu tối đa 64 ký tự.'
  if (!form.color.trim()) errors.color = 'Vui lòng nhập màu sắc.'
  else if ([...form.color.trim()].length > 64) errors.color = 'Màu sắc tối đa 64 ký tự.'
  if (!form.size.trim()) errors.size = 'Vui lòng nhập hoặc chọn kích thước.'
  else if ([...form.size.trim()].length > 64) errors.size = 'Kích thước tối đa 64 ký tự.'
  const price = Number(form.price)
  if (form.price.trim() === '' || !Number.isFinite(price)) errors.price = 'Vui lòng nhập giá bán (VND).'
  else if (!Number.isInteger(price) || price <= 0) errors.price = 'Giá bán phải là số nguyên lớn hơn 0.'
  else if (price > 1_000_000_000) errors.price = 'Giá bán tối đa 1.000.000.000 VND.'
  const quantity = Number(form.quantity)
  if (form.quantity.trim() === '' || !Number.isInteger(quantity) || quantity < 0) errors.quantity = 'Tồn kho phải là số nguyên từ 0 trở lên.'
  else if (quantity > 1_000_000) errors.quantity = 'Tồn kho tối đa 1.000.000.'
  if (imageFile) {
    const imageError = validateImageFile(imageFile)
    if (imageError) errors.image = imageError
  } else if (requireImage) {
    errors.image = 'Vui lòng chọn ảnh sản phẩm.'
  }
  return errors
}

function isUnknownOutcome(error: unknown) {
  return !(error instanceof CommerceApiError) || error.status >= 500
}

function describeError(error: unknown) {
  if (error instanceof CommerceApiError) {
    if (error.status === 413) return `Ảnh quá lớn (tối đa ${MAX_IMAGE_BYTES / (1024 * 1024)} MB).`
    if (error.status === 401 || error.status === 403) return 'Phiên đăng nhập đã hết hạn hoặc không đủ quyền. Hãy đăng nhập lại.'
    return error.message
  }
  return error instanceof Error ? error.message : 'Lỗi không xác định.'
}

class StepFailure extends Error {
  constructor(readonly step: StepKey, readonly cause: unknown, readonly outcomeUnknown = false) {
    super(describeError(cause))
  }
}

export function AdminProductsPanel({ database, dispatch }: AdminProductsPanelProps) {
  const toast = useToast()
  const firstCategoryId = database.categories.find(category => category.active)?.id ?? database.categories[0]?.id ?? ''
  // Filters and the page live in the URL (?page=2&q=ao&category=<id>&status=inactive), so they survive reloads, back/forward and edits.
  const [searchParams, setSearchParams] = useSearchParams()
  const serverMode = apiMode()
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1)
  const urlQuery = searchParams.get('q') ?? ''
  const filters = useMemo<AdminProductFilters>(() => ({
    query: urlQuery,
    categoryId: searchParams.get('category') ?? 'all',
    status: (['active', 'inactive'].includes(searchParams.get('status') ?? '') ? searchParams.get('status') : 'all') as AdminProductFilters['status'],
  }), [urlQuery, searchParams])
  const updateParams = useCallback((changes: Record<string, string | null>, resetPage = true) => {
    setSearchParams(current => {
      const next = new URLSearchParams(current)
      Object.entries(changes).forEach(([key, value]) => (value === null || value === '' || value === 'all' ? next.delete(key) : next.set(key, value)))
      if (resetPage) next.delete('page')
      return next
    }, { replace: true })
  }, [setSearchParams])
  const [queryInput, setQueryInput] = useState(urlQuery)
  const [pageData, setPageData] = useState<ProductListResponse | null>(null)
  const [pageLoading, setPageLoading] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [reloadVersion, setReloadVersion] = useState(0)
  const [brandOptions, setBrandOptions] = useState<CatalogReference[]>([])
  const [brandsLoading, setBrandsLoading] = useState(false)
  const [brandsError, setBrandsError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [form, setForm] = useState<ProductFormState>(() => createInitialForm(firstCategoryId))
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [steps, setSteps] = useState<Steps>(freshSteps)
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null)
  const [imageVariant, setImageVariant] = useState<{ productId: string; variantId: string; label: string } | null>(null)
  const [variantEdit, setVariantEdit] = useState<VariantEditState | null>(null)
  const [variantEditLoadingId, setVariantEditLoadingId] = useState<string | null>(null)
  const [variantEditSaving, setVariantEditSaving] = useState(false)
  const [variantEditError, setVariantEditError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletedProductIds, setDeletedProductIds] = useState<Set<string>>(() => new Set())
  const [saving, setSaving] = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [additionalVariants, setAdditionalVariants] = useState<AdditionalVariantForm[]>([])
  const [saveUncertain, setSaveUncertain] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  // Ids created so far. A retry resumes from them instead of creating the product again.
  const saved = useRef<{
    productId: string | null
    variantId: string | null
    sku: string | null
    uploaded: File | null
    additional: Record<string, { variantId: string; sku: string; uploaded: File | null }>
  }>({ productId: null, variantId: null, sku: null, uploaded: null, additional: {} })

  const loadBrands = useCallback(async () => {
    setBrandsLoading(true)
    try {
      const response = await commerceApi.brands.listAdmin()
      setBrandOptions(response.items)
      setBrandsError(null)
      setForm(current => current.brandId ? current : { ...current, brandId: response.items.find(brand => brand.is_active)?.id ?? '' })
    } catch (error) {
      setBrandsError(describeError(error))
    } finally {
      setBrandsLoading(false)
    }
  }, [])

  useEffect(() => { void loadBrands() }, [loadBrands])

  // Debounce typing into the URL (the server is queried per URL change). Without a server the store is filtered at once.
  useEffect(() => {
    if (queryInput.trim() === urlQuery) return undefined
    const timer = window.setTimeout(() => updateParams({ q: queryInput.trim() }), serverMode ? 350 : 0)
    return () => window.clearTimeout(timer)
  }, [queryInput, urlQuery, serverMode, updateParams])

  const apiStatus = filters.status === 'active' ? 'ACTIVE' : filters.status === 'inactive' ? 'INACTIVE' : undefined
  const categoryFilter = filters.categoryId && filters.categoryId !== 'all' ? filters.categoryId : undefined
  useEffect(() => {
    if (!serverMode) return undefined
    let active = true
    setPageLoading(true)
    commerceApi.products.listAdmin({ keyword: urlQuery || undefined, category_id: categoryFilter, status: apiStatus, page: page - 1, size: PAGE_SIZE })
      .then(result => {
        if (!active) return
        // The page may no longer exist (e.g. the last row was filtered away): go to the last page.
        if (result.total_pages > 0 && page > result.total_pages) { updateParams({ page: String(result.total_pages) }, false); return }
        setPageData(result)
        setPageError(null)
      })
      .catch(error => { if (active) setPageError(describeError(error)) })
      .finally(() => { if (active) setPageLoading(false) })
    return () => { active = false }
  }, [serverMode, urlQuery, categoryFilter, apiStatus, page, reloadVersion, updateParams])

  const rows = useMemo(() => {
    if (!serverMode) return selectAdminProducts(database, filters)
      .map(product => deletedProductIds.has(product.id) ? { ...product, active: false, deleted: true } : product)
    // Server rows are already filtered/paged; reuse the selector only to build the row shape.
    return selectAdminProducts({ ...database, products: (pageData?.items ?? []).map(commerceProductToEntity) }, {})
      .map(product => deletedProductIds.has(product.id) ? { ...product, active: false, deleted: true } : product)
  }, [database, filters, serverMode, pageData, deletedProductIds])

  /** Keeps the customer on the same page: swap the changed product in place instead of reloading from page 1. */
  const applyProduct = (product: CommerceProduct) => {
    dispatch({ type: 'admin/productUpserted', payload: commerceProductToEntity(product) })
    setPageData(current => current && { ...current, items: current.items.map(item => (item.product_id === product.product_id ? product : item)) })
  }

  const resetSaveState = () => {
    saved.current = { productId: null, variantId: null, sku: null, uploaded: null, additional: {} }
    setSteps(freshSteps())
    setFieldErrors({})
    setFormError(null)
    setSaveUncertain(false)
    setImageFile(null)
    setImagePreview('')
    setAdditionalVariants([])
  }

  const openCreateModal = () => {
    resetSaveState()
    setEditingProductId(null)
    setForm({
      ...createInitialForm(firstCategoryId),
      brandId: brandOptions.find(brand => brand.is_active)?.id ?? '',
    })
    setModalOpen(true)
  }

  const openEditModal = async (productId: string) => {
    setLoadingEdit(true)
    try {
      const product = await commerceApi.products.getAdmin(productId)
      resetSaveState()
      const additional = product.variants.slice(1).map(variant => {
        const image = variant.images.find(item => item.is_primary) ?? variant.images[0]
        return {
          key: variant.variant_id,
          color: variant.color ?? '',
          size: variant.size ?? '',
          material: variant.material ?? '',
          price: String(variant.unit_price_vnd),
          quantity: String(variant.available_quantity),
          active: variant.variant_status === 'ACTIVE',
          imageFile: null,
          imagePreview: '',
          imageUrl: image?.image_url ?? '',
        }
      })
      saved.current = {
        productId: product.product_id,
        variantId: product.variants[0]?.variant_id ?? null,
        sku: product.variants[0]?.sku ?? null,
        uploaded: null,
        additional: Object.fromEntries(product.variants.slice(1).map(variant => [variant.variant_id, { variantId: variant.variant_id, sku: variant.sku, uploaded: null }])),
      }
      setEditingProductId(productId)
      setForm(createFormFromProduct(product))
      setAdditionalVariants(additional)
      setModalOpen(true)
    } catch (error) {
      toast.error(`Không mở được sản phẩm: ${describeError(error)}`)
    } finally {
      setLoadingEdit(false)
    }
  }

  const updateField = <Field extends keyof ProductFormState>(field: Field, value: ProductFormState[Field]) => {
    setForm(current => ({ ...current, [field]: value }))
    setFieldErrors(current => (field in current ? { ...current, [field]: undefined } : current))
  }

  const setStep = (key: StepKey, state: StepState) => setSteps(current => ({ ...current, [key]: state }))
  const publish = async (productId: string) => {
    const refreshed = await commerceApi.products.getAdmin(productId)
    applyProduct(refreshed)
    return refreshed
  }

  const openVariantEdit = async (productId: string, productName: string, variantId: string) => {
    setVariantEditLoadingId(variantId)
    setVariantEditError(null)
    try {
      const product = await commerceApi.products.getAdmin(productId)
      const variant = product.variants.find(item => item.variant_id === variantId)
      if (!variant) throw new Error('Không tìm thấy biến thể cần sửa.')
      setVariantEdit({
        productId,
        productName,
        variantId,
        sku: variant.sku,
        color: variant.color ?? '',
        size: variant.size ?? '',
        material: variant.material ?? '',
        price: String(variant.unit_price_vnd),
        quantity: String(variant.available_quantity),
        active: variant.variant_status === 'ACTIVE',
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể mở biến thể.')
    } finally {
      setVariantEditLoadingId(null)
    }
  }

  const saveVariantEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!variantEdit || variantEditSaving) return
    const price = Number(variantEdit.price)
    const quantity = Number(variantEdit.quantity)
    if (!variantEdit.color || !variantEdit.size || !Number.isInteger(price) || price <= 0 || !Number.isInteger(quantity) || quantity < 0) {
      setVariantEditError('Vui lòng chọn màu, size và nhập giá, tồn kho hợp lệ.')
      return
    }
    if ([...variantEdit.material.trim()].length > 64) {
      setVariantEditError('Chất liệu tối đa 64 ký tự.')
      return
    }
    setVariantEditSaving(true)
    setVariantEditError(null)
    try {
      await commerceApi.products.replaceVariant(variantEdit.variantId, {
        sku: variantEdit.sku,
        size: variantEdit.size,
        color: variantEdit.color,
        material: variantEdit.material.trim() || null,
        unit_price_vnd: price,
        quantity,
        variant_status: variantEdit.active ? 'ACTIVE' : 'INACTIVE',
      })
      await publish(variantEdit.productId)
      toast.success('Đã cập nhật biến thể.')
      setVariantEdit(null)
    } catch (error) {
      setVariantEditError(describeError(error))
    } finally {
      setVariantEditSaving(false)
    }
  }

  const deleteProduct = async () => {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await commerceApi.products.remove(deleteTarget.id)
      dispatch({ type: 'admin/productStatusChanged', payload: { productId: deleteTarget.id, active: false } })
      setDeletedProductIds(current => new Set(current).add(deleteTarget.id))
      setPageData(current => current && { ...current, items: current.items.map(item => item.product_id === deleteTarget.id ? { ...item, product_status: 'DELETED' } : item) })
      setExpandedProductId(current => current === deleteTarget.id ? null : current)
      setDeleteTarget(null)
      setReloadVersion(value => value + 1)
      toast.success('Đã xóa sản phẩm khỏi cửa hàng.')
    } catch (error) {
      setDeleteError(describeError(error))
    } finally {
      setDeleting(false)
    }
  }

  const runSaveSteps = async () => {
    const productInput = () => {
      return {
        category_id: form.categoryId,
        brand_id: form.brandId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        demographic_segment: null,
        product_status: form.productActive ? 'ACTIVE' : 'INACTIVE',
      }
    }

    // Step 1 - product (create once, then always replace).
    setStep('product', { status: 'running' })
    try {
      const input = await productInput()
      const existingId = saved.current.productId
      const product = existingId ? await commerceApi.products.replace(existingId, input) : await commerceApi.products.create(input)
      saved.current.productId = product.product_id
      if (!existingId) saved.current.variantId = product.variants[0]?.variant_id ?? null
      setStep('product', { status: 'done' })
    } catch (error) {
      setStep('product', { status: 'error', message: describeError(error) })
      throw new StepFailure('product', error, !saved.current.productId && isUnknownOutcome(error))
    }
    const productId = saved.current.productId as string

    // Step 2 - variant (create once, then always replace; if a create outcome is unknown, look the variant up).
    setStep('variant', { status: 'running' })
    try {
      const variantInput = {
        sku: saved.current.sku || `${`${toSlug(form.name)}-${toSlug(form.color)}-${toSlug(form.size)}`.slice(0, 54)}-${Date.now().toString(36).slice(-8)}`.toUpperCase(),
        size: form.size.trim(),
        color: form.color.trim(),
        material: form.material.trim() || null,
        unit_price_vnd: Number(form.price),
        quantity: Number(form.quantity),
        variant_status: form.variantActive ? 'ACTIVE' : 'INACTIVE',
      }
      let variantId = saved.current.variantId
      if (variantId) {
        await commerceApi.products.replaceVariant(variantId, variantInput)
      } else {
        try {
          const created = await commerceApi.products.createVariant(productId, variantInput)
          variantId = created.variant_id
        } catch (error) {
          if (!isUnknownOutcome(error)) throw error
          const current = await commerceApi.products.getAdmin(productId)
          const adopted = current.variants.find(item => item.sku === variantInput.sku)
          if (!adopted) throw error
          variantId = adopted.variant_id
        }
      }
      saved.current.variantId = variantId
      saved.current.sku = variantInput.sku

      for (const [index, draft] of additionalVariants.entries()) {
        const stored = saved.current.additional[draft.key]
        const input: VariantInput = {
          sku: stored?.sku || `${`${toSlug(form.name)}-${toSlug(draft.color)}-${toSlug(draft.size)}`.slice(0, 54)}-${Date.now().toString(36).slice(-6)}${index}`.toUpperCase(),
          size: draft.size,
          color: draft.color,
          material: draft.material.trim() || null,
          unit_price_vnd: Number(draft.price),
          quantity: Number(draft.quantity),
          variant_status: draft.active ? 'ACTIVE' : 'INACTIVE',
        }
        let additionalId = stored?.variantId
        if (additionalId) {
          await commerceApi.products.replaceVariant(additionalId, input)
        } else {
          try {
            additionalId = (await commerceApi.products.createVariant(productId, input)).variant_id
          } catch (error) {
            if (!isUnknownOutcome(error)) throw error
            const current = await commerceApi.products.getAdmin(productId)
            const adoptedId = current.variants.find(item => item.sku === input.sku)?.variant_id
            if (!adoptedId) throw error
            additionalId = adoptedId
          }
        }
        saved.current.additional[draft.key] = { variantId: additionalId, sku: input.sku, uploaded: stored?.uploaded ?? null }
      }
      setStep('variant', { status: 'done' })
    } catch (error) {
      await publish(productId).catch(() => undefined)
      setStep('variant', { status: 'error', message: describeError(error) })
      throw new StepFailure('variant', error)
    }
    await publish(productId).catch(() => undefined)

    // Step 3 - each selected file belongs to its own persisted variant.
    const pendingAdditionalImages = additionalVariants.filter(variant => {
      const stored = saved.current.additional[variant.key]
      return variant.imageFile && stored?.uploaded !== variant.imageFile
    })
    if ((imageFile && saved.current.uploaded !== imageFile) || pendingAdditionalImages.length > 0) {
      setStep('image', { status: 'running' })
      try {
        if (imageFile && saved.current.uploaded !== imageFile) {
          const file = await prepareImageForUpload(imageFile)
          await commerceApi.products.uploadImage(saved.current.variantId as string, file, `${form.name.trim()} - ${form.color} - ${form.size}`)
          saved.current.uploaded = imageFile
        }
        for (const variant of pendingAdditionalImages) {
          const stored = saved.current.additional[variant.key]
          if (!variant.imageFile || !stored) continue
          const file = await prepareImageForUpload(variant.imageFile)
          await commerceApi.products.uploadImage(stored.variantId, file, `${form.name.trim()} - ${variant.color} - ${variant.size}`)
          stored.uploaded = variant.imageFile
        }
        setStep('image', { status: 'done' })
        await publish(productId).catch(() => undefined)
      } catch (error) {
        setStep('image', { status: 'error', message: describeError(error) })
        throw new StepFailure('image', error)
      }
    } else {
      setStep('image', { status: imageFile || additionalVariants.some(variant => variant.imageFile) ? 'done' : 'idle' })
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving || saveUncertain) return
    const errors = validateForm(form, !form.imageUrl, imageFile)
    setFieldErrors(errors)
    const allVariants = [{ color: form.color, size: form.size, price: form.price, quantity: form.quantity }, ...additionalVariants]
    const invalidAdditional = additionalVariants.some(variant => {
      const price = Number(variant.price)
      const quantity = Number(variant.quantity)
      return !variant.color || !variant.size || !Number.isInteger(price) || price <= 0 || !Number.isInteger(quantity) || quantity < 0 ||
        (!variant.imageFile && !variant.imageUrl) || Boolean(variant.imageFile && validateImageFile(variant.imageFile))
    })
    const combinations = allVariants.map(variant => `${variant.color.trim().toLocaleLowerCase('vi')}::${variant.size.trim().toLocaleLowerCase('vi')}`)
    const duplicateVariant = new Set(combinations).size !== combinations.length
    if (invalidAdditional || duplicateVariant) {
      setFormError(invalidAdditional
        ? 'Vui lòng nhập đầy đủ thông tin hợp lệ và chọn một ảnh cho mỗi biến thể.'
        : 'Mỗi tổ hợp màu và size chỉ được thêm một lần.')
      return
    }
    if (Object.keys(errors).length > 0) {
      setFormError('Vui lòng sửa các ô được đánh dấu đỏ.')
      // Wait for aria-invalid to render before focusing.
      setTimeout(() => focusFirstInvalid(formRef.current), 0)
      return
    }

    setSaving(true)
    setFormError(null)
    setSteps(current => ({
      product: current.product.status === 'done' ? current.product : { status: 'idle' },
      variant: { status: 'idle' },
      image: { status: 'idle' },
    }))
    try {
      await runSaveSteps()
      toast.success('Đã lưu sản phẩm.')
      setModalOpen(false)
      setReloadVersion(value => value + 1)
    } catch (error) {
      if (!(error instanceof StepFailure)) {
        setFormError(describeError(error))
        return
      }
      const problemErrors = fieldErrorsFromProblem(error.cause instanceof CommerceApiError ? error.cause.problem : undefined)
      const { fields, unmapped } = mapFieldErrors<FieldKey>(problemErrors, SERVER_FIELD_MAP)
      if (Object.keys(fields).length > 0) {
        setFieldErrors(fields)
        setTimeout(() => focusFirstInvalid(formRef.current), 0)
      }
      if (error.outcomeUnknown) {
        setSaveUncertain(true)
        setFormError('Chưa xác định được sản phẩm đã được tạo hay chưa. Hãy đóng biểu mẫu, tải lại danh sách và kiểm tra trước khi thử lại để tránh tạo trùng.')
      } else if (Object.keys(fields).length > 0 && unmapped.length === 0) {
        setFormError('Vui lòng sửa các ô được đánh dấu đỏ.')
      } else {
        const detail = unmapped.map(item => item.message).join(' ') || error.message
        setFormError(error.step === 'image'
          ? `Sản phẩm đã được lưu nhưng chưa tải được ảnh: ${detail} Bạn có thể thử lại bước này hoặc đóng biểu mẫu.`
          : `Chưa hoàn tất lưu sản phẩm (${STEP_LABEL[error.step].slice(3)}): ${detail}`)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#1C1B1B]">Danh mục bán hàng</p>
          <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-[#222222] md:text-4xl">
            Quản lý sản phẩm
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5E5F5D]">
            Quản lý danh sách sản phẩm và biến thể trong cửa hàng.
          </p>
        </div>
        <Button type="button" onClick={openCreateModal} icon={<Plus size={17} aria-hidden="true" />}>
          Thêm sản phẩm
        </Button>
      </div>

      <div className="grid gap-3 rounded-lg border border-[#E3E2E2] bg-white p-4 md:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_180px_180px]">
        <TextField
          label="Tìm sản phẩm"
          value={queryInput}
          onChange={event => setQueryInput(event.target.value)}
          placeholder="Nhập tên sản phẩm hoặc mã SKU"
        />
        <SelectField
          label="Lọc danh mục"
          value={filters.categoryId ?? 'all'}
          onChange={event => updateParams({ category: event.target.value })}
        >
          <option value="all">Tất cả danh mục</option>
          {database.categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Trạng thái"
          value={filters.status ?? 'all'}
          onChange={event => updateParams({ status: event.target.value })}
        >
          <option value="all">Tất cả</option>
          <option value="active">Đang bán</option>
          <option value="inactive">Đã tắt</option>
        </SelectField>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#E3E2E2] bg-white">
        <p className="border-b border-[#E3E2E2] px-4 py-2 text-xs text-[#5E5F5D] lg:hidden">Vuốt ngang để xem toàn bộ thông tin sản phẩm.</p>
        <div className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1C1B1B]" role="region" aria-label="Bảng sản phẩm" tabIndex={0}>
          <table className="w-full min-w-[920px] border-collapse text-left text-sm">
            <thead className="bg-[#FBF9F9] text-xs font-semibold uppercase tracking-wide text-[#5E5F5D]">
              <tr>
                <th scope="col" className="px-4 py-3">Sản phẩm</th>
                <th scope="col" className="px-4 py-3">Danh mục</th>
                <th scope="col" className="px-4 py-3 text-right">Giá bán</th>
                <th scope="col" className="px-4 py-3">Biến thể</th>
                <th scope="col" className="px-4 py-3 text-center">Trạng thái</th>
                <th scope="col" className="px-4 py-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E0D8]">
              {serverMode && pageError ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm"><span role="alert" className="font-semibold text-[#A94B4B]">{pageError}</span> <button type="button" className="ml-2 underline" onClick={() => setReloadVersion(value => value + 1)}>Thử lại</button></td></tr>
              ) : serverMode && pageLoading && !pageData ? (
                <tr><td colSpan={6} role="status" className="px-4 py-8 text-center text-sm text-[#5E5F5D]">Đang tải sản phẩm…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-[#5E5F5D]">Không có sản phẩm phù hợp.</td></tr>
              ) : rows.map(row => {
                const isExpanded = expandedProductId === row.id
                const variantsTableId = `variants-${row.id}`

                return (
                  <Fragment key={row.id}>
                    <tr className="align-middle hover:bg-[#FBF9F9]/70">
                      <td className="px-4 py-3">
                        <div className="flex min-w-56 items-center gap-3">
                          {row.imageUrl ? (
                            <img src={row.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                          ) : (
                            <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-[#F5F2EE] text-[10px] font-semibold text-[#5E5F5D]">Ảnh</span>
                          )}
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-[#222222]">{row.name}</span>
                            <span className="mt-0.5 block truncate text-xs text-[#5E5F5D]">{row.brand}{row.skuLabel ? ` · SKU ${row.skuLabel}` : ''}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#3A3632]">{row.categoryLabel}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-[#222222]">{formatCurrency(row.basePrice)}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          aria-controls={variantsTableId}
                          onClick={() => setExpandedProductId(current => current === row.id ? null : row.id)}
                          className="inline-flex h-9 items-center gap-2 rounded-md border border-[#E5E0D8] bg-[#FBF9F9] px-3 text-xs font-semibold text-[#3A3632] transition hover:bg-[#EFEDED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B1B] focus-visible:ring-offset-2"
                        >
                          {row.variantCount} biến thể{row.variants.some(variant => variant.active && variant.stock <= LOW_STOCK) ? <span className="rounded bg-[#FFF4D6] px-1.5 py-0.5 text-[10px] font-bold text-[#7A5A1E]">Sắp hết hàng</span> : null}
                          <ChevronDown aria-hidden="true" size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.deleted ? (
                          <span className="inline-flex rounded-full bg-[#FCEAEA] px-2.5 py-1 text-xs font-semibold text-[#A94B4B]">Đã xóa</span>
                        ) : (
                          <ToggleSwitch
                            checked={row.active}
                            label={`Sản phẩm ${row.name}`}
                            onCheckedChange={active => {
                              void commerceApi.products.getAdmin(row.id).then(product =>
                                commerceApi.products.replace(row.id, {
                                  category_id: product.category_id,
                                  brand_id: product.brand_id,
                                  name: product.name,
                                  description: product.description,
                                  demographic_segment: product.demographic_segment,
                                  product_status: active ? 'ACTIVE' : 'INACTIVE',
                                }),
                              ).then(product => {
                                applyProduct(product)
                                toast.info(active ? 'Đã bật sản phẩm.' : 'Đã tắt sản phẩm.')
                              }).catch(error => toast.error(error instanceof Error ? error.message : 'Không thể cập nhật sản phẩm'))
                            }}
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button type="button" size="sm" variant="ghost" className="border border-[#E5E0D8]" disabled={row.deleted} icon={<Pencil size={14} aria-hidden="true" />} aria-label={`Sửa ${row.name}`} onClick={() => void openEditModal(row.id)}>Sửa</Button>
                          <Button type="button" size="sm" variant="danger-soft" disabled={row.deleted} icon={<Trash2 size={14} aria-hidden="true" />} aria-label={`Xóa ${row.name}`} onClick={() => { setDeleteError(null); setDeleteTarget({ id: row.id, name: row.name }) }}>Xóa</Button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="bg-[#FBF9F9] px-4 py-3">
                          <div id={variantsTableId} className="overflow-x-auto rounded-lg border border-[#E5E0D8] bg-white">
                            <table className="w-full min-w-[700px] text-left text-sm">
                              <caption className="sr-only">Biến thể của {row.name}</caption>
                              <thead className="bg-[#F5F2EE] text-xs font-semibold text-[#5E5F5D]">
                                <tr>
                                  <th scope="col" className="px-3 py-2">Màu</th>
                                  <th scope="col" className="px-3 py-2">Cỡ</th>
                                  <th scope="col" className="px-3 py-2 text-right">Giá</th>
                                  <th scope="col" className="px-3 py-2 text-center">Đang bán</th>
                                  <th scope="col" className="px-3 py-2 text-right">Ảnh</th>
                                   <th scope="col" className="px-3 py-2 text-right">Thao tác</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E5E0D8]">
                                {row.variants.map(variant => (
                                  <tr key={variant.id}>
                                    <td className="px-3 py-2.5">
                                      <span className="inline-flex items-center gap-2 text-[#3A3632]">
                                        <span aria-hidden="true" className="h-3.5 w-3.5 rounded-full border border-[#C4C7C7]" style={{ backgroundColor: variant.colorHex }} />
                                        {variant.color}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2.5 font-medium text-[#3A3632]">{variant.size}{variant.sku ? <span className="ml-2 text-xs font-normal text-[#5E5F5D]">SKU {variant.sku}</span> : null}{variant.active && variant.stock <= LOW_STOCK ? <span className="ml-2 rounded bg-[#FFF4D6] px-1.5 py-0.5 text-[10px] font-bold text-[#7A5A1E]">{variant.stock === 0 ? 'Hết hàng' : `Sắp hết hàng (còn ${variant.stock})`}</span> : null}</td>
                                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-[#3A3632]">{formatCurrency(variant.price)}</td>
                                    <td className="px-3 py-2.5 text-center">
                                      <span className="inline-flex justify-center">
                                        <ToggleSwitch
                                          checked={variant.active}
                                          disabled={row.deleted}
                                          label={`Biến thể màu ${variant.color}, cỡ ${variant.size} của ${row.name}`}
                                          onCheckedChange={active => {
                                            void commerceApi.products.getAdmin(row.id).then(async product => {
                                              const source = product.variants.find(item => item.variant_id === variant.id)
                                              if (!source) throw new Error('Không tìm thấy biến thể')
                                              await commerceApi.products.replaceVariant(source.variant_id, {
                                                sku: source.sku,
                                                size: source.size,
                                                color: source.color,
                                                material: source.material,
                                                unit_price_vnd: source.unit_price_vnd,
                                                quantity: source.available_quantity,
                                                variant_status: active ? 'ACTIVE' : 'INACTIVE',
                                              })
                                              return commerceApi.products.getAdmin(row.id)
                                            }).then(product => {
                                              applyProduct(product)
                                              toast.info(active ? 'Đã bật biến thể.' : 'Đã tắt biến thể.')
                                            }).catch(error => toast.error(error instanceof Error ? error.message : 'Không thể cập nhật biến thể'))
                                          }}
                                        />
                                      </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-right"><Button type="button" size="sm" variant="ghost" className="border border-[#E5E0D8]" disabled={row.deleted} onClick={() => setImageVariant({ productId: row.id, variantId: variant.id, label: `${row.name} · ${variant.color} · ${variant.size}` })}>Quản lý ảnh</Button></td>
                                     <td className="px-3 py-2.5 text-right"><Button type="button" size="sm" variant="ghost" className="border border-[#E5E0D8]" disabled={row.deleted} loading={variantEditLoadingId === variant.id} icon={<Pencil size={14} aria-hidden="true" />} aria-label={`Sửa biến thể ${variant.color} ${variant.size} của ${row.name}`} onClick={() => void openVariantEdit(row.id, row.name, variant.id)}>Sửa</Button></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
        {serverMode && pageData && (
          <nav aria-label="Phân trang sản phẩm" className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E3E2E2] px-4 py-3 text-sm text-[#3A3632]">
            <span aria-live="polite">{pageData.total_elements === 0 ? 'Không có sản phẩm' : `Hiển thị ${pageData.page * pageData.size + 1}–${pageData.page * pageData.size + pageData.items.length} / ${pageData.total_elements} sản phẩm`}{pageLoading ? ' · đang tải…' : ''}</span>
            <span className="inline-flex items-center gap-2">
              <Button type="button" size="sm" variant="ghost" className="border border-[#E5E0D8]" disabled={page <= 1 || pageLoading} onClick={() => updateParams({ page: String(page - 1) }, false)}>Trước</Button>
              <span>Trang {Math.min(page, Math.max(1, pageData.total_pages))} / {Math.max(1, pageData.total_pages)}</span>
              <Button type="button" size="sm" variant="ghost" className="border border-[#E5E0D8]" disabled={page >= pageData.total_pages || pageLoading} onClick={() => updateParams({ page: String(page + 1) }, false)}>Sau</Button>
            </span>
          </nav>
        )}
      </div>

      <Modal open={!!deleteTarget} title="Xóa sản phẩm" description={deleteTarget ? `Bạn có chắc muốn xóa “${deleteTarget.name}” khỏi cửa hàng?` : undefined} onClose={() => { if (!deleting) { setDeleteTarget(null); setDeleteError(null) } }}>
        <div className="grid gap-4">
          <p className="text-sm leading-6 text-[#5E5F5D]">Sản phẩm sẽ ngừng bán và không còn hiển thị với khách hàng. Dữ liệu sản phẩm vẫn được lưu trong hệ thống.</p>
          {deleteError && <p role="alert" className="rounded-lg border border-[#E7BBBB] bg-[#FCEAEA] p-3 text-sm font-semibold text-[#A94B4B]">Không thể xóa sản phẩm: {deleteError}</p>}
          <div className="flex justify-end gap-3 border-t border-[#E3E2E2] pt-4">
            <Button type="button" variant="ghost" disabled={deleting} onClick={() => { setDeleteTarget(null); setDeleteError(null) }}>Hủy</Button>
            <Button type="button" variant="danger" loading={deleting} onClick={() => void deleteProduct()}>Xác nhận xóa</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!variantEdit} title="Sửa biến thể" description={variantEdit ? `${variantEdit.productName} · SKU ${variantEdit.sku}` : undefined} onClose={() => { if (!variantEditSaving) setVariantEdit(null) }}>
        {variantEdit && (
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={saveVariantEdit} noValidate>
            {variantEditError && <p role="alert" className="rounded-lg border border-[#E7BBBB] bg-[#FCEAEA] p-3 text-sm font-semibold text-[#A94B4B] sm:col-span-2">{variantEditError}</p>}
            <SelectField label="Màu biến thể" value={variantEdit.color} onChange={event => setVariantEdit(current => current && { ...current, color: event.target.value })}>
              {!COLOR_SUGGESTIONS.includes(variantEdit.color) && variantEdit.color && <option value={variantEdit.color}>{variantEdit.color}</option>}
              {COLOR_SUGGESTIONS.map(color => <option key={color} value={color}>{color}</option>)}
            </SelectField>
            <SelectField label="Size biến thể" value={variantEdit.size} onChange={event => setVariantEdit(current => current && { ...current, size: event.target.value })}>
              {!SIZE_SUGGESTIONS.includes(variantEdit.size) && variantEdit.size && <option value={variantEdit.size}>{variantEdit.size}</option>}
              {SIZE_SUGGESTIONS.map(size => <option key={size} value={size}>{size}</option>)}
            </SelectField>
            <TextField label="Giá bán biến thể (VND)" type="number" min="1" step="1" value={variantEdit.price} onChange={event => setVariantEdit(current => current && { ...current, price: event.target.value })} />
            <TextField label="Tồn kho biến thể" type="number" min="0" step="1" value={variantEdit.quantity} onChange={event => setVariantEdit(current => current && { ...current, quantity: event.target.value })} />
            <div className="sm:col-span-2"><TextField label="Chất liệu biến thể" value={variantEdit.material} onChange={event => setVariantEdit(current => current && { ...current, material: event.target.value })} /></div>
            <label className="inline-flex items-center gap-3 rounded-lg border border-[#E3E2E2] bg-white p-3 text-sm font-semibold text-[#3A3632] sm:col-span-2">
              <input type="checkbox" checked={variantEdit.active} onChange={event => setVariantEdit(current => current && { ...current, active: event.target.checked })} className="h-4 w-4 accent-[#1C1B1B]" />
              Biến thể đang bán
            </label>
            <div className="flex justify-end gap-3 border-t border-[#E3E2E2] pt-4 sm:col-span-2">
              <Button type="button" variant="ghost" disabled={variantEditSaving} onClick={() => setVariantEdit(null)}>Hủy</Button>
              <Button type="submit" loading={variantEditSaving}>Lưu biến thể</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!imageVariant} title="Quản lý ảnh biến thể" description={imageVariant?.label} onClose={() => setImageVariant(null)}>
        {imageVariant && <VariantImagesManager productId={imageVariant.productId} variantId={imageVariant.variantId} onUpdated={applyProduct} />}
      </Modal>

      <Modal
        open={modalOpen}
        layout="drawer"
        title={editingProductId ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
        description="Điền thông tin sản phẩm và phiên bản để hiển thị trong cửa hàng."
        onClose={() => { if (!saving) setModalOpen(false) }}
      >
        <form ref={formRef} className="grid gap-5" onSubmit={handleSubmit} noValidate>
          {formError && <p role="alert" className="rounded-lg border border-[#E7BBBB] bg-[#FCEAEA] p-3 text-sm font-semibold text-[#A94B4B]">{formError}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border-b border-[#E3E2E2] pb-3 sm:col-span-2"><h3 className="font-display text-xl font-semibold">Thông tin sản phẩm</h3><p className="mt-1 text-sm text-[#5E5F5D]">Tên, danh mục và thông tin hiển thị trong cửa hàng.</p></div>
            {editingProductId && (
              <p className="text-xs text-[#5E5F5D] sm:col-span-2">Mã sản phẩm (tự sinh, không sửa được): <span className="select-all font-mono">{editingProductId}</span></p>
            )}
            <TextField label="Tên sản phẩm" value={form.name} error={fieldErrors.name} onChange={event => updateField('name', event.target.value)} />
            <SelectField label="Thương hiệu" value={form.brandId} error={fieldErrors.brandId} disabled={brandsLoading} onChange={event => updateField('brandId', event.target.value)}>
              <option value="">{brandsLoading ? 'Đang tải thương hiệu…' : 'Chọn thương hiệu'}</option>
              {[...brandOptions]
                .filter(brand => brand.is_active || brand.id === form.brandId)
                .sort((first, second) => first.name.localeCompare(second.name, 'vi'))
                .map(brand => <option key={brand.id} value={brand.id}>{brand.name}{brand.is_active ? '' : ' (đã ẩn)'}</option>)}
            </SelectField>
            {brandsError && <div className="-mt-2 flex items-center gap-2 text-xs text-[#A94B4B] sm:col-span-2"><span>Không tải được thương hiệu: {brandsError}</span><button type="button" className="font-semibold underline" onClick={() => void loadBrands()}>Thử lại</button></div>}
            <SelectField label="Danh mục" value={form.categoryId} error={fieldErrors.categoryId} onChange={event => updateField('categoryId', event.target.value)}>
              {database.categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </SelectField>
            <div className="sm:col-span-2"><TextField label="Mô tả" value={form.description} error={fieldErrors.description} onChange={event => updateField('description', event.target.value)} /></div>
            <label className="inline-flex items-center gap-3 rounded-lg border border-[#E3E2E2] bg-white p-3 text-sm font-semibold text-[#3A3632] sm:col-span-2">
              <input type="checkbox" checked={form.productActive} onChange={event => updateField('productActive', event.target.checked)} className="h-4 w-4 accent-[#1C1B1B]" />
              Sản phẩm đang bán
            </label>

            <div className="mt-3 border-b border-[#E3E2E2] pb-3 sm:col-span-2">
              <h3 className="font-display text-xl font-semibold">Danh sách biến thể</h3>
              <p className="mt-1 text-sm text-[#5E5F5D]">Mỗi biến thể có màu, size, giá, tồn kho và một ảnh riêng.</p>
            </div>

            <fieldset className="grid gap-4 rounded-lg border border-[#E3E2E2] bg-[#FBF9F9] p-4 sm:col-span-2 sm:grid-cols-2">
              <legend className="px-2 text-sm font-semibold text-[#3A3632]">Biến thể 1</legend>
              <SelectField label="Màu biến thể 1" value={form.color} error={fieldErrors.color} onChange={event => updateField('color', event.target.value)}>
                {!COLOR_SUGGESTIONS.includes(form.color) && form.color && <option value={form.color}>{form.color}</option>}
                {COLOR_SUGGESTIONS.map(color => <option key={color} value={color}>{color}</option>)}
              </SelectField>
              <SelectField label="Size biến thể 1" value={form.size} error={fieldErrors.size} onChange={event => updateField('size', event.target.value)}>
                {!SIZE_SUGGESTIONS.includes(form.size) && form.size && <option value={form.size}>{form.size}</option>}
                {SIZE_SUGGESTIONS.map(size => <option key={size} value={size}>{size}</option>)}
              </SelectField>
              <TextField label="Giá bán biến thể 1 (VND)" type="number" min="1" step="1" value={form.price} error={fieldErrors.price} onChange={event => updateField('price', event.target.value)} />
              <TextField label="Tồn kho biến thể 1" type="number" min="0" step="1" value={form.quantity} error={fieldErrors.quantity} onChange={event => updateField('quantity', event.target.value)} />
              <TextField label="Chất liệu biến thể 1" value={form.material} error={fieldErrors.material} onChange={event => updateField('material', event.target.value)} />
              <label className="inline-flex items-center gap-2 self-end pb-3 text-sm font-semibold"><input type="checkbox" checked={form.variantActive} onChange={event => updateField('variantActive', event.target.checked)} className="h-4 w-4 accent-[#1C1B1B]" />Biến thể đang bật</label>
              <div className="grid gap-2 sm:col-span-2">
                <label className="grid gap-2 text-sm font-semibold" htmlFor="admin-product-variant-image-1">
                  Ảnh biến thể 1
                  <input id="admin-product-variant-image-1" aria-label="Ảnh biến thể 1" aria-invalid={fieldErrors.image ? true : undefined} type="file" accept="image/jpeg,image/png,image/webp" onChange={event => {
                    const file = event.target.files?.[0] ?? null
                    setImageFile(file); setImagePreview('')
                    setFieldErrors(current => ({ ...current, image: file ? validateImageFile(file) ?? undefined : undefined }))
                    if (file) { const reader = new FileReader(); reader.onload = () => setImagePreview(typeof reader.result === 'string' ? reader.result : ''); reader.readAsDataURL(file) }
                  }} className="block w-full rounded-lg border bg-white p-3 text-sm" />
                </label>
                {fieldErrors.image && <span className="text-xs font-medium text-[#A94B4B]">{fieldErrors.image}</span>}
                {(imagePreview || form.imageUrl) && <img src={imagePreview || form.imageUrl} alt="Ảnh xem trước biến thể 1" className="h-28 w-28 rounded-lg object-cover" />}
              </div>
            </fieldset>

            {additionalVariants.map((variant, index) => (
              <fieldset key={variant.key} className="grid gap-4 rounded-lg border border-[#E3E2E2] bg-[#FBF9F9] p-4 sm:col-span-2 sm:grid-cols-2">
                <legend className="px-2 text-sm font-semibold text-[#3A3632]">Biến thể {index + 2}</legend>
                <SelectField label={`Màu biến thể ${index + 2}`} value={variant.color} onChange={event => setAdditionalVariants(current => current.map(item => item.key === variant.key ? { ...item, color: event.target.value } : item))}>
                  {COLOR_SUGGESTIONS.map(color => <option key={color} value={color}>{color}</option>)}
                </SelectField>
                <SelectField label={`Size biến thể ${index + 2}`} value={variant.size} onChange={event => setAdditionalVariants(current => current.map(item => item.key === variant.key ? { ...item, size: event.target.value } : item))}>
                  {SIZE_SUGGESTIONS.map(size => <option key={size} value={size}>{size}</option>)}
                </SelectField>
                <TextField label={`Giá bán biến thể ${index + 2} (VND)`} type="number" min="1" step="1" value={variant.price} onChange={event => setAdditionalVariants(current => current.map(item => item.key === variant.key ? { ...item, price: event.target.value } : item))} />
                <TextField label={`Tồn kho biến thể ${index + 2}`} type="number" min="0" step="1" value={variant.quantity} onChange={event => setAdditionalVariants(current => current.map(item => item.key === variant.key ? { ...item, quantity: event.target.value } : item))} />
                <TextField label={`Chất liệu biến thể ${index + 2}`} value={variant.material} onChange={event => setAdditionalVariants(current => current.map(item => item.key === variant.key ? { ...item, material: event.target.value } : item))} />
                <div className="flex items-end justify-between gap-3">
                  <label className="mb-3 inline-flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={variant.active} onChange={event => setAdditionalVariants(current => current.map(item => item.key === variant.key ? { ...item, active: event.target.checked } : item))} className="h-4 w-4 accent-[#1C1B1B]" />Biến thể đang bật</label>
                  {!saved.current.additional[variant.key] && <Button type="button" size="sm" variant="ghost" className="text-[#A94B4B]" icon={<Trash2 size={15} aria-hidden="true" />} onClick={() => setAdditionalVariants(current => current.filter(item => item.key !== variant.key))}>Bỏ biến thể</Button>}
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <label className="grid gap-2 text-sm font-semibold" htmlFor={`admin-product-variant-image-${index + 2}`}>
                    {`Ảnh biến thể ${index + 2}`}
                    <input id={`admin-product-variant-image-${index + 2}`} aria-label={`Ảnh biến thể ${index + 2}`} type="file" accept="image/jpeg,image/png,image/webp" onChange={event => {
                      const file = event.target.files?.[0] ?? null
                      setAdditionalVariants(current => current.map(item => {
                        if (item.key !== variant.key) return item
                        if (!file) return { ...item, imageFile: null, imagePreview: '' }
                        const reader = new FileReader()
                        reader.onload = () => setAdditionalVariants(latest => latest.map(candidate => candidate.key === variant.key ? { ...candidate, imagePreview: typeof reader.result === 'string' ? reader.result : '' } : candidate))
                        reader.readAsDataURL(file)
                        return { ...item, imageFile: file, imagePreview: '' }
                      }))
                    }} className="block w-full rounded-lg border bg-white p-3 text-sm" />
                  </label>
                  {(variant.imagePreview || variant.imageUrl) && <img src={variant.imagePreview || variant.imageUrl} alt={`Ảnh xem trước biến thể ${index + 2}`} className="h-28 w-28 rounded-lg object-cover" />}
                </div>
              </fieldset>
            ))}
            <div className="sm:col-span-2">
              <Button type="button" size="sm" variant="secondary" icon={<Plus size={15} aria-hidden="true" />} onClick={() => setAdditionalVariants(current => [...current, { key: `${Date.now()}-${current.length}`, color: COLOR_SUGGESTIONS[(current.length + 1) % COLOR_SUGGESTIONS.length], size: form.size, material: form.material, price: form.price, quantity: '0', active: true, imageFile: null, imagePreview: '', imageUrl: '' }])}>Thêm biến thể</Button>
              <p className="mt-2 text-xs text-[#5E5F5D]">JPG, PNG hoặc WebP. Ảnh lớn được tự thu nhỏ trước khi tải lên.</p>
            </div>
          </div>
          {Object.values(steps).some(step => step.status !== 'idle') && (
            <ol aria-label="Tiến trình lưu" className="grid gap-2 rounded-lg border border-[#E3E2E2] bg-[#FBF9F9] p-3 text-sm">
              {(Object.keys(STEP_LABEL) as StepKey[]).map(key => {
                const step = steps[key]
                if (key === 'image' && step.status === 'idle' && !imageFile && !additionalVariants.some(variant => variant.imageFile)) return null
                return (
                  <li key={key} className="flex items-start gap-2">
                    {step.status === 'running' && <Loader2 size={16} className="mt-0.5 animate-spin" aria-hidden="true" />}
                    {step.status === 'done' && <CheckCircle2 size={16} className="mt-0.5 text-[#3C7A4B]" aria-hidden="true" />}
                    {step.status === 'error' && <AlertCircle size={16} className="mt-0.5 text-[#A94B4B]" aria-hidden="true" />}
                    {step.status === 'idle' && <span className="mt-1 h-3 w-3 rounded-full border border-[#C4C7C7]" aria-hidden="true" />}
                    <span>
                      <span className="font-semibold">{STEP_LABEL[key]}</span>
                      <span className="ml-2 text-[#5E5F5D]">
                        {step.status === 'running' ? 'Đang lưu…' : step.status === 'done' ? 'Đã xong' : step.status === 'error' ? 'Lỗi' : 'Chờ'}
                      </span>
                      {step.message && <span className="mt-0.5 block text-xs text-[#A94B4B]">{step.message}</span>}
                    </span>
                  </li>
                )
              })}
            </ol>
          )}
          <div className="flex flex-wrap justify-end gap-3 border-t border-[#E3E2E2] pt-5">
            <Button type="button" variant="ghost" disabled={saving} onClick={() => setModalOpen(false)}>
              {Object.values(steps).some(step => step.status === 'done') ? 'Đóng' : 'Hủy'}
            </Button>
            <Button loading={saving} disabled={saveUncertain} type="submit">
              {Object.values(steps).some(step => step.status === 'error') ? 'Thử lại' : 'Lưu sản phẩm'}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  )
}
