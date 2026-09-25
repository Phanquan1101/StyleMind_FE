import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'

export function DeferredWardrobePage() {
  return (
    <section className="bg-[#FAF8F5] px-5 py-12 md:py-16">
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <div>
          <p className="text-sm font-semibold text-[#684B5A]">AI Wardrobe</p>
          <h1 className="mt-3 max-w-2xl font-display text-4xl font-semibold leading-tight text-[#222222] md:text-5xl">
            Tủ đồ AI đang được hoàn thiện
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#6F6B67]">
            Phần tủ đồ đang được tách thiết kế riêng để giữ đúng nghiệp vụ đã thống nhất. Trong bản demo này, bạn có thể tiếp tục khám phá cửa hàng và luồng mua sắm trước.
          </p>
          <div className="mt-7">
            <Link
              to={ROUTES.shop}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#684B5A] px-5 text-sm font-semibold text-white transition hover:bg-[#593f4d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#684B5A] focus-visible:ring-offset-2"
            >
              Đến cửa hàng
            </Link>
          </div>
        </div>
        <div className="grid aspect-[4/5] place-items-center overflow-hidden rounded-lg bg-[#EEE8E1]">
          <div className="grid w-4/5 gap-3">
            <div className="h-24 rounded-lg bg-[#FDFCFA]" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-32 rounded-lg bg-[#F4E7E8]" />
              <div className="h-32 rounded-lg bg-[#D8D0C6]" />
            </div>
            <div className="h-16 rounded-lg bg-[#FDFCFA]" />
          </div>
        </div>
      </div>
    </section>
  )
}
