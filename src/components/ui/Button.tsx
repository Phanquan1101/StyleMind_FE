import React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'ai' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  icon?: React.ReactNode
  fullWidth?: boolean
  loading?: boolean
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth = false,
  loading = false,
  disabled,
  className = '',
  style,
  ...props
}: ButtonProps) {
  const baseClasses =
    'relative inline-flex items-center justify-center font-medium rounded-full transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#684B5A] focus-visible:ring-offset-2 select-none active:scale-[0.98]'

  const sizeClasses = {
    sm: 'text-xs px-4 py-2 min-h-[38px] gap-1.5',
    md: 'text-sm px-5 py-2.5 min-h-[44px] gap-2',
    lg: 'text-base px-7 py-3.5 min-h-[48px] gap-2.5',
  }[size]

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: '#684B5A',
      color: '#FAF8F5',
      boxShadow: '0 2px 8px rgba(104, 75, 90, 0.18)',
    },
    secondary: {
      backgroundColor: '#EEE8E1',
      color: '#222222',
      border: '1px solid #D8D0C6',
    },
    outline: {
      backgroundColor: 'transparent',
      color: '#3A3632',
      border: '1px solid #D8D0C6',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: '#6F6B67',
    },
    ai: {
      backgroundColor: '#F4E7E8',
      color: '#684B5A',
      border: '1px solid rgba(104, 75, 90, 0.2)',
      boxShadow: '0 2px 10px rgba(244, 231, 232, 0.6)',
    },
    destructive: {
      backgroundColor: '#FCEAEA',
      color: '#A94B4B',
      border: '1px solid rgba(169, 75, 75, 0.25)',
    },
  }

  return (
    <button
      disabled={disabled || loading}
      className={`${baseClasses} ${sizeClasses} ${fullWidth ? 'w-full' : ''} ${className}`}
      style={{ ...variantStyles[variant], ...style }}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
      ) : (
        icon && <span className="flex-none text-[15px] leading-none" aria-hidden="true">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  )
}
