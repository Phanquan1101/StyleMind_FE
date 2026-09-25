import { createBrowserRouter, Link, RouterProvider, type RouteObject } from 'react-router-dom'

import { NotFoundPage } from '@/shared/ui/NotFoundPage'

import { ROUTES } from './routes'

function PlaceholderPage({ title }: { title: string }) {
  return (
    <main className="min-h-screen bg-[#FAF8F5] px-6 py-16 text-[#222222]">
      <div className="mx-auto max-w-3xl">
        <Link to={ROUTES.home} className="text-sm font-semibold text-[#684B5A] hover:underline">
          StyleMind
        </Link>
        <h1 className="mt-6 font-display text-4xl font-semibold leading-tight">{title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[#6F6B67]">
          Màn hình này đang được nối vào route thật và sẽ được hoàn thiện trong các bước tiếp theo của bản demo.
        </p>
      </div>
    </main>
  )
}

export const appRoutes: RouteObject[] = [
  { path: ROUTES.home, element: <PlaceholderPage title="Trang chủ StyleMind" /> },
  { path: ROUTES.login, element: <PlaceholderPage title="Đăng nhập" /> },
  { path: ROUTES.register, element: <PlaceholderPage title="Đăng ký" /> },
  { path: ROUTES.verifyOtp, element: <PlaceholderPage title="Xác thực OTP" /> },
  { path: ROUTES.forgotPassword, element: <PlaceholderPage title="Quên mật khẩu" /> },
  { path: ROUTES.resetPassword, element: <PlaceholderPage title="Đặt lại mật khẩu" /> },
  { path: ROUTES.shop, element: <PlaceholderPage title="Cửa hàng" /> },
  { path: ROUTES.product, element: <PlaceholderPage title="Chi tiết sản phẩm" /> },
  { path: ROUTES.cart, element: <PlaceholderPage title="Giỏ hàng" /> },
  { path: ROUTES.checkout, element: <PlaceholderPage title="Thanh toán" /> },
  { path: ROUTES.checkoutQr, element: <PlaceholderPage title="Thanh toán VietQR" /> },
  { path: ROUTES.orderSuccess, element: <PlaceholderPage title="Đặt hàng thành công" /> },
  { path: ROUTES.orders, element: <PlaceholderPage title="Đơn hàng của tôi" /> },
  { path: ROUTES.notifications, element: <PlaceholderPage title="Thông báo" /> },
  { path: ROUTES.account, element: <PlaceholderPage title="Tài khoản" /> },
  { path: ROUTES.aiWardrobe, element: <PlaceholderPage title="AI Wardrobe" /> },
  { path: ROUTES.wardrobes, element: <PlaceholderPage title="Tủ đồ của tôi" /> },
  { path: ROUTES.admin, element: <PlaceholderPage title="Khu quản trị" /> },
  { path: '*', element: <NotFoundPage /> },
]

export function AppRouter() {
  return <RouterProvider router={createBrowserRouter(appRoutes)} />
}
