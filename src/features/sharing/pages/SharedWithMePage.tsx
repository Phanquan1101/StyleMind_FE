import { Link } from 'react-router-dom'

import { useDemoStore } from '@/app/store/DemoStoreProvider'
import { useAuth } from '@/features/auth'
import { selectOutfitDetail } from '@/features/wardrobe/model/outfitSelectors'
import { formatCurrency } from '@/shared/lib/formatCurrency'

export function SharedWithMePage() {
  const { state } = useDemoStore()
  const { currentUser } = useAuth()

  if (!currentUser) return null

  const sharedOutfits = state.outfitShares
    .filter(share => share.active && share.viewerEmail.toLowerCase() === currentUser.email.toLowerCase())
    .map(share => selectOutfitDetail(state, share.outfitId))
    .filter(Boolean)

  return (
    <section className="mx-auto grid max-w-[var(--container-wide)] gap-8 px-5 py-8 md:px-8 md:py-12">
      <div>
        <h1 className="font-display text-4xl font-semibold leading-tight text-[#222222]">Được chia sẻ với tôi</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6F6B67]">
          Các outfit bạn bè đã cấp quyền xem sẽ xuất hiện tại đây và chỉ mở ở chế độ đọc.
        </p>
      </div>

      {sharedOutfits.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sharedOutfits.map(detail => {
            if (!detail) return null

            return (
              <Link
                key={detail.outfit.id}
                to={`/outfits/${detail.outfit.id}`}
                className="rounded-lg border border-[#E3DAD0] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#684B5A]"
              >
                <h2 className="text-lg font-semibold text-[#222222]">{detail.outfit.name}</h2>
                <p className="mt-2 text-sm text-[#6F6B67]">{detail.items.length} món</p>
                <p className="mt-3 font-semibold text-[#222222]">{formatCurrency(detail.total)}</p>
              </Link>
            )
          })}
        </div>
      ) : (
        <section className="rounded-lg border border-dashed border-[#D8D0C6] bg-white p-8">
          <h2 className="font-display text-2xl font-semibold text-[#222222]">Chưa có outfit được chia sẻ</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6F6B67]">
            Khi có người chia sẻ outfit đến email của bạn, danh sách này sẽ được cập nhật.
          </p>
        </section>
      )}
    </section>
  )
}
