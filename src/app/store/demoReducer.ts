import type { Address } from '@/entities/address/model/types'
import type { CartLine } from '@/entities/cart/model/types'
import type { Order } from '@/entities/order/model/types'
import type { Outfit } from '@/entities/outfit/model/types'
import type { OutfitShare } from '@/entities/share/model/types'

import type { DemoAction, DemoDatabase } from './types'

function findVariant(database: DemoDatabase, variantId: string) {
  for (const product of database.products) {
    const variant = product.variants.find(item => item.id === variantId)
    if (variant) return { product, variant }
  }
  return null
}

function normalizeQuantity(database: DemoDatabase, variantId: string, quantity: number) {
  const result = findVariant(database, variantId)
  if (!result || !result.product.active || !result.variant.active) return 0
  return Math.max(0, quantity)
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

function updateOutfit(outfits: Outfit[], outfitId: string, update: (outfit: Outfit) => Outfit) {
  return outfits.map(outfit => (outfit.id === outfitId ? update(outfit) : outfit))
}

function upsertShare(shares: OutfitShare[], share: OutfitShare) {
  const withoutDuplicate = shares.filter(
    item => !(item.outfitId === share.outfitId && item.viewerEmail.toLowerCase() === share.viewerEmail.toLowerCase()),
  )
  return [...withoutDuplicate, share]
}

export function normalizeDemoDatabase(database: DemoDatabase): DemoDatabase {
  const activeUsers = new Set(database.users.filter(user => user.status === 'active').map(user => user.id))
  const session = database.session && activeUsers.has(database.session.userId) ? database.session : null
  const cartLines = database.cartLines
    .map(line => {
      const quantity = normalizeQuantity(database, line.variantId, line.quantity)
      return quantity > 0 ? { ...line, quantity } : null
    })
    .filter(Boolean) as CartLine[]

  return {
    ...database,
    session,
    cartLines,
    outfits: database.outfits ?? [],
    outfitShares: database.outfitShares ?? [],
    aiConversations: database.aiConversations ?? [],
    cancellationRequests: database.cancellationRequests ?? [],
    returnRequests: database.returnRequests ?? [],
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
    case 'user/profileUpdated':
      return {
        ...state,
        users: state.users.map(user =>
          user.id === action.payload.userId
            ? {
                ...user,
                ...('fullName' in action.payload ? { fullName: action.payload.fullName ?? user.fullName } : {}),
                ...('phone' in action.payload ? { phone: action.payload.phone } : {}),
                ...('heightCm' in action.payload ? { heightCm: action.payload.heightCm } : {}),
                ...('weightKg' in action.payload ? { weightKg: action.payload.weightKg } : {}),
                ...('avatarUrl' in action.payload ? { avatarUrl: action.payload.avatarUrl } : {}),
                ...('avatarInitials' in action.payload ? { avatarInitials: action.payload.avatarInitials ?? user.avatarInitials } : {}),
              }
            : user,
        ),
      }
    case 'user/passwordChanged':
      return {
        ...state,
        users: state.users.map(user =>
          user.id === action.payload.userId ? { ...user, password: action.payload.password } : user,
        ),
      }
    case 'cart/lineAdded': {
      const quantity = normalizeQuantity(state, action.payload.variantId, action.payload.quantity)
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

      const nextQuantity = normalizeQuantity(state, action.payload.variantId, existingLine.quantity + action.payload.quantity)
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
    case 'address/deleted': {
      const removed = state.addresses.find(item => item.id === action.payload.addressId)
      const remaining = state.addresses.filter(item => item.id !== action.payload.addressId)
      if (!removed?.isDefault || remaining.some(item => item.userId === removed.userId && item.isDefault)) {
        return { ...state, addresses: remaining }
      }

      let defaultApplied = false
      return {
        ...state,
        addresses: remaining.map(item => {
          if (item.userId !== removed.userId || defaultApplied) return item
          defaultApplied = true
          return { ...item, isDefault: true }
        }),
      }
    }
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
    case 'outfit/created':
      return { ...state, outfits: [...state.outfits, action.payload] }
    case 'outfit/updated':
      return { ...state, outfits: state.outfits.map(outfit => (outfit.id === action.payload.id ? action.payload : outfit)) }
    case 'outfit/deleted':
      return {
        ...state,
        outfits: state.outfits.filter(outfit => outfit.id !== action.payload.outfitId),
        outfitShares: state.outfitShares.filter(share => share.outfitId !== action.payload.outfitId),
      }
    case 'outfit/itemAdded':
      return {
        ...state,
        outfits: updateOutfit(state.outfits, action.payload.outfitId, outfit => ({
          ...outfit,
          items: [...outfit.items, action.payload.item],
          updatedAt: new Date().toISOString(),
        })),
      }
    case 'outfit/itemUpdated':
      return {
        ...state,
        outfits: updateOutfit(state.outfits, action.payload.outfitId, outfit => ({
          ...outfit,
          items: outfit.items.map(item => (item.id === action.payload.itemId ? { ...item, ...action.payload.item } : item)),
          updatedAt: new Date().toISOString(),
        })),
      }
    case 'outfit/itemRemoved':
      return {
        ...state,
        outfits: updateOutfit(state.outfits, action.payload.outfitId, outfit => ({
          ...outfit,
          items: outfit.items.filter(item => item.id !== action.payload.itemId),
          updatedAt: new Date().toISOString(),
        })),
      }
    case 'outfit/publicToggled':
      return {
        ...state,
        outfits: updateOutfit(state.outfits, action.payload.outfitId, outfit => ({
          ...outfit,
          visibility: action.payload.enabled ? 'public' : 'private',
          publicToken: action.payload.enabled ? action.payload.publicToken ?? outfit.publicToken ?? `public-${outfit.id}` : undefined,
          updatedAt: new Date().toISOString(),
        })),
      }
    case 'share/granted':
      return { ...state, outfitShares: upsertShare(state.outfitShares, action.payload) }
    case 'share/revoked':
      return {
        ...state,
        outfitShares: state.outfitShares.map(share => (share.id === action.payload.shareId ? { ...share, active: false } : share)),
      }
    case 'notification/read':
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload.notificationId
            ? { ...notification, read: true, readAt: action.payload.readAt }
            : notification,
        ),
      }
    case 'notification/readAll':
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.userId === action.payload.userId
            ? { ...notification, read: true, readAt: action.payload.readAt }
            : notification,
        ),
      }
    case 'cancellation/submitted':
      return { ...state, cancellationRequests: [...state.cancellationRequests, action.payload] }
    case 'return/submitted':
      return { ...state, returnRequests: [...state.returnRequests, action.payload] }
    case 'ai/conversationUpserted':
      return {
        ...state,
        aiConversations: [
          ...state.aiConversations.filter(conversation => conversation.id !== action.payload.id),
          action.payload,
        ],
      }
    default:
      return state
  }
}
