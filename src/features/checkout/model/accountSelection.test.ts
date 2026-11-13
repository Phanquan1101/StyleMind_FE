import { beforeEach, expect, it } from 'vitest'
import { beginAccountSelection } from './accountSelection'
import { accountDraftKey, loadAccountDraft } from './accountCheckout'
import { beginGuestSelection } from './guestSelection'
import { loadGuestDraft } from './guestCheckout'

beforeEach(() => { localStorage.clear(); sessionStorage.clear() })
it('persists the selected cart items for preview and checkout', () => {
  expect(beginAccountSelection('user', { kind: 'selected', cart_item_ids: ['item-1'] })).toBe(true)
  expect(loadAccountDraft('user').selection).toEqual({ kind: 'selected', cart_item_ids: ['item-1'] })
})
it('persists a guest buy-now selection without putting address details in local storage', () => {
  expect(beginGuestSelection({ kind: 'buy-now', variant_id: 'variant', quantity: 2 })).toBe(true)
  expect(loadGuestDraft().selection).toEqual({ kind: 'buy-now', variant_id: 'variant', quantity: 2 })
  sessionStorage.clear()
  expect(loadGuestDraft().selection).toEqual({ kind: 'buy-now', variant_id: 'variant', quantity: 2 })
})
it('does not replace a checkout with an unknown prior outcome', () => {
  localStorage.setItem(accountDraftKey('user'), JSON.stringify({ checkoutKey: 'old', method: 'COD', submitted: { checkout_key: 'old' } }))
  expect(beginAccountSelection('user', { kind: 'buy-now', variant_id: 'variant', quantity: 1 })).toBe(false)
  expect(loadAccountDraft('user').checkoutKey).toBe('old')
})

it('starts an independent selection when an existing QR checkout is known', () => {
  localStorage.setItem(accountDraftKey('user'), JSON.stringify({ checkoutKey: 'old', method: 'SEPAY_VIETQR', qrCheckoutId: 'pending-qr', submitted: { checkout_key: 'old' } }))
  const selection = { kind: 'buy-now' as const, variant_id: 'variant', quantity: 1 }
  expect(beginAccountSelection('user', selection)).toBe(true)
  const draft = loadAccountDraft('user')
  expect(draft.checkoutKey).not.toBe('old')
  expect(draft.selection).toEqual(selection)
  expect(draft.qrCheckoutId).toBeUndefined()
  expect(draft.submitted).toBeUndefined()
})
