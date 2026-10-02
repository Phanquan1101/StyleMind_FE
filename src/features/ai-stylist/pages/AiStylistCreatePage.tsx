import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { useDemoStore } from '@/app/store/DemoStoreProvider'
import { useAuth } from '@/features/auth'
import { recommendOutfit } from '@/features/ai-stylist/model/recommendOutfit'
import { formatCurrency } from '@/shared/lib/formatCurrency'

export function AiStylistCreatePage() {
  const { state } = useDemoStore()
  const { currentUser } = useAuth()
  const recommendation = currentUser
    ? recommendOutfit(state, {
        ownerId: currentUser.id,
        requirement: { occasion: 'weekend', style: 'minimal', desiredCategories: ['tops', 'skirts'] },
      })
    : null

  return (
    <section className="mx-auto grid max-w-[var(--container-wide)] gap-8 px-5 py-8 md:px-8 md:py-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Link to={ROUTES.wardrobes} className="text-sm font-semibold text-[#684B5A] hover:underline">
            Tủ đồ
          </Link>
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-[#222222]">AI Stylist</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6F6B67]">
            Gợi ý outfit từ sản phẩm đang hoạt động trong catalog, dựa trên dịp mặc và phong cách mong muốn.
          </p>
        </div>
        <Link to={ROUTES.outfitNew} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#EEE8E1] px-4 text-sm font-semibold text-[#222222]">
          Tạo thủ công
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-lg border border-[#E3DAD0] bg-white p-5 shadow-sm">
          <h2 className="font-display text-2xl font-semibold text-[#222222]">Yêu cầu hiện tại</h2>
          <dl className="mt-5 grid gap-3 text-sm">
            <Row label="Dịp mặc" value="Cuối tuần" />
            <Row label="Phong cách" value="Tối giản" />
            <Row label="Danh mục" value="Áo, chân váy" />
          </dl>
        </section>

        <section className="rounded-lg border border-[#E3DAD0] bg-white p-5 shadow-sm">
          <h2 className="font-display text-2xl font-semibold text-[#222222]">Gợi ý outfit</h2>
          {recommendation ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {recommendation.items.map(item => {
                const product = state.products.find(candidate => candidate.id === item.productId)
                const variant = product?.variants.find(candidate => candidate.id === item.variantId)
                const image = variant?.images.find(candidate => candidate.isPrimary) ?? variant?.images[0]
                if (!product || !variant) return null

                return (
                  <Link
                    key={`${item.productId}-${item.variantId}`}
                    to={`/products/${product.id}`}
                    className="overflow-hidden rounded-lg border border-[#EEE8E1] bg-[#FFFDFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#684B5A]"
                  >
                    {image && <img src={image.url} alt={image.alt} className="aspect-[4/5] w-full object-cover" />}
                    <div className="p-4">
                      <h3 className="font-semibold text-[#222222]">{product.name}</h3>
                      <p className="mt-1 text-sm text-[#6F6B67]">
                        {variant.color} · {variant.size}
                      </p>
                      <p className="mt-3 font-semibold text-[#222222]">{formatCurrency(variant.priceOverride ?? product.basePrice)}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <p className="mt-5 text-sm leading-6 text-[#6F6B67]">Đăng nhập để nhận gợi ý outfit.</p>
          )}
        </section>
      </div>
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-[#6F6B67]">{label}</dt>
      <dd className="font-semibold text-[#222222]">{value}</dd>
    </div>
  )
}
