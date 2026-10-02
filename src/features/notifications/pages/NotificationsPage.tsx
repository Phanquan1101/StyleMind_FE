import { Link } from 'react-router-dom'

import { useDemoStore } from '@/app/store/DemoStoreProvider'
import { useAuth } from '@/features/auth'
import { formatDate } from '@/shared/lib/formatDate'

export function NotificationsPage() {
  const { state } = useDemoStore()
  const { currentUser } = useAuth()

  if (!currentUser) return null

  const notifications = state.notifications
    .filter(item => item.userId === currentUser.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const unreadCount = notifications.filter(item => !item.read).length

  return (
    <section className="mx-auto grid max-w-[var(--container-wide)] gap-8 px-5 py-8 md:px-8 md:py-12">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-4xl font-semibold leading-tight text-[#222222]">Thông báo</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6F6B67]">
            Cập nhật về đơn hàng, tủ đồ, chia sẻ outfit và tài khoản của bạn.
          </p>
        </div>
        <span className="w-fit rounded-full bg-[#F4E7E8] px-3 py-1 text-xs font-semibold text-[#684B5A]">
          {unreadCount} chưa đọc
        </span>
      </div>

      {notifications.length > 0 ? (
        <div className="grid gap-3">
          {notifications.map(notification => {
            const content = (
              <article className={`rounded-lg border p-5 shadow-sm ${notification.read ? 'border-[#E3DAD0] bg-white' : 'border-[#D8B9C2] bg-[#FFF9FB]'}`}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <h2 className="text-lg font-semibold text-[#222222]">{notification.title}</h2>
                  <span className="text-xs font-semibold text-[#8A8179]">{formatDate(notification.createdAt)}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#6F6B67]">{notification.body}</p>
              </article>
            )

            return notification.link ? (
              <Link key={notification.id} to={notification.link} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#684B5A]">
                {content}
              </Link>
            ) : (
              <div key={notification.id}>{content}</div>
            )
          })}
        </div>
      ) : (
        <section className="rounded-lg border border-dashed border-[#D8D0C6] bg-white p-8">
          <h2 className="font-display text-2xl font-semibold text-[#222222]">Chưa có thông báo</h2>
          <p className="mt-2 text-sm leading-6 text-[#6F6B67]">Khi có cập nhật mới, StyleMind sẽ hiển thị tại đây.</p>
        </section>
      )}
    </section>
  )
}
