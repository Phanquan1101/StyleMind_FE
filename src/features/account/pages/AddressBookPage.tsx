import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { useDemoStore } from '@/app/store/DemoStoreProvider'
import { useAuth } from '@/features/auth'

export function AddressBookPage() {
  const { state } = useDemoStore()
  const { currentUser } = useAuth()

  if (!currentUser) return null

  const addresses = state.addresses.filter(address => address.userId === currentUser.id)

  return (
    <section className="mx-auto grid max-w-[var(--container-wide)] gap-8 px-5 py-8 md:px-8 md:py-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Link to={ROUTES.account} className="text-sm font-semibold text-[#684B5A] hover:underline">
            Tài khoản
          </Link>
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-[#222222]">Địa chỉ</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6F6B67]">
            Chọn địa chỉ mặc định để thanh toán nhanh và giữ thông tin giao hàng rõ ràng.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#EEE8E1] px-4 text-sm font-semibold text-[#222222]"
        >
          Thêm địa chỉ
        </button>
      </div>

      {addresses.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map(address => (
            <article key={address.id} className="rounded-lg border border-[#E3DAD0] bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[#222222]">{address.recipientName}</h2>
                  <p className="mt-1 text-sm text-[#6F6B67]">{address.phone}</p>
                </div>
                {address.isDefault && (
                  <span className="rounded-full bg-[#F4E7E8] px-3 py-1 text-xs font-semibold text-[#684B5A]">
                    Mặc định
                  </span>
                )}
              </div>
              <p className="mt-4 text-sm leading-6 text-[#3A3632]">
                {address.line1}, {address.ward}, {address.district}, {address.province}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <section className="rounded-lg border border-dashed border-[#D8D0C6] bg-white p-8">
          <h2 className="font-display text-2xl font-semibold text-[#222222]">Chưa có địa chỉ</h2>
          <p className="mt-2 text-sm leading-6 text-[#6F6B67]">
            Thêm địa chỉ trước khi thanh toán để đơn hàng có nơi giao rõ ràng.
          </p>
        </section>
      )}
    </section>
  )
}
