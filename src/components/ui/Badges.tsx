import React from 'react'
import { formatVND } from '../../data/mockData'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'neutral' | 'success' | 'warning' | 'error' | 'ai' | 'owned' | 'shop'
  className?: string
  size?: 'sm' | 'md'
  icon?: React.ReactNode
}

export function Badge({ children, variant = 'neutral', className = '', size = 'sm', icon }: BadgeProps) {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    neutral: { bg: '#EEE8E1', color: '#6F6B67', border: '#D8D0C6' },
    success: { bg: '#EAF2EC', color: '#48755A', border: 'rgba(72, 117, 90, 0.25)' },
    warning: { bg: '#FBF1E0', color: '#B67A32', border: 'rgba(182, 122, 50, 0.25)' },
    error: { bg: '#FCEAEA', color: '#A94B4B', border: 'rgba(169, 75, 75, 0.25)' },
    ai: { bg: '#F4E7E8', color: '#684B5A', border: 'rgba(104, 75, 90, 0.2)' },
    owned: { bg: '#EAF2EC', color: '#48755A', border: '#B4D3BD' },
    shop: { bg: '#F4E7E8', color: '#684B5A', border: '#E8D0D2' },
  }

  const current = styles[variant] || styles.neutral
  const sizeClasses = size === 'sm' ? 'text-[11px] px-2.5 py-0.5' : 'text-xs px-3 py-1'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium tracking-wide border transition-all ${sizeClasses} ${className}`}
      style={{ background: current.bg, color: current.color, borderColor: current.border }}
    >
      {icon && <span className="flex-none text-[12px] leading-none">{icon}</span>}
      <span>{children}</span>
    </span>
  )
}

export function OwnedBadge({ label = 'Owned', className = '', size = 'sm' }: { label?: string; className?: string; size?: 'sm' | 'md' }) {
  return (
    <Badge
      variant="owned"
      size={size}
      className={`shadow-xs font-semibold ${className}`}
      icon={<span aria-hidden="true" className="font-bold">✓</span>}
    >
      <span className="sr-only">Status: </span>{label}
    </Badge>
  )
}

export function ShopBadge({
  price,
  label = 'Buy',
  className = '',
  size = 'sm'
}: {
  price?: number
  label?: string
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <Badge
      variant="shop"
      size={size}
      className={`shadow-xs font-semibold ${className}`}
      icon={<span aria-hidden="true" className="font-bold">+</span>}
    >
      <span className="sr-only">Recommended to </span>
      {label} {price !== undefined ? `· ${formatVND(price)}` : ''}
    </Badge>
  )
}

export function UnavailableBadge({
  reason = 'Unavailable',
  className = '',
  size = 'sm'
}: {
  reason?: string
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <Badge
      variant="neutral"
      size={size}
      className={`bg-[#E8E2D9] text-[#78736E] border-[#D8D0C6] line-through-none opacity-90 ${className}`}
      icon={<span aria-hidden="true" className="font-bold">○</span>}
    >
      <span className="sr-only">Status: </span>{reason}
    </Badge>
  )
}

export function AIBadge({
  label = 'AI Curated',
  className = '',
  size = 'sm'
}: {
  label?: string
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <Badge
      variant="ai"
      size={size}
      className={`font-semibold ${className}`}
      icon={<span aria-hidden="true">✦</span>}
    >
      {label}
    </Badge>
  )
}

export default Badge
