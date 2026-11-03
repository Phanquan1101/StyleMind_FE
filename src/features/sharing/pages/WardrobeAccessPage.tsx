import { Link } from 'react-router-dom'
import { ROUTES } from '@/app/router/routes'

export function WardrobeAccessPage() {
  return <section className="mx-auto max-w-[var(--container-wide)] px-5 py-10 md:px-8">
    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#B98791]">Chia sẻ Outfit</p>
    <h1 className="mt-3 font-display text-4xl font-semibold text-[#222222]">Quyền xem theo từng Outfit</h1>
    <p className="mt-4 max-w-2xl text-sm leading-7 text-[#6F6B67]">Chia sẻ qua email trước đây không còn cấp quyền xem. Mỗi Outfit có chế độ Riêng tư, Bạn bè hoặc Công khai; chế độ Bạn bè áp dụng cho tất cả bạn bè hiện tại.</p>
    <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6F6B67]">Các bản ghi chia sẻ cũ được giữ lại. Để thay đổi ai có thể xem, mở Outfit của bạn rồi chọn Chia sẻ outfit. Gửi lời mời kết bạn không tự đổi chế độ.</p>
    <div className="mt-6 flex flex-wrap gap-3"><Link to={ROUTES.wardrobes} className="inline-flex min-h-11 items-center rounded-lg bg-[#684B5A] px-4 text-sm font-semibold text-white">Mở tủ đồ của tôi</Link><Link to={ROUTES.friends} className="inline-flex min-h-11 items-center rounded-lg bg-[#EEE8E1] px-4 text-sm font-semibold text-[#3A3632]">Quản lý bạn bè</Link></div>
  </section>
}
