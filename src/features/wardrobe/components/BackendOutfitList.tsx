import { useAuth } from '@/features/auth'
import { wardrobeErrorMessage } from '@/shared/api/wardrobeApi'
import { Button, LoadingSkeleton } from '@/shared/ui'

import { useBackendOutfits } from '../model/useBackendOutfits'
import { BackendOutfitCard } from './BackendOutfitCard'

export function BackendOutfitList() {
  const { currentUser } = useAuth()
  const { outfits, status, error, hasMore, loadingMore, loadMore, retry } = useBackendOutfits(currentUser?.id)

  if (status === 'loading') {
    return (
      <div aria-busy="true" aria-label="Đang tải tủ đồ" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map(index => (
          <LoadingSkeleton key={index} className="h-32" />
        ))}
      </div>
    )
  }

  if (status === 'forbidden') {
    return (
      <p role="alert" className="rounded-lg border border-[#E3DAD0] bg-white px-4 py-3 text-sm font-semibold text-[#A94B4B]">
        Tài khoản của bạn không có quyền dùng Tủ đồ.
      </p>
    )
  }

  if (status === 'error') {
    return (
      <section role="alert" className="grid justify-items-start gap-3 rounded-lg border border-[#E3DAD0] bg-white p-6">
        <p className="text-sm font-semibold text-[#A94B4B]">{wardrobeErrorMessage(error, 'Không tải được tủ đồ. Vui lòng thử lại.')}</p>
        <Button variant="secondary" onClick={retry}>
          Thử lại
        </Button>
      </section>
    )
  }

  if (outfits.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-[#D8D0C6] bg-white p-8">
        <h2 className="font-display text-2xl font-semibold text-[#222222]">Bạn chưa có outfit nào</h2>
      </section>
    )
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {outfits.map(outfit => (
          <BackendOutfitCard key={outfit.outfit_id} outfit={outfit} />
        ))}
      </div>
      {error !== null && (
        <p role="alert" className="text-sm font-semibold text-[#A94B4B]">
          {wardrobeErrorMessage(error, 'Không tải thêm được outfit. Vui lòng thử lại.')}
        </p>
      )}
      {hasMore && (
        <div>
          <Button variant="secondary" loading={loadingMore} onClick={loadMore}>
            Tải thêm
          </Button>
        </div>
      )}
    </div>
  )
}
