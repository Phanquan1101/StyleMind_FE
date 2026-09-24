import { useState } from 'react'
import type { AppState } from '../types'
import { formatVND } from '../data/mockData'

type AdminSection = 'dashboard' | 'orders' | 'products' | 'returns' | 'users' | 'ai-knowledge' | 'notifications' | 'audit'

function fmt(n: number) { return formatVND(n) }

const navItems: { key: AdminSection; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '▣' },
  { key: 'orders', label: 'Orders', icon: '□' },
  { key: 'products', label: 'Catalog', icon: '◈' },
  { key: 'returns', label: 'Returns & Refunds', icon: '↩' },
  { key: 'users', label: 'Users', icon: '○' },
  { key: 'ai-knowledge', label: 'AI Knowledge', icon: '✦' },
  { key: 'notifications', label: 'Notifications', icon: '◎' },
  { key: 'audit', label: 'Audit Log', icon: '◷' },
]

const orders = [
  { id: 'SM2409200001', customer: 'Nguyen Thi Lan', status: 'SHIPPED', payment: 'SePay', total: 2_780_000, date: 'Sep 20', items: 2 },
  { id: 'SM2409190007', customer: 'Tran Phuong Anh', status: 'PENDING', payment: 'COD', total: 1_890_000, date: 'Sep 19', items: 1 },
  { id: 'SM2409180003', customer: 'Le Thi Hoa', status: 'PAID', payment: 'SePay', total: 4_380_000, date: 'Sep 18', items: 3 },
  { id: 'SM2409170009', customer: 'Pham My Linh', status: 'COMPLETED', payment: 'SePay', total: 990_000, date: 'Sep 17', items: 1 },
  { id: 'SM2409160002', customer: 'Vo Thuy Linh', status: 'CANCELLED', payment: 'COD', total: 1_290_000, date: 'Sep 16', items: 1 },
]

function statusBadge(status: string) {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    PENDING: { color: '#B67A32', bg: '#FBF1E0', label: 'Pending' },
    PAYMENT_PENDING: { color: '#B67A32', bg: '#FBF1E0', label: 'Awaiting Payment' },
    PAID: { color: '#684B5A', bg: '#F4E7E8', label: 'Paid' },
    CONFIRMED: { color: '#684B5A', bg: '#F4E7E8', label: 'Confirmed' },
    SHIPPED: { color: '#48755A', bg: '#EAF2EC', label: 'Shipped' },
    COMPLETED: { color: '#48755A', bg: '#EAF2EC', label: 'Completed' },
    CANCELLED: { color: '#A94B4B', bg: '#FCEAEA', label: 'Cancelled' },
    FAILED: { color: '#A94B4B', bg: '#FCEAEA', label: 'Failed' },
  }
  const s = map[status] || { color: '#9D9894', bg: '#EEE8E1', label: status }
  return <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: s.bg, color: s.color }}>{s.label}</span>
}

const knowledgeSources = [
  { id: 1, title: 'SS2026 Color Trend Report', type: 'Text', status: 'Approved', concepts: 14, date: 'Sep 15' },
  { id: 2, title: 'StyleMind Brand Guidelines v3', type: 'URL', status: 'Pending Review', concepts: 8, date: 'Sep 18' },
  { id: 3, title: 'Linen Blazer Styling Rules', type: 'Text', status: 'Draft', concepts: 6, date: 'Sep 20' },
  { id: 4, title: 'Da Lat Weather & Fashion', type: 'URL', status: 'Rejected', concepts: 3, date: 'Sep 14' },
]

function knowledgeBadge(status: string) {
  const map: Record<string, { color: string; bg: string }> = {
    Approved: { color: '#48755A', bg: '#EAF2EC' },
    'Pending Review': { color: '#B67A32', bg: '#FBF1E0' },
    Draft: { color: '#9D9894', bg: '#EEE8E1' },
    Rejected: { color: '#A94B4B', bg: '#FCEAEA' },
  }
  const s = map[status] || { color: '#9D9894', bg: '#EEE8E1' }
  return <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: s.bg, color: s.color }}>{status}</span>
}

interface Props {
  onNavigate: (screen: string, opts?: any) => void
  app?: AppState
}

export default function Admin({ onNavigate }: Props) {
  const [section, setSection] = useState<AdminSection>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F5F3F0', fontFamily: 'var(--font-sans)' }}>
      {/* Sidebar */}
      <aside className="w-60 border-r flex-none flex flex-col" style={{ borderColor: '#E8E4DF', background: '#FDFCFA' }}>
        {/* Logo */}
        <div className="px-5 py-5 border-b" style={{ borderColor: '#E8E4DF' }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#684B5A' }}>
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <div>
              <p className="font-display text-base font-semibold" style={{ color: '#222222' }}>StyleMind</p>
              <p className="text-xs" style={{ color: '#9D9894' }}>Admin Console</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => setSection(item.key)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left mb-0.5 transition-all"
              style={{
                background: section === item.key ? '#F4E7E8' : 'transparent',
                color: section === item.key ? '#684B5A' : '#6F6B67',
              }}
            >
              <span className="text-sm w-5 text-center">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
              {item.key === 'returns' && (
                <span className="ml-auto text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: '#F4E7E8', color: '#684B5A' }}>3</span>
              )}
            </button>
          ))}
        </nav>

        <div className="border-t p-4" style={{ borderColor: '#E8E4DF' }}>
          <button onClick={() => onNavigate('home')} className="w-full text-left text-xs" style={{ color: '#9D9894' }}>
            ← Return to Storefront
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {/* Topbar */}
        <div className="sticky top-0 z-10 px-8 py-4 border-b flex items-center justify-between" style={{ borderColor: '#E8E4DF', background: '#FDFCFA' }}>
          <h1 className="font-display text-xl font-semibold" style={{ color: '#222222' }}>
            {navItems.find(n => n.key === section)?.label}
          </h1>
          <div className="flex items-center gap-3">
            <div className="text-xs px-3 py-1.5 rounded-lg" style={{ background: '#EEE8E1', color: '#6F6B67' }}>
              Admin — Lan N.
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Dashboard */}
          {section === 'dashboard' && (
            <div className="fade-in">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Revenue (Sep)', value: fmt(87_400_000), trend: '+12%', color: '#48755A' },
                  { label: 'Orders Today', value: '14', trend: '+3 vs yesterday', color: '#684B5A' },
                  { label: 'Pending Payments', value: '5', trend: '2 SePay · 3 COD', color: '#B67A32' },
                  { label: 'Returns Awaiting Review', value: '3', trend: 'Needs attention', color: '#A94B4B' },
                ].map(stat => (
                  <div key={stat.label} className="rounded-2xl p-5 border" style={{ borderColor: '#E8E4DF', background: '#FDFCFA' }}>
                    <p className="text-xs mb-3" style={{ color: '#9D9894' }}>{stat.label}</p>
                    <p className="font-display text-2xl font-semibold mb-1" style={{ color: stat.color }}>{stat.value}</p>
                    <p className="text-xs" style={{ color: '#9D9894' }}>{stat.trend}</p>
                  </div>
                ))}
              </div>

              {/* Payment breakdown */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="rounded-2xl border p-5" style={{ borderColor: '#E8E4DF', background: '#FDFCFA' }}>
                  <p className="text-sm font-semibold mb-4" style={{ color: '#222222' }}>Payment Breakdown</p>
                  <div className="space-y-3">
                    {[
                      { label: 'SePay — Completed', value: fmt(62_400_000), color: '#48755A', pct: 71 },
                      { label: 'COD — Completed', value: fmt(18_200_000), color: '#684B5A', pct: 21 },
                      { label: 'SePay — Pending', value: fmt(4_300_000), color: '#B67A32', pct: 5 },
                      { label: 'Refunded', value: fmt(2_500_000), color: '#A94B4B', pct: 3 },
                    ].map(item => (
                      <div key={item.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span style={{ color: '#6F6B67' }}>{item.label}</span>
                          <span style={{ color: '#3A3632', fontWeight: 500 }}>{item.value}</span>
                        </div>
                        <div className="h-1.5 rounded-full" style={{ background: '#EEE8E1' }}>
                          <div className="h-1.5 rounded-full" style={{ width: `${item.pct}%`, background: item.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border p-5" style={{ borderColor: '#E8E4DF', background: '#FDFCFA' }}>
                  <p className="text-sm font-semibold mb-4" style={{ color: '#222222' }}>AI Performance</p>
                  <div className="space-y-3">
                    {[
                      { label: 'AI Styling Sessions Today', value: '143' },
                      { label: 'Outfits Generated', value: '312' },
                      { label: 'Cart Conversions from AI', value: '28' },
                      { label: 'AI → Purchase Rate', value: '18.5%' },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between text-sm">
                        <span style={{ color: '#6F6B67' }}>{item.label}</span>
                        <span style={{ color: '#684B5A', fontWeight: 600 }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Orders */}
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#E8E4DF' }}>
                <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: '#E8E4DF', background: '#FDFCFA' }}>
                  <p className="text-sm font-semibold" style={{ color: '#222222' }}>Recent Orders</p>
                  <button onClick={() => setSection('orders')} className="text-xs" style={{ color: '#684B5A' }}>View all →</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: '#F5F3F0' }}>
                        {['Order ID', 'Customer', 'Status', 'Payment', 'Items', 'Total'].map(h => (
                          <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#9D9894' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order, i) => (
                        <tr key={order.id} className="border-t hover:bg-ivory transition-all cursor-pointer" style={{ borderColor: '#E8E4DF' }} onClick={() => setSection('orders')}>
                          <td className="px-5 py-3.5 font-mono text-xs" style={{ color: '#684B5A' }}>#{order.id}</td>
                          <td className="px-5 py-3.5 font-medium" style={{ color: '#222222' }}>{order.customer}</td>
                          <td className="px-5 py-3.5">{statusBadge(order.status)}</td>
                          <td className="px-5 py-3.5 text-xs" style={{ color: '#6F6B67' }}>{order.payment}</td>
                          <td className="px-5 py-3.5 text-xs" style={{ color: '#6F6B67' }}>{order.items}</td>
                          <td className="px-5 py-3.5 font-semibold" style={{ color: '#3A3632' }}>{fmt(order.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Orders */}
          {section === 'orders' && (
            <div className="fade-in">
              <div className="flex gap-3 mb-6">
                <input placeholder="Search by order ID or customer..." className="flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: '#D8D0C6', background: '#FDFCFA', fontFamily: 'var(--font-sans)' }} />
                <select className="px-4 py-2.5 rounded-xl border text-sm appearance-none" style={{ borderColor: '#D8D0C6', background: '#FDFCFA', fontFamily: 'var(--font-sans)' }}>
                  <option>All Statuses</option>
                  <option>Pending</option>
                  <option>Shipped</option>
                  <option>Completed</option>
                </select>
              </div>
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#E8E4DF' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: '#F5F3F0' }}>
                      {['Order ID', 'Customer', 'Date', 'Status', 'Payment', 'Total', 'Actions'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#9D9894' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order.id} className="border-t hover:bg-ivory transition-all" style={{ borderColor: '#E8E4DF' }}>
                        <td className="px-5 py-3.5 font-mono text-xs" style={{ color: '#684B5A' }}>#{order.id}</td>
                        <td className="px-5 py-3.5 font-medium" style={{ color: '#222222' }}>{order.customer}</td>
                        <td className="px-5 py-3.5 text-xs" style={{ color: '#9D9894' }}>{order.date}</td>
                        <td className="px-5 py-3.5">{statusBadge(order.status)}</td>
                        <td className="px-5 py-3.5 text-xs" style={{ color: '#6F6B67' }}>{order.payment}</td>
                        <td className="px-5 py-3.5 font-semibold" style={{ color: '#3A3632' }}>{fmt(order.total)}</td>
                        <td className="px-5 py-3.5">
                          <button className="text-xs font-medium" style={{ color: '#684B5A' }}>View →</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AI Knowledge */}
          {section === 'ai-knowledge' && (
            <div className="fade-in">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm mb-1" style={{ color: '#9D9894' }}>Manage the knowledge that powers StyleMind's fashion intelligence.</p>
                </div>
                <button className="px-4 py-2.5 rounded-full text-sm font-semibold" style={{ background: '#684B5A', color: '#FAF8F5' }}>
                  + Add Source
                </button>
              </div>

              {/* Review queue alert */}
              <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl mb-6" style={{ background: '#FBF1E0' }}>
                <span style={{ color: '#B67A32' }}>⚠</span>
                <p className="text-sm" style={{ color: '#B67A32' }}>
                  <strong>1 source</strong> is awaiting review before being published to the AI.
                </p>
                <button className="ml-auto text-xs font-semibold underline" style={{ color: '#B67A32' }}>Review Now</button>
              </div>

              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#E8E4DF' }}>
                <div className="px-5 py-3.5 border-b" style={{ borderColor: '#E8E4DF', background: '#FDFCFA' }}>
                  <p className="text-sm font-semibold" style={{ color: '#222222' }}>Knowledge Sources</p>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: '#F5F3F0' }}>
                      {['Title', 'Type', 'Status', 'Concepts', 'Added', 'Actions'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#9D9894' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {knowledgeSources.map(src => (
                      <tr key={src.id} className="border-t hover:bg-ivory transition-all" style={{ borderColor: '#E8E4DF' }}>
                        <td className="px-5 py-3.5 font-medium" style={{ color: '#222222' }}>{src.title}</td>
                        <td className="px-5 py-3.5 text-xs" style={{ color: '#9D9894' }}>{src.type}</td>
                        <td className="px-5 py-3.5">{knowledgeBadge(src.status)}</td>
                        <td className="px-5 py-3.5 text-xs" style={{ color: '#6F6B67' }}>{src.concepts}</td>
                        <td className="px-5 py-3.5 text-xs" style={{ color: '#9D9894' }}>{src.date}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex gap-2">
                            <button className="text-xs" style={{ color: '#684B5A' }}>Review</button>
                            {src.status === 'Pending Review' && (
                              <button className="text-xs font-semibold" style={{ color: '#48755A' }}>Approve</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Returns */}
          {section === 'returns' && (
            <div className="fade-in">
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { label: 'Awaiting Review', value: '3', color: '#B67A32', bg: '#FBF1E0' },
                  { label: 'Approved — Awaiting Return', value: '2', color: '#684B5A', bg: '#F4E7E8' },
                  { label: 'Refunds Pending', value: '1', color: '#48755A', bg: '#EAF2EC' },
                ].map(s => (
                  <div key={s.label} className="rounded-2xl p-5 border" style={{ borderColor: '#E8E4DF', background: s.bg }}>
                    <p className="font-display text-2xl font-semibold mb-1" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs" style={{ color: s.color }}>{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#E8E4DF' }}>
                <div className="px-5 py-3.5 border-b" style={{ borderColor: '#E8E4DF', background: '#FDFCFA' }}>
                  <p className="text-sm font-semibold" style={{ color: '#222222' }}>Return Requests</p>
                </div>
                {[
                  { id: 'RT001', customer: 'Nguyen Thi Lan', item: 'Ivory Linen Blazer', reason: 'Wrong size', status: 'Awaiting Review', date: 'Sep 20' },
                  { id: 'RT002', customer: 'Pham My Linh', item: 'Silk Blouse — Ecru', reason: 'Quality issue', status: 'Approved', date: 'Sep 18' },
                  { id: 'RT003', customer: 'Le Thi Hoa', item: 'Pleated Midi Skirt', reason: 'Changed my mind', status: 'Rejected', date: 'Sep 15' },
                ].map(r => (
                  <div key={r.id} className="flex items-center gap-4 px-5 py-4 border-t" style={{ borderColor: '#E8E4DF' }}>
                    <div className="flex-1">
                      <p className="text-sm font-semibold" style={{ color: '#222222' }}>{r.customer} — {r.item}</p>
                      <p className="text-xs" style={{ color: '#9D9894' }}>#{r.id} · {r.reason} · {r.date}</p>
                    </div>
                    {knowledgeBadge(r.status === 'Awaiting Review' ? 'Pending Review' : r.status === 'Approved' ? 'Approved' : 'Rejected')}
                    <button className="text-xs font-medium" style={{ color: '#684B5A' }}>View →</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generic placeholder for other sections */}
          {!['dashboard', 'orders', 'ai-knowledge', 'returns'].includes(section) && (
            <div className="py-16 text-center fade-in">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: '#EEE8E1' }}>
                <span className="text-2xl" style={{ color: '#9D9894' }}>
                  {navItems.find(n => n.key === section)?.icon}
                </span>
              </div>
              <p className="font-display text-xl font-light mb-2" style={{ color: '#222222' }}>{navItems.find(n => n.key === section)?.label}</p>
              <p className="text-sm" style={{ color: '#9D9894' }}>This section is ready for content.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
