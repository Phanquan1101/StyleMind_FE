import type { PaymentMethod, PaymentStatus, OrderStatus } from '@/entities/order/model/types'
import type { ProductSize } from '@/entities/product/model/types'
import type { UserRole, UserStatus } from '@/entities/user/model/types'

export type AdminSection = 'overview' | 'revenue' | 'products' | 'categories' | 'orders' | 'requests' | 'customers' | 'payments' | 'notifications' | 'settings' | 'ai'

export interface AdminDashboardSummary {
  totalUsers: number
  totalProducts: number
  totalOrders: number
  totalRevenue: number
  pendingRequestCount: number
  orderStatusCounts: { status: OrderStatus; count: number }[]
  paymentCounts: { method: PaymentMethod; status: PaymentStatus; count: number }[]
  ai: {
    outfitsTotal: number
    aiOutfits: number
    manualOutfits: number
    generatedOutfits: number
    aiAddedToCart: number
    aiOrderCount: number
    emailShares: number
    publicOutfits: number
  }
}

export interface AdminProductFilters {
  query?: string
  categoryId?: string
  status?: 'all' | 'active' | 'inactive'
}

export interface AdminProductRow {
  id: string
  name: string
  brand: string
  categoryLabel: string
  basePrice: number
  active: boolean
  deleted: boolean
  imageUrl: string | null
  variantCount: number
  colors: { color: string; colorHex: string }[]
  /** First SKU (+ more when the product has several variants), shown under the name instead of the UUID. */
  skuLabel: string
  variants: { id: string; color: string; colorHex: string; size: ProductSize; active: boolean; price: number; sku: string; stock: number }[]
}

export interface AdminOrderFilters {
  query?: string
  status?: 'all' | OrderStatus
  paymentMethod?: 'all' | PaymentMethod
}

export interface AdminOrderRow {
  id: string
  /** Customer-facing code (SM-XXXXXXXX). */
  orderNumber: string
  customerId: string
  customerName: string
  createdAt: string
  total: number
  status: OrderStatus
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  itemCount: number
}

export interface AdminRequestSummary {
  cancellationCount: number
  returnCount: number
  pendingCount: number
}

export interface AdminCustomerFilters {
  query?: string
  role?: 'all' | UserRole
  status?: 'all' | UserStatus
}

export interface AdminCustomerRow {
  id: string
  fullName: string
  email: string
  role: UserRole
  status: UserStatus
  orderCount: number
  outfitCount: number
  heightCm?: number
  weightKg?: number
}
