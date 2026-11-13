import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'

import { commerceApi } from '@/api/commerce'
import { CommerceApiError } from '@/api/http'
import type { CatalogReference } from '@/api/commerce.types'
import { fieldErrorsFromProblem, focusFirstInvalid, mapFieldErrors } from '@/shared/lib/apiFieldErrors'
import { Button, Modal, TextField, ToggleSwitch, useToast } from '@/shared/ui'

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

export function AdminBrandsPanel() {
  const toast = useToast()
  const formRef = useRef<HTMLFormElement>(null)
  const [brands, setBrands] = useState<CatalogReference[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CatalogReference | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<CatalogReference | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const loadBrands = async () => {
    setLoading(true)
    try {
      const response = await commerceApi.brands.listAdmin()
      setBrands(response.items)
      setLoadError(null)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Không thể tải danh sách thương hiệu.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadBrands() }, [])

  const sortedBrands = useMemo(
    () => [...brands].sort((first, second) => first.name.localeCompare(second.name, 'vi')),
    [brands],
  )

  const openCreate = () => {
    setEditing(null); setName(''); setSlug(''); setSlugTouched(false); setFieldErrors({}); setFormError(null); setModalOpen(true)
  }

  const openEdit = (brand: CatalogReference) => {
    setEditing(brand); setName(brand.name); setSlug(brand.slug); setSlugTouched(true); setFieldErrors({}); setFormError(null); setModalOpen(true)
  }

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {}
    const trimmedName = name.trim()
    const trimmedSlug = slug.trim()
    if (!trimmedName) errors.name = 'Vui lòng nhập tên thương hiệu.'
    else if ([...trimmedName].length < 2) errors.name = 'Tên thương hiệu phải có ít nhất 2 ký tự.'
    else if ([...trimmedName].length > 100) errors.name = 'Tên thương hiệu tối đa 100 ký tự.'
    else if (brands.some(brand => brand.id !== editing?.id && brand.name.trim().toLocaleLowerCase('vi') === trimmedName.toLocaleLowerCase('vi'))) errors.name = 'Đã có thương hiệu cùng tên.'
    if (!trimmedSlug) errors[editing ? 'slug' : 'name'] = editing ? 'Vui lòng nhập mã định danh.' : 'Tên này không thể tạo mã định danh. Vui lòng nhập tên khác.'
    else if (!SLUG_PATTERN.test(trimmedSlug)) errors[editing ? 'slug' : 'name'] = editing ? 'Mã định danh chỉ gồm chữ thường không dấu, số và dấu gạch ngang.' : 'Tên này không thể tạo mã định danh hợp lệ.'
    else if (brands.some(brand => brand.id !== editing?.id && brand.slug === trimmedSlug)) errors[editing ? 'slug' : 'name'] = editing ? 'Mã định danh này đã được dùng.' : 'Tên này tạo ra mã định danh đã tồn tại. Vui lòng chọn tên khác.'
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
      const input = { name: name.trim(), slug: slug.trim(), is_active: editing?.is_active ?? true }
      const saved = editing
        ? await commerceApi.brands.replace(editing.id, input)
        : await commerceApi.brands.create(input)
      setBrands(current => [...current.filter(brand => brand.id !== saved.id), saved])
      toast.success(editing ? 'Đã cập nhật thương hiệu.' : 'Đã thêm thương hiệu.')
      setModalOpen(false)
    } catch (error) {
      const problem = error instanceof CommerceApiError ? error.problem : undefined
      const { fields, unmapped } = mapFieldErrors<FieldKey>(fieldErrorsFromProblem(problem), { name: 'name', slug: 'slug' })
      if (error instanceof CommerceApiError && error.code === 'DUPLICATE_SLUG') fields.slug = 'Slug này đã được dùng.'
      if (!editing && fields.slug) {
        fields.name = 'Tên này tạo ra mã định danh đã tồn tại. Vui lòng chọn tên khác.'
        delete fields.slug
      }
      setFieldErrors(fields)
      setFormError(Object.keys(fields).length > 0 ? 'Vui lòng sửa các ô được đánh dấu đỏ.' : unmapped[0]?.message ?? (error instanceof Error ? error.message : 'Không thể lưu thương hiệu.'))
      if (Object.keys(fields).length > 0) setTimeout(() => focusFirstInvalid(formRef.current), 0)
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (brand: CatalogReference, active: boolean) => {
    try {
      const response = await commerceApi.brands.replace(brand.id, { name: brand.name, slug: brand.slug, is_active: active })
      setBrands(current => current.map(item => item.id === response.id ? response : item))
      toast.info(active ? 'Đã bật thương hiệu.' : 'Đã tắt thương hiệu.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật thương hiệu.')
    }
  }

  const confirmDelete = async () => {
    if (!deleting || deleteBusy) return
    setDeleteBusy(true)
    try {
      await commerceApi.brands.remove(deleting.id)
      setBrands(current => current.map(brand => brand.id === deleting.id ? { ...brand, is_active: false } : brand))
      toast.success(`Đã ẩn thương hiệu ${deleting.name}.`)
      setDeleting(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể ẩn thương hiệu.')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <section className="mt-9 grid gap-5 border-t border-[#E3E2E2] pt-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#1C1B1B]">Nhãn hàng</p>
          <h2 className="mt-2 font-display text-3xl font-semibold leading-tight text-[#222222]">Quản lý thương hiệu</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5E5F5D]">Thương hiệu đang bật sẽ xuất hiện trong dropdown khi tạo hoặc chỉnh sửa sản phẩm.</p>
        </div>
        <Button type="button" onClick={openCreate} icon={<Plus size={17} aria-hidden="true" />}>Thêm thương hiệu</Button>
      </div>

      {loadError && <div className="flex items-center justify-between gap-3 rounded-lg border border-[#E7BBBB] bg-[#FCEAEA] p-4"><p role="alert" className="text-sm font-semibold text-[#A94B4B]">{loadError}</p><Button type="button" size="sm" variant="secondary" onClick={() => void loadBrands()}>Tải lại</Button></div>}
      <div className="overflow-hidden rounded-lg border border-[#E3E2E2] bg-white">
        <div className="overflow-x-auto" role="region" aria-label="Bảng thương hiệu" tabIndex={0}>
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <thead className="bg-[#FBF9F9] text-xs font-semibold uppercase tracking-wide text-[#5E5F5D]"><tr><th className="px-4 py-3">Thương hiệu</th><th className="w-28 px-4 py-3 text-center">Trạng thái</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead>
            <tbody className="divide-y divide-[#E5E0D8]">
              {loading ? <tr><td colSpan={3} className="px-4 py-8 text-center text-[#5E5F5D]">Đang tải thương hiệu…</td></tr> : sortedBrands.length === 0 ? <tr><td colSpan={3} className="px-4 py-8 text-center text-[#5E5F5D]">Chưa có thương hiệu.</td></tr> : sortedBrands.map(brand => (
                <tr key={brand.id} className="hover:bg-[#FBF9F9]/70">
                  <td className="px-4 py-3"><p className="font-semibold text-[#222222]">{brand.name}</p><p className="mt-0.5 text-xs text-[#5E5F5D]">/{brand.slug}</p></td>
                  <td className="px-4 py-3 text-center"><ToggleSwitch checked={brand.is_active} label={`Thương hiệu ${brand.name}`} onCheckedChange={active => void updateStatus(brand, active)} /></td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-2"><Button type="button" size="sm" variant="ghost" className="h-9 w-9 px-0" aria-label={`Sửa thương hiệu ${brand.name}`} icon={<Pencil size={16} aria-hidden="true" />} onClick={() => openEdit(brand)} /><Button type="button" size="sm" variant="ghost" className="h-9 w-9 px-0 text-[#A94B4B]" aria-label={`Xóa thương hiệu ${brand.name}`} icon={<Trash2 size={16} aria-hidden="true" />} onClick={() => setDeleting(brand)} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} title={editing ? 'Sửa thương hiệu' : 'Thêm thương hiệu'} description="Tên thương hiệu sẽ được dùng trong thông tin và bộ lọc sản phẩm." onClose={() => { if (!saving) setModalOpen(false) }}>
        <form ref={formRef} className="grid gap-4" onSubmit={handleSubmit} noValidate>
          {formError && <p role="alert" className="rounded-lg border border-[#E7BBBB] bg-[#FCEAEA] p-3 text-sm font-semibold text-[#A94B4B]">{formError}</p>}
          <TextField label="Tên thương hiệu" value={name} error={fieldErrors.name} onChange={event => { const value = event.target.value; setName(value); if (!slugTouched) setSlug(toSlug(value)); setFieldErrors(current => ({ ...current, name: undefined })) }} />
          {editing && <details className="rounded-lg border border-[#E3E2E2] bg-[#FBF9F9] px-4 py-3"><summary className="cursor-pointer text-sm font-semibold text-[#3A3632]">Nâng cao</summary><div className="mt-4 grid gap-3"><TextField label="Mã định danh (slug)" value={slug} error={fieldErrors.slug} placeholder="local-brand" onChange={event => { setSlug(event.target.value); setSlugTouched(true); setFieldErrors(current => ({ ...current, slug: undefined })) }} /><p className="text-xs leading-5 text-[#5E5F5D]">Chỉ thay đổi khi thật sự cần thiết. Việc đổi mã có thể ảnh hưởng đến liên kết và các tích hợp đang sử dụng thương hiệu này.</p></div></details>}
          <div className="flex justify-end gap-3 border-t border-[#E3E2E2] pt-4"><Button type="button" variant="ghost" disabled={saving} onClick={() => setModalOpen(false)}>Hủy</Button><Button loading={saving} type="submit">Lưu thương hiệu</Button></div>
        </form>
      </Modal>

      <Modal open={!!deleting} title="Ẩn thương hiệu?" description={deleting ? `Thương hiệu “${deleting.name}” sẽ ngừng xuất hiện trong danh sách chọn. Sản phẩm cũ vẫn giữ nguyên dữ liệu.` : undefined} onClose={() => { if (!deleteBusy) setDeleting(null) }}>
        <div className="flex justify-end gap-3"><Button type="button" variant="ghost" disabled={deleteBusy} onClick={() => setDeleting(null)}>Giữ lại</Button><Button type="button" variant="danger" loading={deleteBusy} onClick={() => void confirmDelete()}>Ẩn thương hiệu</Button></div>
      </Modal>
    </section>
  )
}
