import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import type { Product } from '@/entities/product/model/types'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { ProductCardImage } from './ProductCardImage'

interface ProductCardProps {
  product: Product
}

function productPath(productId: string) {
  return ROUTES.product.replace(':productId', productId)
}

function getPrimaryImage(product: Product) {
  return product.variants.flatMap(variant => variant.images).find(image => image.isPrimary) ?? product.variants[0]?.images[0]
}

export function ProductCard({ product }: ProductCardProps) {
  const image = getPrimaryImage(product)
  const colors = Array.from(new Map(product.variants.filter(variant => variant.color).map(variant => [variant.color, variant.colorHex])).entries())
  const soldOut = !product.active || !product.variants.some(variant => variant.active && variant.stock > 0)

  return (
    <article className="group min-w-0 overflow-hidden rounded-xl border border-[#E8E5E1] bg-white transition-colors duration-200 hover:border-[#BEB8B1] motion-reduce:transition-none">
      <Link to={productPath(product.id)} className="block min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B1B]">
        <div className="overflow-hidden bg-[#EFEDED]">
          <ProductCardImage src={image?.url} alt={image?.alt ?? product.name} />
        </div>
        <div className="p-3.5 sm:p-4">
          {product.brand && <p className="text-xs font-medium text-[#716B66]">{product.brand}</p>}
          <h2 className="mt-1 break-words text-sm font-semibold leading-snug text-[#222222] sm:text-base">{product.name}</h2>
          {soldOut && <p className="mt-2 text-xs font-semibold text-red-700">Hết hàng</p>}
          <p className="mt-2 text-sm font-semibold text-[#1C1B1B]">{formatCurrency(product.basePrice)}</p>
          <div className="mt-3 flex gap-1.5" role="group" aria-label={`Màu của ${product.name}: ${colors.map(([color]) => color).join(', ')}`}>
            {colors.slice(0, 5).map(([color, hex]) => (
              <span key={color} aria-hidden="true" title={color} className="h-4 w-4 rounded-full border border-[#C4C7C7]" style={{ backgroundColor: hex }} />
            ))}
          </div>
        </div>
      </Link>
    </article>
  )
}
