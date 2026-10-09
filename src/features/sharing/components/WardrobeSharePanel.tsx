import { Share2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { OutfitShare } from '@/entities/share/model/types'
import { Button, Modal } from '@/shared/ui'

interface WardrobeSharePanelProps {
  outfitCount: number
  shares: OutfitShare[]
  publicUrl: string
  onGrant: (email: string) => void
  onRevokeEmail: (email: string) => void
  onTogglePublic: (enabled: boolean) => void
}

interface ShareRecipient {
  email: string
  count: number
}

export function WardrobeSharePanel({
  outfitCount,
  shares,
  publicUrl,
  onGrant,
  onRevokeEmail,
  onTogglePublic,
}: WardrobeSharePanelProps) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [open, setOpen] = useState(false)

  const recipients = useMemo<ShareRecipient[]>(() => {
    const grouped = new Map<string, number>()

    for (const share of shares) {
      if (!share.active) continue
      grouped.set(share.viewerEmail, (grouped.get(share.viewerEmail) ?? 0) + 1)
    }

    return Array.from(grouped, ([recipientEmail, count]) => ({ email: recipientEmail, count })).sort((a, b) =>
      a.email.localeCompare(b.email),
    )
  }, [shares])

  const submit = () => {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setError('Vui lòng nhập email hợp lệ')
      return
    }

    setError('')
    onGrant(normalizedEmail)
    setMessage(`Đã chia sẻ ${outfitCount} outfit trong tủ đồ.`)
    setEmail('')
  }

  const closeModal = () => {
    setOpen(false)
    setError('')
    setMessage('')
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        icon={<Share2 size={17} aria-hidden="true" />}
        onClick={() => setOpen(true)}
      >
        Chia sẻ tủ đồ
      </Button>

      <Modal
        open={open}
        title="Chia sẻ tủ đồ"
        description="Người nhận sẽ xem được toàn bộ outfit hiện có trong tủ đồ của bạn."
        onClose={closeModal}
      >
        <section aria-label="Chia sẻ qua email" className="grid gap-4">
          <form
            className="grid gap-4"
            onSubmit={event => {
              event.preventDefault()
              submit()
            }}
          >
            <label className="grid gap-2 text-sm font-semibold text-[#3A3632]">
              Email được chia sẻ
              <input
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                className="min-h-11 rounded-lg border border-[#D8D0C6] bg-white px-3 text-sm font-medium text-[#222222] outline-none transition focus:border-[#684B5A] focus:ring-2 focus:ring-[#684B5A]/20"
                placeholder="banbe@example.com"
              />
            </label>
            {error && <p className="text-xs font-medium text-[#A94B4B]">{error}</p>}
            {message && <p className="text-sm font-semibold text-[#2F7D4E]">{message}</p>}
            <Button type="submit" disabled={outfitCount === 0}>
              Xác nhận chia sẻ
            </Button>
          </form>

          <div>
            {recipients.length === 0 ? (
              <p className="text-sm leading-6 text-[#6F6B67]">Chưa chia sẻ tủ đồ với email nào.</p>
            ) : (
              <ul className="grid gap-2">
                {recipients.map(recipient => (
                  <li key={recipient.email} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#FAF8F5] px-3 py-2">
                    <span className="text-sm font-semibold text-[#222222]">
                      {recipient.email} · {recipient.count} outfit
                    </span>
                    <button
                      type="button"
                      className="inline-flex min-h-9 items-center justify-center rounded-lg bg-[#FCEAEA] px-3 text-sm font-semibold text-[#A94B4B] transition hover:bg-[#F7D8D8] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94B4B]/30"
                      onClick={() => onRevokeEmail(recipient.email)}
                    >
                      Thu hồi {recipient.email}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section aria-label="Chia sẻ public" className="mt-6 rounded-lg bg-[#FAF8F5] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-semibold text-[#222222]">Link public</h3>
              <p className="mt-1 text-sm leading-6 text-[#6F6B67]">
                Bất kỳ ai có link đều xem được toàn bộ outfit trong tủ đồ.
              </p>
            </div>
            {publicUrl ? (
              <Button type="button" variant="danger" onClick={() => onTogglePublic(false)}>
                Tắt link công khai
              </Button>
            ) : (
              <Button type="button" variant="secondary" disabled={outfitCount === 0} onClick={() => onTogglePublic(true)}>
                Bật link công khai
              </Button>
            )}
          </div>

          {publicUrl && (
            <a
              href={publicUrl}
              className="mt-3 block break-all rounded-lg border border-[#D8D0C6] bg-white px-3 py-2 text-sm font-semibold text-[#684B5A] transition hover:bg-[#F7F1F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#684B5A]"
            >
              {publicUrl}
            </a>
          )}
        </section>
      </Modal>
    </>
  )
}
