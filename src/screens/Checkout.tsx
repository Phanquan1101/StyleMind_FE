import { useState, useEffect } from 'react'
import type { AppState } from '../types'
import Money from '../components/ui/Money'
import Button from '../components/ui/Button'
import { formatVND } from '../data/mockData'

type CheckoutStep = 'address' | 'payment' | 'transfer' | 'confirmed'

interface Props {
  onNavigate: (screen: string, opts?: any) => void
  app?: AppState
}

export default function Checkout({ onNavigate, app }: Props) {
  const [step, setStep] = useState<CheckoutStep>('address')
  const [payMethod, setPayMethod] = useState<'qr' | 'cod'>('qr')
  const [qrStatus, setQrStatus] = useState<'waiting' | 'received' | 'expired'>('waiting')
  const [countdown, setCountdown] = useState(600) // 10 minutes

  const items = app?.cartItems || []
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0) || 2540000
  const shipping = subtotal >= 2000000 ? 0 : 30000
  const total = subtotal + shipping

  // Simulated live countdown timer for QR
  useEffect(() => {
    if (step !== 'transfer' || qrStatus !== 'waiting') return

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setQrStatus('expired')
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // Simulate system-confirmed payment via SePay webhook after 7 seconds
    const simulatedWebhook = setTimeout(() => {
      setQrStatus('received')
      setTimeout(() => {
        setStep('confirmed')
        if (app?.setCartCount) app.setCartCount(0)
      }, 1500)
    }, 7000)

    return () => {
      clearInterval(timer)
      clearTimeout(simulatedWebhook)
    }
  }, [step, qrStatus])

  const mins = Math.floor(countdown / 60)
  const secs = countdown % 60

  const stepsList: { key: CheckoutStep; label: string }[] = [
    { key: 'address', label: '1. Shipping' },
    { key: 'payment', label: '2. Payment' },
    { key: 'transfer', label: '3. Confirmation' },
    { key: 'confirmed', label: '4. Complete' },
  ]

  return (
    <div style={{ background: '#FAF8F5', minHeight: '100vh' }}>
      {/* Checkout Steps Progress */}
      <div className="px-6 md:px-16 pt-10 pb-6 border-b border-[#EEE8E1]">
        <h1 className="font-display text-3xl sm:text-4xl font-light text-[#222222] mb-6">
          Checkout
        </h1>

        <div className="flex items-center gap-2 max-w-xl" role="navigation" aria-label="Checkout Progress">
          {stepsList.map((s, i) => {
            const stepOrder: CheckoutStep[] = ['address', 'payment', 'transfer', 'confirmed']
            const currentIdx = stepOrder.indexOf(step)
            const isCompleted = i < currentIdx
            const isActive = s.key === step

            return (
              <div key={s.key} className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCompleted
                        ? 'bg-[#48755A] text-white'
                        : isActive
                        ? 'bg-[#684B5A] text-white'
                        : 'bg-[#EEE8E1] text-[#9D9894]'
                    }`}
                  >
                    {isCompleted ? '✓' : i + 1}
                  </span>
                  <span
                    className={`text-xs hidden sm:inline font-medium ${
                      isActive ? 'text-[#684B5A] font-semibold' : 'text-[#6F6B67]'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < stepsList.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 ${
                      i < currentIdx ? 'bg-[#48755A]' : 'bg-[#EEE8E1]'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="px-6 md:px-16 py-8 pb-24 max-w-5xl">
        {/* STEP 1: Shipping Address */}
        {step === 'address' && (
          <div className="grid md:grid-cols-[1fr_360px] gap-8 items-start">
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-white border border-[#EEE8E1] shadow-2xs space-y-4">
                <h2 className="font-display text-xl font-light text-[#222222]">
                  Delivery Address
                </h2>
                <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#684B5A] relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-[#222222]">Nguyen Thi Lan</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EAF2EC] text-[#48755A]">
                      Default
                    </span>
                  </div>
                  <p className="text-xs text-[#6F6B67] leading-relaxed">
                    47 Đường Trần Thái Tông, Phường Dịch Vọng Hậu, Quận Cầu Giấy, TP. Hà Nội
                  </p>
                  <p className="text-xs text-[#6F6B67] mt-1">Phone: 0901 234 567</p>
                </div>
                <button
                  type="button"
                  className="text-xs text-[#684B5A] font-semibold hover:underline"
                >
                  + Add New Delivery Address
                </button>
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => onNavigate('cart')}
                >
                  ← Back to Bag
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  className="flex-1"
                  onClick={() => setStep('payment')}
                >
                  Continue to Payment →
                </Button>
              </div>
            </div>

            {/* Mini Summary */}
            <div className="p-6 rounded-3xl bg-white border border-[#EEE8E1] space-y-4">
              <h3 className="text-sm font-semibold text-[#222222] uppercase tracking-wider">
                Order Review
              </h3>
              <div className="space-y-2 text-xs text-[#6F6B67] pt-2 border-t border-[#EEE8E1]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <Money amount={subtotal} className="text-[#222222]" />
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? 'Free' : formatVND(shipping)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-[#222222] pt-2 border-t border-[#EEE8E1]">
                  <span>Total</span>
                  <Money amount={total} className="text-[#684B5A]" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Payment Method */}
        {step === 'payment' && (
          <div className="grid md:grid-cols-[1fr_360px] gap-8 items-start">
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-white border border-[#EEE8E1] shadow-2xs space-y-4">
                <h2 className="font-display text-xl font-light text-[#222222]">
                  Select Payment Method
                </h2>

                <div
                  onClick={() => setPayMethod('qr')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    payMethod === 'qr'
                      ? 'border-[#684B5A] bg-[#F4E7E8]/40 ring-1 ring-[#684B5A]'
                      : 'border-[#EEE8E1] bg-white hover:bg-[#FAF8F5]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📱</span>
                    <div>
                      <p className="text-sm font-semibold text-[#222222]">
                        VietQR Instant Transfer (SePay Confirmed)
                      </p>
                      <p className="text-xs text-[#6F6B67]">
                        Scan via any Vietnamese banking app (MB, Vietcombank, Techcombank...). Instant system verification.
                      </p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="payment"
                    checked={payMethod === 'qr'}
                    onChange={() => setPayMethod('qr')}
                    aria-label="VietQR Instant Transfer"
                  />
                </div>

                <div
                  onClick={() => setPayMethod('cod')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    payMethod === 'cod'
                      ? 'border-[#684B5A] bg-[#F4E7E8]/40 ring-1 ring-[#684B5A]'
                      : 'border-[#EEE8E1] bg-white hover:bg-[#FAF8F5]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📦</span>
                    <div>
                      <p className="text-sm font-semibold text-[#222222]">
                        Cash on Delivery (COD)
                      </p>
                      <p className="text-xs text-[#6F6B67]">
                        Pay in cash upon parcel receipt. Inspection permitted before acceptance.
                      </p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="payment"
                    checked={payMethod === 'cod'}
                    onChange={() => setPayMethod('cod')}
                    aria-label="Cash on Delivery"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setStep('address')}
                >
                  ← Back
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  className="flex-1"
                  onClick={() => {
                    if (payMethod === 'qr') {
                      setStep('transfer')
                    } else {
                      setStep('confirmed')
                      if (app?.setCartCount) app.setCartCount(0)
                    }
                  }}
                >
                  {payMethod === 'qr' ? 'Generate VietQR Code →' : 'Confirm Order (COD) →'}
                </Button>
              </div>
            </div>

            {/* Mini Summary */}
            <div className="p-6 rounded-3xl bg-white border border-[#EEE8E1] space-y-4">
              <h3 className="text-sm font-semibold text-[#222222] uppercase tracking-wider">
                Order Review
              </h3>
              <div className="space-y-2 text-xs text-[#6F6B67] pt-2 border-t border-[#EEE8E1]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <Money amount={subtotal} className="text-[#222222]" />
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? 'Free' : formatVND(shipping)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-[#222222] pt-2 border-t border-[#EEE8E1]">
                  <span>Total</span>
                  <Money amount={total} className="text-[#684B5A]" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: VietQR Payment Step (Product Principle 77: No 'I already paid' button!) */}
        {step === 'transfer' && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="p-8 rounded-3xl bg-white border border-[#EEE8E1] shadow-md text-center">
              <span className="text-xs uppercase tracking-widest font-bold text-[#B98791] block mb-1">
                VietQR Instant Transfer
              </span>
              <h2 className="font-display text-2xl font-light text-[#222222] mb-1">
                Scan with your Banking App
              </h2>
              <p className="text-xs text-[#6F6B67] mb-6">
                System will automatically detect your transfer. Do not close this page.
              </p>

              {/* Realistic QR Code Graphic */}
              <div className="w-56 h-56 mx-auto mb-6 p-4 rounded-3xl bg-[#FAF8F5] border-2 border-[#684B5A]/20 flex flex-col items-center justify-center relative shadow-inner">
                {qrStatus === 'waiting' && (
                  <div className="grid grid-cols-5 gap-2 w-full h-full p-2">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div
                        key={i}
                        className="rounded-sm"
                        style={{
                          backgroundColor:
                            i % 2 === 0 || i % 7 === 0 || i === 12 ? '#222222' : '#EEE8E1',
                        }}
                      />
                    ))}
                  </div>
                )}
                {qrStatus === 'received' && (
                  <div className="flex flex-col items-center justify-center gap-2 fade-in">
                    <span className="w-14 h-14 rounded-full bg-[#48755A] text-white flex items-center justify-center text-2xl font-bold">
                      ✓
                    </span>
                    <span className="text-xs font-bold text-[#48755A]">Payment Confirmed</span>
                  </div>
                )}
              </div>

              {/* Total Amount & Reference */}
              <div className="mb-6">
                <Money amount={total} className="text-3xl font-bold text-[#684B5A]" />
                <p className="text-xs text-[#9D9894] mt-1">Exact transfer amount</p>
              </div>

              {/* Transfer Details Matrix */}
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EEE8E1] space-y-2.5 text-xs text-left mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-[#6F6B67]">Receiving Bank</span>
                  <strong className="text-[#222222]">MB Bank (Ngân hàng Quân Đội)</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6F6B67]">Account Number</span>
                  <strong className="text-[#222222] font-mono text-sm">0389 2049 1928</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6F6B67]">Account Holder</span>
                  <strong className="text-[#222222]">STYLEMIND VIETNAM CO.</strong>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-[#EEE8E1]">
                  <span className="text-[#6F6B67]">Transfer Memo</span>
                  <strong className="text-[#684B5A] font-mono text-sm">SM24092001</strong>
                </div>
              </div>

              {/* Live Status Signal (Principle 77: strictly system-reported) */}
              {qrStatus === 'waiting' && (
                <div className="p-4 rounded-2xl bg-[#FBF1E0] border border-[#B67A32]/30 flex items-center justify-center gap-3">
                  <span className="w-4 h-4 border-2 border-[#B67A32] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-semibold text-[#B67A32]">
                    Listening for bank webhook confirmation · Expires in {mins}:{secs < 10 ? `0${secs}` : secs}
                  </span>
                </div>
              )}

              {qrStatus === 'received' && (
                <div className="p-4 rounded-2xl bg-[#EAF2EC] border border-[#48755A]/30 flex items-center justify-center gap-2">
                  <span className="text-[#48755A] font-bold">✓</span>
                  <span className="text-xs font-semibold text-[#48755A]">
                    Transfer received and confirmed by bank! Finalizing order...
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setStep('payment')}
                className="text-xs text-[#6F6B67] hover:text-[#222222] underline"
              >
                Cancel and choose a different payment method
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Order Confirmed */}
        {step === 'confirmed' && (
          <div className="max-w-lg mx-auto text-center p-8 rounded-3xl bg-white border border-[#EEE8E1] shadow-lg space-y-6 fade-in">
            <div className="w-16 h-16 rounded-full bg-[#EAF2EC] text-[#48755A] flex items-center justify-center text-2xl font-bold mx-auto">
              ✓
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest font-semibold text-[#B98791]">
                Order Placed Successfully
              </span>
              <h2 className="font-display text-3xl font-light text-[#222222] mt-1 mb-2">
                Thank You, Lan!
              </h2>
              <p className="text-xs sm:text-sm text-[#6F6B67] leading-relaxed">
                Order <strong>#ORD-2026-0891</strong> has been confirmed. A confirmation receipt has been sent to your email.
              </p>
            </div>

            {/* Timeline preview */}
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EEE8E1] text-xs text-left space-y-2">
              <div className="flex justify-between font-semibold text-[#48755A]">
                <span>Status</span>
                <span>Confirmed & Processing</span>
              </div>
              <div className="flex justify-between text-[#6F6B67]">
                <span>Est. Delivery</span>
                <span>Sep 22, 2026</span>
              </div>
              <div className="flex justify-between text-[#6F6B67]">
                <span>Carrier</span>
                <span>Giao Hàng Nhanh (GHN)</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Button
                variant="primary"
                fullWidth
                size="md"
                onClick={() => onNavigate('orders')}
              >
                Track Order Status
              </Button>
              <Button
                variant="outline"
                fullWidth
                size="md"
                onClick={() => onNavigate('home')}
              >
                Back to Home
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
