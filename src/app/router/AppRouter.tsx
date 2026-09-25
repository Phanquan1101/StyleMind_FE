import { createBrowserRouter, Link, RouterProvider, type RouteObject } from 'react-router-dom'

import { CustomerLayout } from '@/app/layouts/CustomerLayout'
import { AuthGuard } from '@/app/router/guards/AuthGuard'
import { GuestGuard } from '@/app/router/guards/GuestGuard'
import {
  AdminAccessPage,
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
  VerifyOtpPage,
} from '@/features/auth'
import { CartPage } from '@/features/cart'
import { ShopPage } from '@/features/catalog'
import { CheckoutPage, OrderSuccessPage, QrPaymentPage } from '@/features/checkout'
import { HomePage } from '@/features/home'
import { ProductDetailPage } from '@/features/product-detail'
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
  { path: ROUTES.login, element: <GuestGuard><LoginPage /></GuestGuard> },
  { path: ROUTES.register, element: <GuestGuard><RegisterPage /></GuestGuard> },
  { path: ROUTES.verifyOtp, element: <GuestGuard><VerifyOtpPage /></GuestGuard> },
  { path: ROUTES.forgotPassword, element: <GuestGuard><ForgotPasswordPage /></GuestGuard> },
  { path: ROUTES.resetPassword, element: <GuestGuard><ResetPasswordPage /></GuestGuard> },
  {
    path: ROUTES.home,
    element: <CustomerLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'shop', element: <ShopPage /> },
      { path: 'products/:productId', element: <ProductDetailPage /> },
      { path: 'cart', element: <CartPage /> },
      { path: 'checkout', element: <AuthGuard><CheckoutPage /></AuthGuard> },
      { path: 'checkout/qr', element: <AuthGuard><QrPaymentPage /></AuthGuard> },
      { path: 'order-success/:orderId', element: <AuthGuard><OrderSuccessPage /></AuthGuard> },
      { path: 'orders', element: <AuthGuard><PlaceholderPage title="Đơn hàng của tôi" /></AuthGuard> },
      { path: 'notifications', element: <AuthGuard><PlaceholderPage title="Thông báo" /></AuthGuard> },
      { path: 'account', element: <AuthGuard><PlaceholderPage title="Tài khoản" /></AuthGuard> },
      { path: 'ai-wardrobe', element: <DeferredWardrobePage /> },
      { path: 'wardrobes', element: <DeferredWardrobePage /> },
    ],
  },
  { path: ROUTES.admin, element: <AuthGuard roles={['admin']}><AdminAccessPage /></AuthGuard> },
  { path: '*', element: <NotFoundPage /> },
]

export function AppRouter() {
  return <RouterProvider router={createBrowserRouter(appRoutes)} />
}
