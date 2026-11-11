import { beforeEach, expect, it, vi } from 'vitest'
import { accountSelectionRoute, beginAccountSelection } from './accountSelection'
import { accountDraftKey, loadAccountDraft, saveAccountDraft } from './accountCheckout'
import { beginGuestSelection } from './guestSelection'
import { loadGuestDraft } from './guestCheckout'
import { paymentApi } from '@/features/payments/api/paymentClient'

vi.mock('@/features/payments/api/paymentClient', () => ({
  paymentApi: { getQrCheckout: vi.fn(), recoverQrCheckout: vi.fn() },
}))

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.resetAllMocks() })
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

function savedQr() {
  const draft = {
    checkoutKey: 'prior-key',
    addressId: 'address',
    method: 'SEPAY_VIETQR' as const,
    qrCheckoutId: 'prior-qr',
    submitted: { checkout_key: 'prior-key', shipping_address_id: 'address', payment_method: 'SEPAY_VIETQR' as const },
  }
  saveAccountDraft('user', draft)
  return draft
}

const nextSelection = { kind: 'buy-now' as const, variant_id: 'new-variant', quantity: 1 }

it.each(['CANCELLED', 'EXPIRED'] as const)('allows a new selection after the server confirms the QR is %s', async status => {
  savedQr()
  vi.mocked(paymentApi.getQrCheckout).mockResolvedValue({
    checkoutId: 'prior-qr', customerId: 'user', totalVnd: 30000, status, expiresAt: '2026-11-11T01:08:39Z',
  })
  expect(await accountSelectionRoute('user', nextSelection)).toBe('/checkout')
  const draft = loadAccountDraft('user')
  expect(draft.selection).toEqual(nextSelection)
  expect(draft.checkoutKey).not.toBe('prior-key')
  expect(draft.submitted).toBeUndefined()
  expect(draft.qrCheckoutId).toBeUndefined()
})

it.each(['AWAITING_PAYMENT', 'ORDER_CREATED', 'RECONCILIATION_REQUIRED'] as const)('resumes the original QR in state %s', async status => {
  const draft = savedQr()
  vi.mocked(paymentApi.getQrCheckout).mockResolvedValue({
    checkoutId: 'prior-qr', customerId: 'user', totalVnd: 30000, status, expiresAt: '2026-11-11T01:08:39Z',
  })
  expect(await accountSelectionRoute('user', nextSelection)).toBe('/checkout/qr/prior-qr')
  expect(loadAccountDraft('user')).toEqual(draft)
})

it('retains the original key when the prior QR cannot be checked', async () => {
  const draft = savedQr()
  vi.mocked(paymentApi.getQrCheckout).mockRejectedValue(new Error('Network unavailable'))
  expect(await accountSelectionRoute('user', nextSelection)).toBe('/checkout')
  expect(loadAccountDraft('user')).toEqual(draft)
})

it('recovers a QR whose creation response was lost before starting a new selection', async () => {
  const draft = savedQr()
  saveAccountDraft('user', { ...draft, qrCheckoutId: undefined })
  vi.mocked(paymentApi.recoverQrCheckout).mockResolvedValue({
    checkoutId: 'recovered-qr', customerId: 'user', totalVnd: 30000, status: 'AWAITING_PAYMENT', expiresAt: '2026-11-11T01:08:39Z',
  })
  expect(await accountSelectionRoute('user', nextSelection)).toBe('/checkout/qr/recovered-qr')
  expect(paymentApi.recoverQrCheckout).toHaveBeenCalledWith('prior-key')
  expect(loadAccountDraft('user').checkoutKey).toBe('prior-key')
})

it('preserves a newer checkout draft when another tab changes it during recovery', async () => {
  savedQr()
  vi.mocked(paymentApi.getQrCheckout).mockImplementation(async () => {
    saveAccountDraft('user', { checkoutKey: 'newer-key', addressId: 'address', method: 'COD' })
    return { checkoutId: 'prior-qr', customerId: 'user', totalVnd: 30000, status: 'EXPIRED', expiresAt: '2026-11-11T01:08:39Z' }
  })
  expect(await accountSelectionRoute('user', nextSelection)).toBe('/checkout')
  expect(loadAccountDraft('user').checkoutKey).toBe('newer-key')
})
