import type { Address } from '@/entities/address/model/types'
import type { AddCartLineInput, CartLine } from '@/entities/cart/model/types'
import type { Notification } from '@/entities/notification/model/types'
import type { CancellationRequest, Order, ReturnRequest } from '@/entities/order/model/types'
import type {
  CompatibilityRule,
  FashionMetadata,
  Product,
  ProductCategory,
} from '@/entities/product/model/types'
import type { DemoSession, User } from '@/entities/user/model/types'

export interface AiMetrics {
  wardrobeCount: number
  generatedOutfits: number
  aiAddedToCart: number
  aiOrderCount: number
  popularStyles: { styleId: string; count: number }[]
}

export interface DemoDatabase {
  schemaVersion: 1
  users: User[]
  session: DemoSession | null
  products: Product[]
  categories: ProductCategory[]
  cartLines: CartLine[]
  addresses: Address[]
  orders: Order[]
  notifications: Notification[]
  cancellationRequests: CancellationRequest[]
  returnRequests: ReturnRequest[]
  fashionMetadata: FashionMetadata
  compatibilityRules: CompatibilityRule[]
  aiMetrics: AiMetrics
}

export type DemoAction =
  | { type: 'database/replaced'; payload: DemoDatabase }
  | { type: 'session/loggedIn'; payload: { userId: string; persistent: boolean } }
  | { type: 'session/loggedOut' }
  | { type: 'user/registered'; payload: User }
  | { type: 'user/passwordChanged'; payload: { userId: string; password: string } }
  | { type: 'cart/lineAdded'; payload: AddCartLineInput }
  | { type: 'cart/quantityChanged'; payload: { lineId: string; quantity: number } }
  | { type: 'cart/lineRemoved'; payload: { lineId: string } }
  | { type: 'address/upserted'; payload: Address }
  | { type: 'address/defaultChanged'; payload: { addressId: string } }
  | { type: 'order/placed'; payload: Order }
