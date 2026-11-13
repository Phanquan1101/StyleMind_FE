import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

interface ReturnOrder { orderId: string; owner: 'guest' | 'account' }

export default function VnpayReturnPage() {
  const navigate = useNavigate()
  const [missing, setMissing] = useState(false)
  useEffect(() => {
    try {
      const value = JSON.parse(localStorage.getItem('stylemind.vnpay.return-order') ?? 'null') as ReturnOrder | null
      if (!value?.orderId || !['guest', 'account'].includes(value.owner)) { setMissing(true); return }
      const destination = value.owner === 'guest' ? `/guest/orders/${encodeURIComponent(value.orderId)}` : `/payments/${encodeURIComponent(value.orderId)}`
      navigate(destination, { replace: true })
    } catch { setMissing(true) }
  }, [navigate])
  return <main className="mx-auto grid min-h-[50vh] max-w-xl content-center gap-4 px-6 text-center">
    <h1 className="font-display text-3xl font-semibold">Đang kiểm tra trạng thái thanh toán</h1>
    <p className="text-sm leading-6 text-secondary">StyleMind sẽ tải trạng thái đơn hàng từ hệ thống. Thông tin trên đường dẫn quay về không xác nhận thanh toán.</p>
    {missing && <p role="alert" className="text-sm text-error">Không tìm thấy đơn hàng cần kiểm tra trong phiên trình duyệt này. Hãy mở lại đơn hàng từ tài khoản hoặc liên hệ hỗ trợ.</p>}
    {missing && <Link to="/orders" className="text-accent underline">Mở danh sách đơn hàng</Link>}
  </main>
}
