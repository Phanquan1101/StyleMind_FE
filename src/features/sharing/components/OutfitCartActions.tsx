import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/app/router/routes'
import { useActiveCommerce } from '@/features/cart/model/AccountCommerceProvider'
import { guestCartErrorMessage } from '@/features/cart/data/guestCartApi'
import type { OutfitItemDto } from '@/shared/api/communityApi'
import { accessToken } from '@/shared/api/http'
import { Button, useToast } from '@/shared/ui'

export function OutfitCartActions({ items }: { items: OutfitItemDto[] }) {
  const cart = useActiveCommerce()
  const toast = useToast()
  const navigate = useNavigate()
  const lock = useRef(false)
  const [busy, setBusy] = useState(false)
  const [skippedNames, setSkippedNames] = useState<string[]>([])
  const [error, setError] = useState('')
  const available = items.filter(item => item.available && item.variant_id)

  const add = async (selected: OutfitItemDto[]) => {
    if (lock.current || cart.busy || !selected.length) return
    lock.current = true
    setBusy(true); setError(''); setSkippedNames([])
    let added = 0
    const token = accessToken()
    try {
      for (const item of selected) {
        if (accessToken() !== token) throw new Error('Phiên đăng nhập đã thay đổi.')
        await cart.addItem(item.variant_id, 1)
        added++
      }
      // Items the outfit lists but that cannot be bought (out of stock / discontinued) are named, not silently dropped.
      const skipped = selected === available ? items.filter(item => !item.available || !item.variant_id).map(item => item.product_name || 'Sản phẩm không còn khả dụng') : []
      setSkippedNames(skipped)
      toast.success(`Đã thêm ${added} món vào giỏ${skipped.length ? ` (bỏ qua ${skipped.length} món hết hàng/ngừng bán)` : ''}`, { label: 'Xem giỏ hàng', onClick: () => navigate(ROUTES.cart) })
    } catch (failure) {
      setError(`Đã thêm ${added} món. ${guestCartErrorMessage(failure)} Hãy kiểm tra giỏ hàng trước khi thử lại.`)
    } finally { lock.current = false; setBusy(false) }
  }

  return <section className="mt-8 rounded-xl border border-[#E3E2E2] bg-white p-5" aria-label="Thêm Outfit vào giỏ">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-display text-2xl font-semibold">Mua các món trong Outfit</h2><p className="mt-2 text-sm text-secondary">Chọn từng món hoặc thêm các món còn khả dụng.</p></div><Button disabled={!available.length || cart.busy} loading={busy} onClick={() => void add(available)}>Thêm Outfit vào giỏ</Button></div>
    <div className="mt-4 grid gap-2">{items.map(item => <div key={item.outfit_item_id} className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E3E2E2] py-3"><span className="min-w-0 break-words text-sm">{item.product_name || 'Sản phẩm không còn khả dụng'}</span><Button size="sm" variant="secondary" className="max-w-full" aria-label={`Thêm ${item.product_name || 'món này'} vào giỏ`} disabled={!item.available || !item.variant_id || busy || cart.busy} onClick={() => void add([item])}>Thêm vào giỏ</Button></div>)}</div>
    {skippedNames.length > 0 && <p className="mt-3 text-sm text-[#7A5A1E]">Không thêm được (hết hàng hoặc ngừng bán): {skippedNames.join(', ')}.</p>}
    {error && <p role="alert" className="mt-3 text-sm text-[#A94B4B]">{error}</p>}
  </section>
}
