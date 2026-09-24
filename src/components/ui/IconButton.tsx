import React from 'react'

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string
  icon: React.ReactNode
  variant?: 'ghost' | 'secondary' | 'primary' | 'ai'
  size?: 'sm' | 'md' | 'lg'
  badgeCount?: number
}

export default function IconButton({
  'aria-label': ariaLabel,
  icon,
  variant = 'ghost',
  size = 'md',
  badgeCount,
  disabled,
  className = '',
  style,
  ...props
}: IconButtonProps) {
  const sizeMap = {
    sm: 'w-9 h-9 text-sm',
    md: 'w-11 h-11 text-base',
    lg: 'w-12 h-12 text-lg',
  }[size]

  const variantStyles: Record<string, React.CSSProperties> = {
    ghost: {
      backgroundColor: 'transparent',
      color: '#6F6B67',
    },
    secondary: {
      backgroundColor: '#FAF8F5',
      color: '#3A3632',
      border: '1px solid #D8D0C6',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    },
    primary: {
      backgroundColor: '#684B5A',
      color: '#FAF8F5',
    },
    ai: {
      backgroundColor: '#F4E7E8',
      color: '#684B5A',
    },
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      className={`relative inline-flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#684B5A] focus-visible:ring-offset-2 ${sizeMap} ${className}`}
      style={{ ...variantStyles[variant], ...style }}
      {...props}
    >
      <span aria-hidden="true" className="flex items-center justify-center">
        {icon}
      </span>
      {typeof badgeCount === 'number' && badgeCount > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white border-2 border-[#FAF8F5] pointer-events-none"
          style={{ background: '#684B5A' }}
          aria-hidden="true"
        >
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
    </button>
  )
}
