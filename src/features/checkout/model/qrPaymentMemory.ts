// The payment reference of a QR checkout is only returned while the checkout is payable (the API answers
// 409 CHECKOUT_NOT_PAYABLE afterwards). Customers who transferred money late still need it to contact the shop,
// so remember it in this browser while the QR page is open.
export interface RememberedQrPayment {
  reference: string
  amountVnd: number
  transferContent: string | null
}

const key = (checkoutId: string) => `stylemind.qr.payment.${checkoutId}`

export function rememberQrPayment(checkoutId: string, payment: RememberedQrPayment) {
  try { window.localStorage.setItem(key(checkoutId), JSON.stringify(payment)) } catch { /* storage unavailable */ }
}

export function readQrPayment(checkoutId: string): RememberedQrPayment | null {
  try {
    const raw = window.localStorage.getItem(key(checkoutId))
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<RememberedQrPayment>
    return typeof value.reference === 'string' && typeof value.amountVnd === 'number'
      ? { reference: value.reference, amountVnd: value.amountVnd, transferContent: value.transferContent ?? null }
      : null
  } catch {
    return null
  }
}
