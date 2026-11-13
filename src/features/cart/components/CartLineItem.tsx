import { Minus, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { formatCurrency } from '@/shared/lib/formatCurrency'

import type { CartLineDetail } from '../model/cartSelectors'

interface CartLineItemProps {
  detail: CartLineDetail
  onQuantityChange: (quantity: number) => void
  onVariantChange: (variantId: string) => void
  onRemove: () => void
  unavailable?: boolean
}

function productPath(productId: string) {
  return ROUTES.product.replace(':productId', productId)
}

export function CartLineItem({ detail, onQuantityChange, onVariantChange, onRemove, unavailable = false }: CartLineItemProps) {
  const availableVariants = detail.product.variants.filter(variant => variant.active && variant.stock > 0)
  const colors = [...new Set(availableVariants.map(variant => variant.color))]
  const sizes = availableVariants.filter(variant => variant.color === detail.variant.color)

  const changeColor = (color: string) => {
    const sameSize = availableVariants.find(variant => variant.color === color && variant.size === detail.variant.size)
    const fallback = availableVariants.find(variant => variant.color === color)
    const target = sameSize ?? fallback
    if (target) onVariantChange(target.id)
  }

  const changeSize = (size: string) => {
    const variant = availableVariants.find(item => item.color === detail.variant.color && item.size === size)
    if (variant) onVariantChange(variant.id)
  }

  return (
    <article className="grid gap-4 rounded-lg bg-[#FFFFFF] p-4 shadow-[0_14px_30px_rgba(58,54,50,0.08)] sm:grid-cols-[108px_minmax(0,1fr)]">
      <Link to={productPath(detail.product.id)} className="aspect-[4/5] overflow-hidden rounded-lg bg-[#EFEDED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B1B] sm:aspect-auto sm:h-full">
        {detail.image && <img src={detail.image.url} alt={detail.image.alt} className="h-full w-full object-cover" />}
      </Link>
      <div className="grid gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#9D9894]">{detail.product.brand}</p>
            <Link to={productPath(detail.product.id)} className="mt-1 block text-base font-bold text-[#222222] hover:text-[#1C1B1B]">
              {detail.product.name}
            </Link>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-xs font-semibold text-[#5E5F5D]">
                Màu sắc
                <select
                  aria-label={`Màu sắc ${detail.product.name}`}
                  value={detail.variant.color}
                  disabled={!colors.length}
                  onChange={event => changeColor(event.target.value)}
                  className="min-h-10 rounded-lg border border-[#C4C7C7] bg-white px-3 text-sm font-semibold text-[#222222] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B1B]"
                >
                  {colors.map(color => <option key={color} value={color}>{color}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold text-[#5E5F5D]">
                Kích cỡ
                <select
                  aria-label={`Kích cỡ ${detail.product.name}`}
                  value={detail.variant.size}
                  disabled={!sizes.length}
                  onChange={event => changeSize(event.target.value)}
                  className="min-h-10 rounded-lg border border-[#C4C7C7] bg-white px-3 text-sm font-semibold text-[#222222] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B1B]"
                >
                  {sizes.map(variant => <option key={variant.id} value={variant.size}>{variant.size}</option>)}
                </select>
              </label>
            </div>
          </div>
          <button
            type="button"
            aria-label={`Xóa ${detail.product.name}`}
            title={`Xóa ${detail.product.name}`}
            onClick={onRemove}
            className="inline-grid h-10 w-10 flex-none place-items-center rounded-lg text-[#A94B4B] transition hover:bg-[#FCEAEA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94B4B]"
          >
            <Trash2 size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold text-[#1C1B1B]">{formatCurrency(detail.unitPrice)}</p>
          <div className="inline-flex items-center rounded-lg border border-[#C4C7C7] bg-white">
            <button
              type="button"
              aria-label={`Giảm số lượng ${detail.product.name}`}
              disabled={unavailable || detail.quantity <= 1}
              onClick={() => onQuantityChange(Math.max(1, detail.quantity - 1))}
              className="grid h-10 w-10 place-items-center text-[#3A3632] transition hover:bg-[#EFEDED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B1B]"
            >
              <Minus size={15} aria-hidden="true" />
            </button>
            <output className="grid h-10 min-w-12 place-items-center border-x border-[#C4C7C7] px-3 text-sm font-bold text-[#222222]">
              {detail.quantity}
            </output>
            <button
              type="button"
              aria-label={`Tăng số lượng ${detail.product.name}`}
              disabled={unavailable || detail.quantity >= detail.variant.stock}
              onClick={() => onQuantityChange(detail.quantity + 1)}
              className="grid h-10 w-10 place-items-center text-[#3A3632] transition hover:bg-[#EFEDED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B1B]"
            >
              <Plus size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
        <p className="text-right text-sm font-semibold text-[#3A3632]">Tạm tính {formatCurrency(detail.lineTotal)}</p>
      </div>
    </article>
  )
}
