import type { Address } from '@/entities/address/model/types'
import type { CartLine } from '@/entities/cart/model/types'
import type { Order } from '@/entities/order/model/types'

import type { DemoAction, DemoDatabase } from './types'

function findVariant(database: DemoDatabase, variantId: string) {
  for (const product of database.products) {
    const variant = product.variants.find(item => item.id === variantId)
    if (variant) return { product, variant }
  }
  return null
}

function capQuantity(database: DemoDatabase, variantId: string, quantity: number) {
  const result = findVariant(database, variantId)
  if (!result || !result.product.active || !result.variant.active) return 0
  return Math.max(0, Math.min(quantity, result.variant.stock))
}

function upsertAddress(addresses: Address[], address: Address) {
  const withoutDuplicate = addresses.filter(item => item.id !== address.id)
  if (!address.isDefault) return [...withoutDuplicate, address]

  return [
    ...withoutDuplicate.map(item => (item.userId === address.userId ? { ...item, isDefault: false } : item)),
    address,
  ]
}

function withPlacedOrder(state: DemoDatabase, order: Order): DemoDatabase {
  const duplicate = state.orders.some(
    item => item.id === order.id || (order.paymentReference && item.paymentReference === order.paymentReference),
  )
  if (duplicate) return state

  const purchasedVariantIds = new Set(order.items.map(item => item.variantId))

  return {
    ...state,
    orders: [...state.orders, order],
    cartLines: state.cartLines.filter(line => !purchasedVariantIds.has(line.variantId)),
  }
}

export function normalizeDemoDatabase(database: DemoDatabase): DemoDatabase {
  const activeUsers = new Set(database.users.filter(user => user.status === 'active').map(user => user.id))
  const session = database.session && activeUsers.has(database.session.userId) ? database.session : null
  const cartLines = database.cartLines
    .map(line => {
      const quantity = capQuantity(database, line.variantId, line.quantity)
      return quantity > 0 ? { ...line, quantity } : null
    })
    .filter(Boolean) as CartLine[]

  return {
    ...database,
    session,
    cartLines,
  }
}

export function demoReducer(state: DemoDatabase, action: DemoAction): DemoDatabase {
  switch (action.type) {
    case 'database/replaced':
      return normalizeDemoDatabase(action.payload)
    case 'session/loggedIn': {
      const user = state.users.find(item => item.id === action.payload.userId && item.status === 'active')
      if (!user) return state
      return { ...state, session: action.payload }
    }
    case 'session/loggedOut':
      return { ...state, session: null }
    case 'user/registered':
      return normalizeDemoDatabase({ ...state, users: [...state.users, action.payload] })
    case 'user/passwordChanged':
      return {
        ...state,
        users: state.users.map(user =>
          user.id === action.payload.userId ? { ...user, password: action.payload.password } : user,
        ),
      }
    case 'cart/lineAdded': {
      const quantity = capQuantity(state, action.payload.variantId, action.payload.quantity)
      if (quantity <= 0) return state

      const existingLine = state.cartLines.find(
        line =>
          line.productId === action.payload.productId &&
          line.variantId === action.payload.variantId &&
          line.source === action.payload.source,
      )

      if (!existingLine) {
        return {
          ...state,
          cartLines: [
            ...state.cartLines,
            {
              id: `cart-${action.payload.variantId}-${Date.now()}`,
              ...action.payload,
              quantity,
            },
          ],
        }
      }

      const nextQuantity = capQuantity(state, action.payload.variantId, existingLine.quantity + action.payload.quantity)
      return {
        ...state,
        cartLines: state.cartLines.map(line => (line.id === existingLine.id ? { ...line, quantity: nextQuantity } : line)),
      }
    }
    case 'cart/quantityChanged':
      return normalizeDemoDatabase({
        ...state,
        cartLines: state.cartLines
          .map(line => (line.id === action.payload.lineId ? { ...line, quantity: action.payload.quantity } : line))
          .filter(line => line.quantity > 0),
      })
    case 'cart/lineRemoved':
      return { ...state, cartLines: state.cartLines.filter(line => line.id !== action.payload.lineId) }
    case 'address/upserted':
      return { ...state, addresses: upsertAddress(state.addresses, action.payload) }
    case 'address/defaultChanged': {
      const address = state.addresses.find(item => item.id === action.payload.addressId)
      if (!address) return state
      return {
        ...state,
        addresses: state.addresses.map(item =>
          item.userId === address.userId ? { ...item, isDefault: item.id === action.payload.addressId } : item,
        ),
      }
    }
    case 'order/placed':
      return withPlacedOrder(state, action.payload)
    default:
      return state
  }
}
