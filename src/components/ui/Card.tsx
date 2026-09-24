import React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'sand' | 'blush' | 'outline'
  interactive?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export default function Card({
  children,
  variant = 'default',
  interactive = false,
  padding = 'md',
  className = '',
  style,
  ...props
}: CardProps) {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }[padding]

  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      backgroundColor: '#FDFCFA',
      borderColor: '#EEE8E1',
      boxShadow: '0 1px 6px rgba(0, 0, 0, 0.03)',
    },
    elevated: {
      backgroundColor: '#FFFFFF',
      borderColor: '#EEE8E1',
      boxShadow: '0 8px 24px -6px rgba(34, 34, 34, 0.06)',
    },
    sand: {
      backgroundColor: '#EEE8E1',
      borderColor: '#D8D0C6',
    },
    blush: {
      backgroundColor: '#F4E7E8',
      borderColor: 'rgba(104, 75, 90, 0.15)',
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: '#D8D0C6',
    },
  }

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 ${paddingClasses} ${
        interactive ? 'cursor-pointer hover:border-[#684B5A]/40 hover:shadow-md' : ''
      } ${className}`}
      style={{ ...variantStyles[variant], ...style }}
      {...props}
    >
      {children}
    </div>
  )
}
