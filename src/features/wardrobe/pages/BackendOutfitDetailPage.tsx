import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { useAuth } from '@/features/auth'
import { IdentityApiError } from '@/shared/api/identityApi'
import { wardrobeErrorMessage, type OutfitItemView } from '@/shared/api/wardrobeApi'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { formatDate } from '@/shared/lib/formatDate'
import { Button, LoadingSkeleton, useToast } from '@/shared/ui'

import { AddOutfitItemPanel } from '../components/AddOutfitItemPanel'
import { BackendOutfitItemCard } from '../components/BackendOutfitItemCard'
import { ChangeVariantDialog } from '../components/ChangeVariantDialog'
import { ConfirmDeleteOutfitDialog } from '../components/ConfirmDeleteOutfitDialog'
import { checkOutfitName, OUTFIT_MAX_ITEMS, outfitSourceLabel, outfitTotal } from '../model/backendOutfit'
import { useBackendOutfitDetail } from '../model/useBackendOutfitDetail'

function BackLink() {
  return (
    <Link to={ROUTES.wardrobes} className="text-sm font-semibold text-[#684B5A] hover:underline">
      Tủ đồ
    </Link>
  )
}

interface ChangeError {
  message: string
  code?: string
}

export function BackendOutfitDetailPage({ outfitId }: { outfitId: string }) {
  const navigate = useNavigate()
  const toast = useToast()
  const { currentUser } = useAuth()
  const { detail, status, error, pending, reload, rename, addItem, changeItemVariant, removeItem, deleteOutfit } =
    useBackendOutfitDetail(outfitId)
  const [nameDraft, setNameDraft] = useState('')
  const [nameError, setNameError] = useState('')
  const [actionError, setActionError] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [addingItem, setAddingItem] = useState(false)
  const [addError, setAddError] = useState('')
  const [changing, setChanging] = useState<OutfitItemView | null>(null)
  const [changeError, setChangeError] = useState<ChangeError | null>(null)

  useEffect(() => {
    if (detail?.name !== undefined) setNameDraft(detail.name)
  }, [detail?.name])

  if (!currentUser) return null

  if (status === 'loading') {
    return (
      <section aria-busy="true" aria-label="Đang tải outfit" className="mx-auto grid max-w-[var(--container-wide)] gap-8 px-5 py-8 md:px-8 md:py-12">
        <LoadingSkeleton className="h-12 max-w-md" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map(index => (
            <LoadingSkeleton key={index} className="h-72" />
          ))}
        </div>
      </section>
    )
  }

  if (status === 'not-found') {
    return (
      <section className="mx-auto max-w-[var(--container-wide)] px-5 py-10 md:px-8">
        <BackLink />
        <h1 className="mt-4 font-display text-4xl font-semibold text-[#222222]">Không tìm thấy outfit</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[#6F6B67]">Outfit này không tồn tại hoặc bạn không có quyền xem.</p>
      </section>
    )
  }

  if (status === 'forbidden') {
    return (
      <section className="mx-auto max-w-[var(--container-wide)] px-5 py-10 md:px-8">
        <BackLink />
        <p role="alert" className="mt-4 rounded-lg border border-[#E3DAD0] bg-white px-4 py-3 text-sm font-semibold text-[#A94B4B]">
          Tài khoản của bạn không có quyền dùng Tủ đồ.
        </p>
      </section>
    )
  }

  if (status === 'error' || !detail) {
    return (
      <section className="mx-auto max-w-[var(--container-wide)] px-5 py-10 md:px-8">
        <BackLink />
        <div role="alert" className="mt-4 grid max-w-xl justify-items-start gap-3 rounded-lg border border-[#E3DAD0] bg-white p-6">
          <p className="text-sm font-semibold text-[#A94B4B]">{wardrobeErrorMessage(error, 'Không tải được outfit. Vui lòng thử lại.')}</p>
          <Button variant="secondary" onClick={reload}>
            Thử lại
          </Button>
        </div>
      </section>
    )
  }

  const busy = pending !== null
  const isLastItem = detail.items.length <= 1
  const isFull = detail.items.length >= OUTFIT_MAX_ITEMS
  const total = outfitTotal(detail.items)
  const outfitVariantIds = new Set(detail.items.map(item => item.variant_id))

  const submitRename = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    const checked = checkOutfitName(nameDraft)
    if (!checked.ok) {
      setNameError(checked.message)
      return
    }
    setNameError('')
    setActionError('')
    if (checked.name === detail.name) {
      setNameDraft(checked.name)
      return
    }
    try {
      await rename(checked.name)
      toast.success('Đã đổi tên outfit')
    } catch (caught) {
      setActionError(wardrobeErrorMessage(caught, 'Không đổi được tên outfit.'))
    }
  }

  const removeOutfitItem = async (outfitItemId: string) => {
    if (busy) return
    setActionError('')
    try {
      await removeItem(outfitItemId)
      toast.success('Đã xóa món khỏi outfit')
    } catch (caught) {
      setActionError(wardrobeErrorMessage(caught, 'Không xóa được món khỏi outfit.'))
    }
  }

  const addOutfitItem = async (variantId: string) => {
    if (busy || isFull) return
    setAddError('')
    try {
      await addItem(variantId)
      toast.success('Đã thêm món vào outfit')
      setAddingItem(false)
    } catch (caught) {
      setAddError(wardrobeErrorMessage(caught, 'Không thêm được món vào outfit.'))
    }
  }

  const openChangeVariant = (item: OutfitItemView) => {
    setChangeError(null)
    setChanging(item)
  }

  const saveVariantChange = async (variantId: string) => {
    if (busy || !changing) return
    setChangeError(null)
    try {
      await changeItemVariant(changing.outfit_item_id, variantId)
      toast.success('Đã đổi phiên bản')
      setChanging(null)
    } catch (caught) {
      setChangeError({
        message: wardrobeErrorMessage(caught, 'Không đổi được phiên bản.'),
        code: caught instanceof IdentityApiError ? caught.code : undefined,
      })
    }
  }

  const removeFromChangeDialog = async () => {
    if (!changing) return
    const target = changing.outfit_item_id
    setChanging(null)
    await removeOutfitItem(target)
  }

  const confirmDelete = async () => {
    if (busy) return
    setActionError('')
    try {
      await deleteOutfit()
      toast.success('Đã xóa outfit')
      navigate(ROUTES.wardrobes, { replace: true })
    } catch (caught) {
      setConfirmingDelete(false)
      setActionError(wardrobeErrorMessage(caught, 'Không xóa được outfit.'))
    }
  }

  return (
    <section className="mx-auto grid max-w-[var(--container-wide)] gap-8 px-5 py-8 md:px-8 md:py-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          <BackLink />
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-[#222222]">{detail.name}</h1>
          <p className="mt-3 text-sm text-[#8A8179]">Cập nhật {formatDate(detail.updated_at)}</p>
        </div>
        <div className="grid justify-items-start gap-2 md:justify-items-end">
          <Button
            disabled={busy || isFull}
            aria-expanded={addingItem}
            onClick={() => {
              setAddError('')
              setAddingItem(open => !open)
            }}
          >
            Thêm món
          </Button>
          {isFull && <p className="text-sm text-[#6F6B67]">Outfit đã đủ {OUTFIT_MAX_ITEMS} món.</p>}
        </div>
      </div>

      {actionError && (
        <p role="alert" className="rounded-lg border border-[#E3DAD0] bg-white px-4 py-3 text-sm font-semibold text-[#A94B4B]">
          {actionError}
        </p>
      )}

      {addingItem && (
        <AddOutfitItemPanel
          variantIds={outfitVariantIds}
          full={isFull}
          adding={pending === 'add'}
          error={addError}
          onAdd={variantId => void addOutfitItem(variantId)}
          onClose={() => setAddingItem(false)}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-label="Các món trong outfit" className="grid gap-4 md:grid-cols-2">
          {detail.items.map(item => (
            <BackendOutfitItemCard
              key={item.outfit_item_id}
              item={item}
              removeDisabled={busy || isLastItem}
              removing={pending === `remove:${item.outfit_item_id}`}
              changeDisabled={busy}
              onRemove={removeOutfitItem}
              onChangeVariant={openChangeVariant}
            />
          ))}
        </section>

        <aside className="grid h-fit gap-4">
          <section className="rounded-lg border border-[#E3DAD0] bg-white p-5 shadow-sm">
            <h2 className="font-display text-2xl font-semibold text-[#222222]">Tóm tắt outfit</h2>
            <dl className="mt-5 grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[#6F6B67]">Số món</dt>
                <dd className="font-semibold text-[#222222]">{detail.items.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[#6F6B67]">Nguồn</dt>
                <dd className="font-semibold text-[#222222]">{outfitSourceLabel(detail.creation_source)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[#6F6B67]">Tổng giá</dt>
                <dd className="font-semibold text-[#222222]">{formatCurrency(total)}</dd>
              </div>
            </dl>
            {isLastItem && (
              <p className="mt-4 text-sm leading-6 text-[#6F6B67]">
                Outfit còn một món nên không thể xóa món này. Hãy xóa cả outfit nếu bạn không cần nữa.
              </p>
            )}
          </section>

          <section className="rounded-lg border border-[#E3DAD0] bg-white p-5 shadow-sm">
            <h2 className="font-display text-2xl font-semibold text-[#222222]">Chỉnh tên</h2>
            <form onSubmit={submitRename} noValidate>
              <label className="mt-4 grid gap-2 text-sm font-semibold text-[#3A3632]">
                Tên outfit
                <input
                  value={nameDraft}
                  onChange={event => {
                    setNameDraft(event.target.value)
                    setNameError('')
                  }}
                  aria-invalid={nameError ? true : undefined}
                  disabled={busy}
                  className="min-h-11 rounded-lg border border-[#D8D0C6] bg-white px-3 text-sm font-medium text-[#222222] outline-none focus:border-[#684B5A] focus:ring-2 focus:ring-[#684B5A]/20 disabled:opacity-60"
                />
                {nameError && <span className="text-xs font-medium text-[#A94B4B]">{nameError}</span>}
              </label>
              <Button type="submit" variant="secondary" className="mt-4" disabled={busy} loading={pending === 'rename'}>
                Lưu tên outfit
              </Button>
            </form>
          </section>

          <section className="rounded-lg border border-[#E3DAD0] bg-white p-5 shadow-sm">
            <h2 className="font-display text-2xl font-semibold text-[#222222]">Xóa outfit</h2>
            <p className="mt-2 text-sm leading-6 text-[#6F6B67]">Outfit sẽ bị xóa khỏi tủ đồ của bạn.</p>
            <Button variant="danger-soft" className="mt-4" disabled={busy} onClick={() => setConfirmingDelete(true)}>
              Xóa outfit
            </Button>
          </section>
        </aside>
      </div>

      {changing && (
        <ChangeVariantDialog
          item={changing}
          takenVariantIds={new Set(detail.items.filter(item => item.outfit_item_id !== changing.outfit_item_id).map(item => item.variant_id))}
          saving={pending === `change:${changing.outfit_item_id}`}
          error={changeError?.message ?? ''}
          suggestRemoval={changeError?.code === 'OUTFIT_ITEM_UNAVAILABLE'}
          canRemove={!isLastItem}
          onSave={variantId => void saveVariantChange(variantId)}
          onRemoveItem={() => void removeFromChangeDialog()}
          onClose={() => setChanging(null)}
        />
      )}

      <ConfirmDeleteOutfitDialog
        open={confirmingDelete}
        outfitName={detail.name}
        deleting={pending === 'delete'}
        onConfirm={confirmDelete}
        onClose={() => setConfirmingDelete(false)}
      />
    </section>
  )
}
