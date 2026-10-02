import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router-dom'

import { CustomerLayout } from '@/app/layouts/CustomerLayout'
import { AuthGuard } from '@/app/router/guards/AuthGuard'
import { GuestGuard } from '@/app/router/guards/GuestGuard'
import { AccountPage, AddressBookPage } from '@/features/account'
import { AiStylistCreatePage } from '@/features/ai-stylist'
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
import { NotificationsPage } from '@/features/notifications'
import { ManualOutfitBuilderPage } from '@/features/outfit-builder'
import { OrderDetailPage, OrdersPage } from '@/features/orders'
import { ProductDetailPage } from '@/features/product-detail'
import { PublicOutfitPage, SharedWithMePage } from '@/features/sharing'
import { OutfitDetailPage, WardrobePage } from '@/features/wardrobe'
import { NotFoundPage } from '@/shared/ui/NotFoundPage'

import { ROUTES } from './routes'

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
      { path: 'orders', element: <AuthGuard><OrdersPage /></AuthGuard> },
      { path: 'orders/:orderId', element: <AuthGuard><OrderDetailPage /></AuthGuard> },
      { path: 'notifications', element: <AuthGuard><NotificationsPage /></AuthGuard> },
      { path: 'account', element: <AuthGuard><AccountPage /></AuthGuard> },
      { path: 'account/addresses', element: <AuthGuard><AddressBookPage /></AuthGuard> },
      { path: 'ai-wardrobe', element: <AuthGuard><AiStylistCreatePage /></AuthGuard> },
      { path: 'wardrobes', element: <AuthGuard><WardrobePage /></AuthGuard> },
      { path: 'wardrobes/new', element: <AuthGuard><ManualOutfitBuilderPage /></AuthGuard> },
      { path: 'wardrobes/new/ai', element: <AuthGuard><AiStylistCreatePage /></AuthGuard> },
      { path: 'outfits/:outfitId', element: <AuthGuard><OutfitDetailPage /></AuthGuard> },
      { path: 'shared-with-me', element: <AuthGuard><SharedWithMePage /></AuthGuard> },
      { path: 'shared/outfits/:token', element: <PublicOutfitPage /> },
    ],
  },
  { path: ROUTES.admin, element: <AuthGuard roles={['admin']}><AdminAccessPage /></AuthGuard> },
  { path: '*', element: <NotFoundPage /> },
]

export function AppRouter() {
  return <RouterProvider router={createBrowserRouter(appRoutes)} />
}
