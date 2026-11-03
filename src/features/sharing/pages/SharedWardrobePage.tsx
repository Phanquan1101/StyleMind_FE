import { Link, useParams } from 'react-router-dom'
import { ROUTES } from '@/app/router/routes'
import { useDemoStore } from '@/app/store/DemoStoreProvider'
import { useAuth } from '@/features/auth'
import { selectFriends } from '@/features/friends/model/friendshipModel'
import { OutfitCard } from '@/features/wardrobe/components/OutfitCard'
import { selectFriendOutfits } from '../model/outfitSharing'

export function SharedWardrobePage() {
  const { ownerId } = useParams()
  const { state } = useDemoStore()
  const { currentUser } = useAuth()
  if (!currentUser || !ownerId) return null
  const friend = selectFriends(state, currentUser.id).find(u => u.id === ownerId)
  if (!friend) return <section className="mx-auto max-w-[var(--container-wide)] px-5 py-10 md:px-8">
    <Link to={ROUTES.sharedWithMe} className="text-sm font-semibold text-[#684B5A] hover:underline">Outfit bạn bè</Link>
    <h1 className="mt-4 font-display text-4xl font-semibold text-[#222222]">Không thể mở tủ đồ</h1>
    <p className="mt-3 text-sm leading-6 text-[#6F6B67]">Bạn chưa kết bạn với người này hoặc quan hệ bạn bè không còn hiệu lực.</p>
  </section>
  const outfits = selectFriendOutfits(state, ownerId, currentUser.id)
  return <section className="mx-auto grid max-w-[var(--container-wide)] gap-8 px-5 py-8 md:px-8 md:py-12">
    <div><Link to={ROUTES.sharedWithMe} className="text-sm font-semibold text-[#684B5A] hover:underline">Outfit bạn bè</Link><h1 className="mt-3 font-display text-4xl font-semibold text-[#222222]">Tủ đồ của {friend.fullName}</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-[#6F6B67]">Chỉ hiển thị Outfit Bạn bè và Công khai. Bạn có quyền xem; mọi chỉnh sửa thuộc về chủ sở hữu.</p></div>
    {outfits.length ? <section aria-label="Outfit có thể xem" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{outfits.map(detail => <OutfitCard key={detail.outfit.id} outfit={detail.outfit} />)}</section> : <div className="rounded-lg border border-dashed border-[#D8D0C6] bg-white p-8"><h2 className="font-display text-2xl text-[#222222]">Chưa có Outfit để xem</h2><p className="mt-3 text-sm leading-6 text-[#6F6B67]">Người bạn này chưa có Outfit Bạn bè hoặc Công khai. Outfit Riêng tư không xuất hiện ở đây.</p></div>}
  </section>
}
