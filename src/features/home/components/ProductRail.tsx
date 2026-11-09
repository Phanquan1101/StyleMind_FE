import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import type { Product } from '@/entities/product/model/types'
import { ProductCard } from '@/features/catalog/components/ProductCard'

interface ProductRailProps {
  title: string
  products: Product[]
}

export function ProductRail({ title, products }: ProductRailProps) {
  return (
    <section className="bg-[#F7F4F1] px-5 py-12 md:px-8">
      <div className="mx-auto max-w-[var(--container-wide)]">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="font-display text-3xl font-semibold text-[#222222]">{title}</h2>
          <Link to={ROUTES.shop} className="text-sm font-semibold text-[#805B41] transition-colors hover:text-[#503A2B] hover:underline">
            Xem tất cả
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {products.slice(0, 4).map(product => <ProductCard key={product.id} product={product} headingLevel="h3" />)}
        </div>
      </div>
    </section>
  )
}
