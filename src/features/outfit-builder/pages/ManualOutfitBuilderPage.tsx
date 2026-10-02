import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { useDemoStore } from '@/app/store/DemoStoreProvider'
import { formatCurrency } from '@/shared/lib/formatCurrency'

export function ManualOutfitBuilderPage() {
  const { state } = useDemoStore()
  const products = state.products.filter(product => product.active).slice(0, 6)

  return (
    <section className="mx-auto grid max-w-[var(--container-wide)] gap-8 px-5 py-8 md:px-8 md:py-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Link to={ROUTES.wardrobes} className="text-sm font-semibold text-[#684B5A] hover:underline">
            Tủ đồ
          </Link>
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-[#222222]">Tạo outfit thủ công</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6F6B67]">
            Chọn sản phẩm thật trong catalog để bắt đầu ghép outfit theo ý bạn.
          </p>
        </div>
        <Link to={ROUTES.outfitNewAi} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#684B5A] px-4 text-sm font-semibold text-white">
          Chuyển sang AI Stylist
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {products.map(product => {
          const variant = product.variants.find(item => item.active)
          const image = variant?.images.find(item => item.isPrimary) ?? variant?.images[0]

          return (
            <Link
              key={product.id}
              to={`/products/${product.id}`}
              className="overflow-hidden rounded-lg border border-[#E3DAD0] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#684B5A]"
            >
              {image && <img src={image.url} alt={image.alt} className="aspect-[4/5] w-full object-cover" />}
              <div className="p-4">
                <h2 className="font-semibold text-[#222222]">{product.name}</h2>
                <p className="mt-1 text-sm text-[#6F6B67]">{product.brand}</p>
                <p className="mt-3 font-semibold text-[#222222]">{formatCurrency(product.basePrice)}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
