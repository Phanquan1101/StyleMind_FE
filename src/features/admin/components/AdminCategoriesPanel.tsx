import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState, type FormEvent } from 'react'

import { commerceApi } from '@/api/commerce'
import { CommerceApiError } from '@/api/http'
import type { DemoAction, DemoDatabase } from '@/app/store/types'
import type { ProductCategory } from '@/entities/product/model/types'
import { commerceCategoryToEntity } from '@/features/commerce/data/commerceEntityAdapters'
import { fieldErrorsFromProblem, focusFirstInvalid, mapFieldErrors } from '@/shared/lib/apiFieldErrors'
import { Button, Modal, TextField, ToggleSwitch, useToast } from '@/shared/ui'

interface AdminCategoriesPanelProps {
  database: DemoDatabase
  dispatch: React.Dispatch<DemoAction>
}

type FieldKey = 'name' | 'slug'
type FieldErrors = Partial<Record<FieldKey, string>>

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

function toSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function AdminCategoriesPanel({ database, dispatch }: AdminCategoriesPanelProps) {
  const toast = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ProductCategory | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<ProductCategory | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const categories = useMemo(
    () => [...database.categories].sort((first, second) => first.label.localeCompare(second.label, 'vi')),
    [database.categories],
  )

  const openCreateModal = () => {
    setEditing(null); setName(''); setSlug(''); setSlugTouched(false); setFieldErrors({}); setFormError(null); setModalOpen(true)
  }

  const openEditModal = (category: ProductCategory) => {
    setEditing(category); setName(category.label); setSlug(category.description); setSlugTouched(true); setFieldErrors({}); setFormError(null); setModalOpen(true)
  }

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {}
    const trimmed = name.trim()
    if (!trimmed) errors.name = 'Vui lòng nhập tên danh mục.'
    else if ([...trimmed].length < 2) errors.name = 'Tên danh mục phải có ít nhất 2 ký tự.'
    else if ([...trimmed].length > 100) errors.name = 'Tên danh mục tối đa 100 ký tự.'
    else if (database.categories.some(category => category.id !== editing?.id && category.label.trim().toLocaleLowerCase('vi') === trimmed.toLocaleLowerCase('vi'))) errors.name = 'Đã có danh mục cùng tên.'
    const slugValue = slug.trim()
    if (!slugValue) errors.slug = 'Vui lòng nhập slug (đường dẫn ngắn, ví dụ ao-dai).'
    else if (!SLUG_PATTERN.test(slugValue)) errors.slug = 'Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang (ví dụ: ao-dai).'
    else if (database.categories.some(category => category.id !== editing?.id && category.description === slugValue)) errors.slug = 'Slug này đã được dùng.'
    return errors
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      setFormError('Vui lòng sửa các ô được đánh dấu đỏ.')
      setTimeout(() => focusFirstInvalid(formRef.current), 0)
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const input = { name: name.trim(), slug: slug.trim(), is_active: editing?.active ?? true }
      const response = editing
        ? await commerceApi.categories.replace(editing.id, input)
        : await commerceApi.categories.create(input)
      dispatch({ type: 'admin/categoryUpserted', payload: { ...commerceCategoryToEntity(response, editing?.order ?? 0), productCount: editing?.productCount ?? 0 } })
      toast.success(editing ? 'Đã cập nhật danh mục.' : 'Đã thêm danh mục.')
      setModalOpen(false)
    } catch (error) {
      const problem = error instanceof CommerceApiError ? error.problem : undefined
      const { fields, unmapped } = mapFieldErrors<FieldKey>(fieldErrorsFromProblem(problem), { name: 'name', slug: 'slug' })
      if (error instanceof CommerceApiError && error.code === 'DUPLICATE_SLUG') fields.slug = 'Slug này đã được dùng.'
      if (Object.keys(fields).length > 0) {
        setFieldErrors(fields)
        setFormError('Vui lòng sửa các ô được đánh dấu đỏ.')
        setTimeout(() => focusFirstInvalid(formRef.current), 0)
      } else {
        setFormError(unmapped[0]?.message ?? (error instanceof Error ? error.message : 'Không thể lưu danh mục'))
      }
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleting || deleteBusy) return
    setDeleteBusy(true)
    setDeleteError(null)
    try {
      await commerceApi.categories.removePermanently(deleting.id)
      dispatch({ type: 'admin/categoryRemoved', payload: { categoryId: deleting.id } })
      toast.success(`Đã xóa danh mục ${deleting.label}.`)
      setDeleting(null)
    } catch (error) {
      setDeleteError(error instanceof CommerceApiError && error.code === 'CATEGORY_HAS_PRODUCTS'
        ? 'Danh mục này vừa có sản phẩm nên không thể xóa. Hãy tắt (ẩn) danh mục thay vì xóa.'
        : error instanceof Error ? error.message : 'Không thể xóa danh mục.')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#1C1B1B]">Cấu trúc cửa hàng</p>
          <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-[#222222] md:text-4xl">
            Quản lý danh mục
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5E5F5D]">
            Quản lý các nhóm sản phẩm hiển thị trong cửa hàng. Danh mục đang có sản phẩm chỉ có thể ẩn; danh mục trống có thể xóa.
          </p>
        </div>
        <Button type="button" onClick={openCreateModal} icon={<Plus size={17} aria-hidden="true" />}>
          Thêm danh mục
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#E3E2E2] bg-white">
        <p className="border-b border-[#E3E2E2] px-4 py-2 text-xs text-[#5E5F5D] lg:hidden">Vuốt ngang để xem toàn bộ danh mục.</p>
        <div className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1C1B1B]" role="region" aria-label="Bảng danh mục" tabIndex={0}>
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead className="bg-[#FBF9F9] text-xs font-semibold uppercase tracking-wide text-[#5E5F5D]">
              <tr>
                <th scope="col" className="px-4 py-3">Danh mục</th>
                <th scope="col" className="px-4 py-3 text-right">Số sản phẩm</th>
                <th scope="col" className="w-28 px-4 py-3 text-center">Trạng thái</th>
                <th scope="col" className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E0D8]">
              {categories.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-[#5E5F5D]">Chưa có danh mục.</td></tr>
              ) : categories.map(category => {
                const count = category.productCount ?? 0
                return (
                  <tr key={category.id} className="align-middle hover:bg-[#FBF9F9]/70">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#222222]">{category.label}</p>
                      <p className="mt-0.5 text-xs text-[#5E5F5D]">/{category.description}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-[#3A3632]">{count}</td>
                    <td className="px-4 py-3 text-center">
                      <ToggleSwitch
                        checked={category.active}
                        label={`Danh mục ${category.label}`}
                        onCheckedChange={active => {
                          void commerceApi.categories.replace(category.id, {
                            name: category.label,
                            slug: category.description,
                            is_active: active,
                          }).then(response => {
                            dispatch({ type: 'admin/categoryUpserted', payload: { ...commerceCategoryToEntity(response, category.order), productCount: category.productCount } })
                            toast.info(active ? 'Đã bật danh mục.' : 'Đã tắt danh mục.')
                          }).catch(error => toast.error(error instanceof Error ? error.message : 'Không thể cập nhật danh mục'))
                        }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-9 w-9 px-0"
                          aria-label={`Sửa danh mục ${category.label}`}
                          title="Sửa danh mục"
                          icon={<Pencil size={16} aria-hidden="true" />}
                          onClick={() => openEditModal(category)}
                        />
                        {count === 0 ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-9 w-9 px-0 text-[#A94B4B]"
                            aria-label={`Xóa danh mục ${category.label}`}
                            title="Xóa danh mục"
                            icon={<Trash2 size={16} aria-hidden="true" />}
                            onClick={() => { setDeleteError(null); setDeleting(category) }}
                          />
                        ) : (
                          <span className="max-w-[9rem] text-xs text-[#5E5F5D]" title="Danh mục đang có sản phẩm: chỉ có thể ẩn (tắt)">Có sản phẩm — chỉ ẩn được</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        title={editing ? 'Sửa danh mục' : 'Thêm danh mục'}
        description="Danh mục sẽ xuất hiện trong bộ lọc sản phẩm admin và cửa hàng khi đang bật."
        onClose={() => { if (!saving) setModalOpen(false) }}
      >
        <form ref={formRef} className="grid gap-4" onSubmit={handleSubmit} noValidate>
          {formError && <p role="alert" className="rounded-lg border border-[#E7BBBB] bg-[#FCEAEA] p-3 text-sm font-semibold text-[#A94B4B]">{formError}</p>}
          <TextField
            label="Tên danh mục"
            value={name}
            error={fieldErrors.name}
            onChange={event => {
              const value = event.target.value
              setName(value)
              if (!slugTouched) setSlug(toSlug(value))
              setFieldErrors(current => ({ ...current, name: undefined }))
            }}
          />
          <TextField
            label="Slug danh mục"
            value={slug}
            error={fieldErrors.slug}
            placeholder="ao-dai"
            onChange={event => { setSlug(event.target.value); setSlugTouched(true); setFieldErrors(current => ({ ...current, slug: undefined })) }}
          />
          <p className="-mt-2 text-xs text-[#5E5F5D]">Slug tự tạo từ tên; có thể sửa. Chỉ gồm chữ thường không dấu, số và dấu gạch ngang.</p>
          <div className="flex flex-wrap justify-end gap-3 border-t border-[#E3E2E2] pt-4">
            <Button type="button" variant="ghost" disabled={saving} onClick={() => setModalOpen(false)}>
              Hủy
            </Button>
            <Button loading={saving} type="submit">Lưu danh mục</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!deleting}
        title="Xóa danh mục?"
        description={deleting ? `Danh mục "${deleting.label}" chưa có sản phẩm nào và sẽ bị xóa vĩnh viễn. Không thể hoàn tác.` : undefined}
        onClose={() => { if (!deleteBusy) setDeleting(null) }}
      >
        {deleteError && <p role="alert" className="mb-4 rounded-lg border border-[#E7BBBB] bg-[#FCEAEA] p-3 text-sm font-semibold text-[#A94B4B]">{deleteError}</p>}
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="ghost" disabled={deleteBusy} onClick={() => setDeleting(null)}>Giữ lại</Button>
          <Button type="button" variant="danger" loading={deleteBusy} onClick={() => void confirmDelete()}>Xóa danh mục</Button>
        </div>
      </Modal>
    </section>
  )
}
