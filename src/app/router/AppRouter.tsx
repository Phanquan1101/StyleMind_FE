import { createBrowserRouter, Link, RouterProvider, type RouteObject } from 'react-router-dom'

import { CustomerLayout } from '@/app/layouts/CustomerLayout'
import { DeferredWardrobePage } from '@/features/wardrobe'
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
  { path: ROUTES.login, element: <PlaceholderPage title="Đăng nhập" /> },
  { path: ROUTES.register, element: <PlaceholderPage title="Đăng ký" /> },
  { path: ROUTES.verifyOtp, element: <PlaceholderPage title="Xác thực OTP" /> },
  { path: ROUTES.forgotPassword, element: <PlaceholderPage title="Quên mật khẩu" /> },
  { path: ROUTES.resetPassword, element: <PlaceholderPage title="Đặt lại mật khẩu" /> },
  {
    path: ROUTES.home,
    element: <CustomerLayout />,
    children: [
      { index: true, element: <PlaceholderPage title="Trang chủ StyleMind" /> },
      { path: 'shop', element: <PlaceholderPage title="Cửa hàng" /> },
      { path: 'products/:productId', element: <PlaceholderPage title="Chi tiết sản phẩm" /> },
      { path: 'cart', element: <PlaceholderPage title="Giỏ hàng" /> },
      { path: 'checkout', element: <PlaceholderPage title="Thanh toán" /> },
      { path: 'checkout/qr', element: <PlaceholderPage title="Thanh toán VietQR" /> },
      { path: 'order-success/:orderId', element: <PlaceholderPage title="Đặt hàng thành công" /> },
      { path: 'orders', element: <PlaceholderPage title="Đơn hàng của tôi" /> },
      { path: 'notifications', element: <PlaceholderPage title="Thông báo" /> },
      { path: 'account', element: <PlaceholderPage title="Tài khoản" /> },
      { path: 'ai-wardrobe', element: <DeferredWardrobePage /> },
      { path: 'wardrobes', element: <DeferredWardrobePage /> },
    ],
  },
  { path: ROUTES.admin, element: <PlaceholderPage title="Khu quản trị" /> },
  { path: '*', element: <NotFoundPage /> },
]

export function AppRouter() {
  return <RouterProvider router={createBrowserRouter(appRoutes)} />
}
