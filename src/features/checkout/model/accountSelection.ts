import { loadAccountDraft, saveAccountDraft } from './accountCheckout'
import { paymentApi } from '@/features/payments/api/paymentClient'

export type AccountSelection = { kind: 'selected'; cart_item_ids: string[] } | { kind: 'buy-now'; variant_id: string; quantity: number }

export function beginAccountSelection(owner: string, selection: AccountSelection): boolean {
  const existing = loadAccountDraft(owner)
  if (existing.submitted && !existing.orderId) return false
  saveAccountDraft(owner, { checkoutKey: crypto.randomUUID(), addressId: existing.addressId, method: existing.method, selection })
  return true
}

export async function accountSelectionRoute(owner: string, selection: AccountSelection): Promise<string> {
  if (beginAccountSelection(owner, selection)) return '/checkout'
  const existing = loadAccountDraft(owner)
  if ((existing.submitted?.payment_method ?? existing.method) !== 'SEPAY_VIETQR') return '/checkout'

  try {
    const checkout = existing.qrCheckoutId
      ? await paymentApi.getQrCheckout(existing.qrCheckoutId)
      : await paymentApi.recoverQrCheckout(existing.checkoutKey)
    if (loadAccountDraft(owner).checkoutKey !== existing.checkoutKey) return '/checkout'
    if (!checkout.checkoutId) return '/checkout'

    if (checkout.status === 'CANCELLED' || checkout.status === 'EXPIRED') {
      saveAccountDraft(owner, {
        checkoutKey: crypto.randomUUID(),
        addressId: existing.addressId,
        method: existing.method,
        selection,
      })
      return '/checkout'
    }
    saveAccountDraft(owner, { ...existing, qrCheckoutId: checkout.checkoutId })
    return '/checkout/qr/' + encodeURIComponent(checkout.checkoutId)
  } catch {
    // Resume the saved request so its original key remains available for recovery.
    return '/checkout'
  }
}
