import { Link, useParams } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { useDemoStore } from '@/app/store/DemoStoreProvider'
import { useAuth } from '@/features/auth'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { formatDate } from '@/shared/lib/formatDate'

import { selectOutfitDetail } from '../model/outfitSelectors'

export function OutfitDetailPage() {
  const { outfitId } = useParams()
  const { state } = useDemoStore()
  const { currentUser } = useAuth()
  const detail = outfitId ? selectOutfitDetail(state, outfitId) : null

  if (!currentUser) return null

  if (!detail || detail.outfit.ownerId !== currentUser.id) {
    return (
      <section className="mx-auto max-w-[var(--container-wide)] px-5 py-10 md:px-8">
        <Link to={ROUTES.wardrobes} className="text-sm font-semibold text-[#684B5A] hover:underline">
          Tủ đồ
        </Link>
        <h1 className="mt-4 font-display text-4xl font-semibold text-[#222222]">Không tìm thấy outfit</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[#6F6B67]">
          Outfit này không tồn tại hoặc bạn không có quyền xem.
        </p>
      </section>
    )
  }

  return (
    <section className="mx-auto grid max-w-[var(--container-wide)] gap-8 px-5 py-8 md:px-8 md:py-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          <Link to={ROUTES.wardrobes} className="text-sm font-semibold text-[#684B5A] hover:underline">
            Tủ đồ
          </Link>
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-[#222222]">{detail.outfit.name}</h1>
          {detail.outfit.description && <p className="mt-3 text-sm leading-6 text-[#6F6B67]">{detail.outfit.description}</p>}
          <p className="mt-3 text-sm text-[#8A8179]">Cập nhật {formatDate(detail.outfit.updatedAt)}</p>
        </div>
        <div className="rounded-lg border border-[#E3DAD0] bg-white px-4 py-3 text-sm font-semibold text-[#3A3632] shadow-sm">
          {detail.outfit.visibility === 'public' ? 'Đang công khai' : 'Riêng tư'}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="grid gap-4 md:grid-cols-2">
          {detail.items.map(item => (
            <Link
              key={item.item.id}
              to={`/products/${item.product.id}`}
              className="overflow-hidden rounded-lg border border-[#E3DAD0] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#684B5A]"
            >
              {item.image && <img src={item.image.url} alt={item.image.alt} className="aspect-[4/5] w-full object-cover" />}
              <div className="p-4">
                <h2 className="font-semibold text-[#222222]">{item.product.name}</h2>
                <p className="mt-1 text-sm text-[#6F6B67]">
                  {item.variant.color} · {item.variant.size}
                </p>
                <p className="mt-3 font-semibold text-[#222222]">{formatCurrency(item.price)}</p>
              </div>
            </Link>
          ))}
        </section>

        <aside className="h-fit rounded-lg border border-[#E3DAD0] bg-white p-5 shadow-sm">
          <h2 className="font-display text-2xl font-semibold text-[#222222]">Tóm tắt outfit</h2>
          <dl className="mt-5 grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[#6F6B67]">Số món</dt>
              <dd className="font-semibold text-[#222222]">{detail.items.length}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[#6F6B67]">Nguồn</dt>
              <dd className="font-semibold text-[#222222]">{detail.outfit.source === 'ai' ? 'AI Stylist' : 'Thủ công'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[#6F6B67]">Tổng giá</dt>
              <dd className="font-semibold text-[#222222]">{formatCurrency(detail.total)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  )
}
