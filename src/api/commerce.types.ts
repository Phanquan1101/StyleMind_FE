export type UUID = string

export interface ApiProblem {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
  code?: string
  correlation_id?: string
  errors?: Array<{ field: string; code?: string; message: string }>
}

export interface CatalogReference {
  id: UUID
  name: string
  slug: string
  is_active: boolean
  /** Admin category list only. */
  product_count?: number
}

export interface CatalogReferenceList {
  items: CatalogReference[]
}

export interface CatalogReferenceInput {
  name: string
  slug: string
  is_active: boolean
}

export interface VariantImage {
  image_id: UUID
  variant_id: UUID
  image_url: string
  alt_text: string | null
  display_order: number
  is_primary: boolean
}

export interface ProductVariant {
  variant_id: UUID
  product_id: UUID
  sku: string
  size: string | null
  color: string | null
  material: string | null
  unit_price_vnd: number
  variant_status: string
  available_quantity: number
  images: VariantImage[]
}

export interface CommerceProduct {
  product_id: UUID
  category_id: UUID
  brand_id: UUID
  category_name: string
  brand_name: string
  name: string
  description: string | null
  demographic_segment: string | null
  product_status: string
  variants: ProductVariant[]
}

export interface ProductListResponse {
  items: CommerceProduct[]
  page: number
  size: number
  total_elements: number
  total_pages: number
}

export interface ProductListQuery {
  keyword?: string
  /** One id, or several (a product matches when it is in any of them). */
  category_id?: UUID | UUID[]
  min_price_vnd?: number
  max_price_vnd?: number
  demographic_segment?: string
  sort?: 'price_asc' | 'price_desc'
  page?: number
  size?: number
}

export interface AdminProductListQuery {
  keyword?: string
  category_id?: UUID | UUID[]
  status?: 'ACTIVE' | 'INACTIVE'
  page?: number
  size?: number
}

export interface ProductInput {
  category_id: UUID
  brand_id: UUID
  name: string
  description: string | null
  demographic_segment: string | null
  product_status: string
}

export interface VariantInput {
  sku: string
  size: string | null
  color: string | null
  material: string | null
  unit_price_vnd: number
  quantity: number
  variant_status: string
}

export interface ImageOrderInput {
  items: Array<{ image_id: UUID; display_order: number }>
  primary_image_id: UUID | null
}

export interface Branch {
  branch_id: UUID
  branch_code: string
  name: string
  address_line: string
  contact_phone: string | null
  branch_status: string
}

export interface BranchListResponse {
  items: Branch[]
}

export interface BranchInput {
  branch_code: string
  name: string
  address_line: string
  contact_phone: string | null
  branch_status: string
}

export interface CartItemResponse {
  cart_item_id: UUID
  variant_id: UUID
  sku: string
  product_name: string
  brand_name: string
  color: string | null
  size: string | null
  material: string | null
  quantity: number
  unit_price_vnd: number
  line_total_vnd: number
}

export interface CartResponse {
  cart_id: UUID
  customer_id: UUID | null
  guest_session_key: string | null
  cart_status: string
  items: CartItemResponse[]
  total_vnd: number
}

export interface CheckoutPriceResponse {
  items: CartItemResponse[]
  total_vnd: number
}

export interface OrderAddress {
  source_address_id: UUID
  recipient_name: string
  recipient_phone: string
  address_line: string
}

export interface OrderItemResponse {
  order_item_id: UUID
  variant_id: UUID
  sku_snapshot: string
  product_name_snapshot: string
  brand_name_snapshot: string
  color_snapshot: string | null
  size_snapshot: string | null
  material_snapshot: string | null
  image_url_snapshot: string | null
  quantity: number
  unit_price_vnd: number
  line_total_vnd: number
}

export interface OrderHistoryEntry {
  history_id: UUID
  from_status: string | null
  to_status: string
  actor_user_id: UUID | null
  changed_at: string
  reason: string | null
}

export interface CancellationRequestResponse {
  cancellation_request_id: UUID
  order_id: UUID
  requested_by_user_id: UUID
  reason: string
  request_status: string
  requested_at: string
  reviewed_by_user_id: UUID | null
  reviewed_at: string | null
  decision_reason: string | null
  refund_status?: 'PENDING_REFUND' | 'REFUNDED' | null
}

export interface OrderResponse {
  order_id: UUID
  order_number: string
  customer_id: UUID
  checkout_key: string
  order_status: string
  confirmation_state?: 'UNCONFIRMED' | 'CONFIRMED' | 'AUTO_CONFIRMED' | 'LEGACY_UNKNOWN'
  payment_status?: 'PENDING' | 'PAID' | string
  refunded_amount_vnd?: number
  refund_status?: 'PENDING_REFUND' | 'PARTIALLY_REFUNDED' | 'REFUNDED' | null
  payment_method: 'COD' | 'SEPAY_VIETQR' | 'VNPAY'
  accepted_total_vnd: number
  placed_at: string | null
  completed_at: string | null
  address: OrderAddress
  items: OrderItemResponse[]
  history: OrderHistoryEntry[]
  cancellation_request: CancellationRequestResponse | null
}

export interface OrderListResponse {
  items: OrderResponse[]
  page: number
  size: number
  total_elements: number
  total_pages: number
}

export interface OrderListQuery {
  status?: string
  page?: number
  size?: number
}

export interface CheckoutInput {
  checkout_key: string
  shipping_address_id: UUID
  payment_method: 'COD' | 'SEPAY_VIETQR' | 'VNPAY'
}

export interface PaymentAttempt {
  id: UUID
  orderId: UUID
  method: string
  amountVnd: number
  reference: string
  status: string
  expiresAt: string | null
  transferContent: string | null
  qrPayload: string | null
  paymentUrl?: string | null
}



/** GET /api/v1/admin/dashboard — money is VND, dates are shop-local days (Asia/Ho_Chi_Minh). */
export interface AdminDashboardKpi {
  revenue_vnd: number
  placed_order_count: number
  paid_order_count: number
  average_order_value_vnd: number
}

export interface AdminDashboardDay {
  date: string
  revenue_vnd: number
  paid_order_count: number
  placed_order_count: number
}

export type AdminDashboardStatusKey =
  | 'AWAITING_CONFIRMATION'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'COMPLETED'
  | 'PENDING_PAYMENT'
  | 'CANCELLED'

export interface AdminDashboard {
  timezone: string
  from: string
  to: string
  days: number
  previous_from: string
  previous_to: string
  generated_at: string
  kpis: { current: AdminDashboardKpi; previous: AdminDashboardKpi }
  revenue_by_day: AdminDashboardDay[]
  orders_by_status: { status: AdminDashboardStatusKey; count: number }[]
  revenue_by_payment_method: { payment_method: 'VNPAY' | 'COD' | 'SEPAY_VIETQR'; revenue_vnd: number }[]
  top_products: { product_id: UUID; name: string; image_url: string | null; quantity: number; revenue_vnd: number }[]
  pending: { awaiting_confirmation_orders: number; pending_cancellation_requests: number; low_stock_variants: number }
  recent_orders: {
    order_id: UUID
    order_number: string
    customer_name: string | null
    total_vnd: number
    order_status: string
    confirmation_state: string
    paid: boolean
    placed_at: string
  }[]
}

export interface AdminDashboardQuery {
  from?: string
  to?: string
}

/** GET /api/v1/admin/revenue — collected money by period, same revenue definition as the dashboard. */
export interface AdminRevenueMetrics {
  paid_order_count: number
  revenue_vnd: number
  refunded_vnd: number
  net_revenue_vnd: number
}

export type AdminRevenueGroup = 'day' | 'week' | 'month'

export interface AdminRevenuePeriod {
  from: string
  to: string
  previous_from: string
  previous_to: string
  current: AdminRevenueMetrics
  previous: AdminRevenueMetrics
}

export interface AdminRevenueReport {
  timezone: string
  from: string
  to: string
  days: number
  previous_from: string
  previous_to: string
  group: AdminRevenueGroup
  generated_at: string
  totals: { current: AdminRevenueMetrics; previous: AdminRevenueMetrics }
  periods: AdminRevenuePeriod[]
  by_category: { category_id: UUID; name: string; revenue_vnd: number; quantity: number }[]
  by_payment_method: {
    payment_method: 'VNPAY' | 'COD' | 'SEPAY_VIETQR'
    revenue_vnd: number
    refunded_vnd: number
    net_revenue_vnd: number
    paid_order_count: number
  }[]
  top_products: { product_id: UUID; name: string; image_url: string | null; quantity: number; revenue_vnd: number }[]
}

export interface AdminRevenueQuery {
  from?: string
  to?: string
  group?: AdminRevenueGroup
}
