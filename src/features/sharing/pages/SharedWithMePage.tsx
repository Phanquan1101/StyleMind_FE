import { Link } from 'react-router-dom'
import { ROUTES } from '@/app/router/routes'
import { useDemoStore } from '@/app/store/DemoStoreProvider'
import { useAuth } from '@/features/auth'
import { selectFriends } from '@/features/friends/model/friendshipModel'
import { selectFriendOutfits } from '../model/outfitSharing'

export function SharedWithMePage() {
  const { state } = useDemoStore()
  const { currentUser } = useAuth()
  if (!currentUser) return null
  const friends = selectFriends(state, currentUser.id)
  return <section className="mx-auto max-w-[var(--container-wide)] px-5 py-8 md:px-8 md:py-12">
    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#B98791]">Cảm hứng từ vòng kết nối</p>
    <h1 className="mt-3 font-display text-4xl font-semibold text-[#222222]">Outfit bạn bè</h1>
    <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6F6B67]">Xem những Outfit bạn bè đặt chế độ Bạn bè hoặc Công khai. Outfit Riêng tư luôn chỉ dành cho chủ sở hữu.</p>
    {friends.length ? <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{friends.map(friend => {
      const visible = selectFriendOutfits(state, friend.id, currentUser.id)
      return <article key={friend.id} className="rounded-lg border border-[#E3DAD0] bg-white p-6 shadow-sm">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-[#F4E7E8] font-display text-lg text-[#684B5A]">{friend.avatarInitials}</span>
        <h2 className="mt-4 font-display text-2xl text-[#222222]">Tủ đồ của {friend.fullName}</h2>
        <p className="mt-3 text-sm text-[#6F6B67]">{visible.length} Outfit có thể xem</p>
        <Link to={`/shared-with-me/${friend.id}`} className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-[#684B5A] px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#684B5A] focus-visible:ring-offset-2">Xem tủ đồ</Link>
      </article>
    })}</div> : <div className="mt-8 rounded-lg border border-dashed border-[#D8D0C6] bg-white p-8"><h2 className="font-display text-2xl">Chưa có bạn bè</h2><p className="mt-3 text-sm leading-6 text-[#6F6B67]">Kết nối với bạn bè để cùng chia sẻ cảm hứng phối đồ.</p><Link className="mt-4 inline-flex min-h-11 items-center font-semibold text-[#684B5A] hover:underline" to={ROUTES.friends}>Đến Bạn bè</Link></div>}
  </section>
}
