import { AlertCircle, CheckCircle2, ChevronDown, Loader2, Pencil, Plus } from 'lucide-react'
import { Fragment, useMemo, useRef, useState, type FormEvent } from 'react'

import { commerceApi } from '@/api/commerce'
import { CommerceApiError } from '@/api/http'
import type { CommerceProduct } from '@/api/commerce.types'
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
  brand: string
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

type FieldKey = 'name' | 'brand' | 'categoryId' | 'price' | 'description' | 'material' | 'color' | 'size' | 'quantity' | 'image'
type FieldErrors = Partial<Record<FieldKey, string>>
type StepKey = 'product' | 'variant' | 'image'
type StepStatus = 'idle' | 'running' | 'done' | 'error'
interface StepState { status: StepStatus; message?: string }
type Steps = Record<StepKey, StepState>

/** API field name -> form field. Fields not listed here are shown in the banner. */
const SERVER_FIELD_MAP: Record<string, FieldKey> = {
  category_id: 'categoryId',
  brand_id: 'brand',
  name: 'name',
  description: 'description',
  size: 'size',
  color: 'color',
  material: 'material',
  unit_price_vnd: 'price',
  quantity: 'quantity',
  file: 'image',
}

const SIZE_SUGGESTIONS = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', 'Một cỡ']
const STEP_LABEL: Record<StepKey, string> = {
  product: '1. Lưu thông tin sản phẩm',
  variant: '2. Lưu phiên bản (màu, size, giá, tồn kho)',
  image: '3. Tải ảnh lên',
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
    name: '', brand: '', categoryId, price: '', description: '', material: '', productActive: true,
    color: '', size: 'M', quantity: '10', variantActive: true, imageUrl: '',
  }
}

/** Builds the form from the raw API product so nothing is lost (sizes such as "2XL" or "Một cỡ" stay as they are). */
function createFormFromProduct(product: CommerceProduct): ProductFormState {
  const variant = product.variants[0]
  const image = variant?.images.find(item => item.is_primary) ?? variant?.images[0]
  return {
    name: product.name,
    brand: product.brand_name,
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
  if (!form.brand.trim()) errors.brand = 'Vui lòng nhập thương hiệu.'
  else if ([...form.brand.trim()].length > 120) errors.brand = 'Thương hiệu tối đa 120 ký tự.'
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
  const [filters, setFilters] = useState<AdminProductFilters>({ query: '', categoryId: 'all', status: 'all' })
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [form, setForm] = useState<ProductFormState>(() => createInitialForm(firstCategoryId))
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [steps, setSteps] = useState<Steps>(freshSteps)
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null)
  const [imageVariant, setImageVariant] = useState<{ productId: string; variantId: string; label: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [saveUncertain, setSaveUncertain] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  // Ids created so far. A retry resumes from them instead of creating the product again.
  const saved = useRef<{ productId: string | null; variantId: string | null; sku: string | null; uploaded: File | null }>({ productId: null, variantId: null, sku: null, uploaded: null })

  const rows = useMemo(() => selectAdminProducts(database, filters), [database, filters])

  const resetSaveState = () => {
    saved.current = { productId: null, variantId: null, sku: null, uploaded: null }
    setSteps(freshSteps())
    setFieldErrors({})
    setFormError(null)
    setSaveUncertain(false)
    setImageFile(null)
    setImagePreview('')
  }

  const openCreateModal = () => {
    resetSaveState()
    setEditingProductId(null)
    setForm(createInitialForm(firstCategoryId))
    setModalOpen(true)
  }

  const openEditModal = async (productId: string) => {
    setLoadingEdit(true)
    try {
      const product = await commerceApi.products.getAdmin(productId)
      resetSaveState()
      saved.current = { productId: product.product_id, variantId: product.variants[0]?.variant_id ?? null, sku: product.variants[0]?.sku ?? null, uploaded: null }
      setEditingProductId(productId)
      setForm(createFormFromProduct(product))
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
    dispatch({ type: 'admin/productUpserted', payload: commerceProductToEntity(refreshed) })
    return refreshed
  }

  const runSaveSteps = async () => {
    const productInput = async () => {
      const brands = await commerceApi.brands.listAdmin()
      let brand = brands.items.find(item => item.name.trim().toLowerCase() === form.brand.trim().toLowerCase())
      if (!brand) brand = await commerceApi.brands.create({ name: form.brand.trim(), slug: toSlug(form.brand), is_active: true })
      return {
        category_id: form.categoryId,
        brand_id: brand.id,
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
      setStep('variant', { status: 'done' })
    } catch (error) {
      await publish(productId).catch(() => undefined)
      setStep('variant', { status: 'error', message: describeError(error) })
      throw new StepFailure('variant', error)
    }
    await publish(productId).catch(() => undefined)

    // Step 3 - image (only when a new file was picked and not uploaded yet).
    if (imageFile && saved.current.uploaded !== imageFile) {
      setStep('image', { status: 'running' })
      try {
        const file = await prepareImageForUpload(imageFile)
        await commerceApi.products.uploadImage(saved.current.variantId as string, file, form.name.trim())
        saved.current.uploaded = imageFile
        setStep('image', { status: 'done' })
        await publish(productId).catch(() => undefined)
      } catch (error) {
        setStep('image', { status: 'error', message: describeError(error) })
        throw new StepFailure('image', error)
      }
    } else {
      setStep('image', { status: imageFile ? 'done' : 'idle' })
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving || saveUncertain) return
    const errors = validateForm(form, !editingProductId && !saved.current.productId, imageFile)
    setFieldErrors(errors)
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
          value={filters.query ?? ''}
          onChange={event => setFilters(current => ({ ...current, query: event.target.value }))}
          placeholder="Nhập tên, thương hiệu hoặc mã"
        />
        <SelectField
          label="Lọc danh mục"
          value={filters.categoryId ?? 'all'}
          onChange={event => setFilters(current => ({ ...current, categoryId: event.target.value }))}
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
          onChange={event => setFilters(current => ({ ...current, status: event.target.value as AdminProductFilters['status'] }))}
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
              {rows.length === 0 ? (
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
                            <span className="mt-0.5 block truncate text-xs text-[#5E5F5D]">{row.id} · {row.brand}</span>
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
                          {row.variantCount} biến thể
                          <ChevronDown aria-hidden="true" size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
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
                              dispatch({ type: 'admin/productUpserted', payload: commerceProductToEntity(product) })
                              toast.info(active ? 'Đã bật sản phẩm.' : 'Đã tắt sản phẩm.')
                            }).catch(error => toast.error(error instanceof Error ? error.message : 'Không thể cập nhật sản phẩm'))
                          }}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="border border-[#E5E0D8]"
                          icon={<Pencil size={14} aria-hidden="true" />}
                          aria-label={`Sửa ${row.name}`}
                          onClick={() => void openEditModal(row.id)}
                        >
                          Sửa
                        </Button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="bg-[#FBF9F9] px-4 py-3">
                          <div id={variantsTableId} className="overflow-x-auto rounded-lg border border-[#E5E0D8] bg-white">
                            <table className="w-full min-w-[540px] text-left text-sm">
                              <caption className="sr-only">Biến thể của {row.name}</caption>
                              <thead className="bg-[#F5F2EE] text-xs font-semibold text-[#5E5F5D]">
                                <tr>
                                  <th scope="col" className="px-3 py-2">Màu</th>
                                  <th scope="col" className="px-3 py-2">Cỡ</th>
                                  <th scope="col" className="px-3 py-2 text-right">Giá</th>
                                  <th scope="col" className="px-3 py-2 text-center">Đang bán</th>
                                  <th scope="col" className="px-3 py-2 text-right">Ảnh</th>
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
                                    <td className="px-3 py-2.5 font-medium text-[#3A3632]">{variant.size}</td>
                                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-[#3A3632]">{formatCurrency(variant.price)}</td>
                                    <td className="px-3 py-2.5 text-center">
                                      <span className="inline-flex justify-center">
                                        <ToggleSwitch
                                          checked={variant.active}
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
                                              dispatch({ type: 'admin/productUpserted', payload: commerceProductToEntity(product) })
                                              toast.info(active ? 'Đã bật biến thể.' : 'Đã tắt biến thể.')
                                            }).catch(error => toast.error(error instanceof Error ? error.message : 'Không thể cập nhật biến thể'))
                                          }}
                                        />
                                      </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-right"><Button type="button" size="sm" variant="ghost" className="border border-[#E5E0D8]" onClick={() => setImageVariant({ productId: row.id, variantId: variant.id, label: `${row.name} · ${variant.color} · ${variant.size}` })}>Quản lý ảnh</Button></td>
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
      </div>

      <Modal open={!!imageVariant} title="Quản lý ảnh biến thể" description={imageVariant?.label} onClose={() => setImageVariant(null)}>
        {imageVariant && <VariantImagesManager productId={imageVariant.productId} variantId={imageVariant.variantId} onUpdated={product => dispatch({ type: 'admin/productUpserted', payload: commerceProductToEntity(product) })} />}
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
            <TextField label="Thương hiệu" value={form.brand} error={fieldErrors.brand} onChange={event => updateField('brand', event.target.value)} />
            <SelectField label="Danh mục" value={form.categoryId} error={fieldErrors.categoryId} onChange={event => updateField('categoryId', event.target.value)}>
              {database.categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </SelectField>
            <TextField label="Chất liệu" value={form.material} error={fieldErrors.material} onChange={event => updateField('material', event.target.value)} />
            <div className="mt-2 border-b border-[#E3E2E2] pb-3 sm:col-span-2">
              <h3 className="font-display text-xl font-semibold">Phiên bản sản phẩm</h3>
              <p className="mt-1 text-sm text-[#5E5F5D]">Màu sắc, kích thước, giá, tồn kho và hình ảnh. Các phiên bản khác được quản lý trong bảng sản phẩm.</p>
            </div>
            <TextField label="Màu" value={form.color} error={fieldErrors.color} onChange={event => updateField('color', event.target.value)} />
            <TextField label="Size" list="admin-size-options" value={form.size} error={fieldErrors.size} onChange={event => updateField('size', event.target.value)} />
            <datalist id="admin-size-options">{SIZE_SUGGESTIONS.map(size => <option key={size} value={size} />)}</datalist>
            <TextField label="Giá bán (VND)" type="number" min="0" step="1" value={form.price} error={fieldErrors.price} onChange={event => updateField('price', event.target.value)} />
            <TextField label="Tồn kho" type="number" min="0" step="1" value={form.quantity} error={fieldErrors.quantity} onChange={event => updateField('quantity', event.target.value)} />
            <div className="grid gap-2 sm:col-span-2">
              <label className="grid gap-2 text-sm font-semibold" htmlFor="admin-product-image">
                Ảnh sản phẩm
                <input
                  id="admin-product-image"
                  aria-label="Ảnh sản phẩm"
                  aria-invalid={fieldErrors.image ? true : undefined}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={event => {
                    const file = event.target.files?.[0] ?? null
                    setImageFile(file); setImagePreview('')
                    setFieldErrors(current => ({ ...current, image: file ? validateImageFile(file) ?? undefined : undefined }))
                    if (file) { const reader = new FileReader(); reader.onload = () => setImagePreview(typeof reader.result === 'string' ? reader.result : ''); reader.readAsDataURL(file) }
                  }}
                  className="block w-full rounded-lg border p-3 text-sm"
                />
              </label>
              {fieldErrors.image && <span className="text-xs font-medium text-[#A94B4B]">{fieldErrors.image}</span>}
              <span className="text-xs text-[#5E5F5D]">JPG, PNG hoặc WebP. Ảnh lớn được tự thu nhỏ trước khi tải lên.</span>
              {(imagePreview || form.imageUrl) && <img src={imagePreview || form.imageUrl} alt="Ảnh sản phẩm xem trước" className="h-28 w-28 rounded-lg object-cover" />}
            </div>
          </div>
          <TextField label="Mô tả" value={form.description} error={fieldErrors.description} onChange={event => updateField('description', event.target.value)} />
          <div className="grid gap-2 rounded-lg border border-[#E3E2E2] bg-white p-3 sm:grid-cols-2">
            <label className="inline-flex items-center gap-3 text-sm font-semibold text-[#3A3632]">
              <input
                type="checkbox"
                checked={form.productActive}
                onChange={event => updateField('productActive', event.target.checked)}
                className="h-4 w-4 accent-[#1C1B1B]"
              />
              Sản phẩm đang bán
            </label>
            <label className="inline-flex items-center gap-3 text-sm font-semibold text-[#3A3632]">
              <input
                type="checkbox"
                checked={form.variantActive}
                onChange={event => updateField('variantActive', event.target.checked)}
                className="h-4 w-4 accent-[#1C1B1B]"
              />
              Biến thể đang bật
            </label>
          </div>
          {Object.values(steps).some(step => step.status !== 'idle') && (
            <ol aria-label="Tiến trình lưu" className="grid gap-2 rounded-lg border border-[#E3E2E2] bg-[#FBF9F9] p-3 text-sm">
              {(Object.keys(STEP_LABEL) as StepKey[]).map(key => {
                const step = steps[key]
                if (key === 'image' && step.status === 'idle' && !imageFile) return null
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
