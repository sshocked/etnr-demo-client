import { cn } from '../../lib/utils'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
}

const variants = {
  primary: 'bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white shadow-[0_1px_2px_rgba(124,58,237,0.4)]',
  secondary: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600',
  ghost: 'bg-transparent text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/50 active:bg-brand-100 dark:active:bg-brand-950',
  danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-[0_1px_2px_rgba(220,38,38,0.3)]',
}

const sizes = {
  sm: 'px-4 py-2.5 text-sm min-h-[40px]',
  md: 'px-6 py-3 text-[15px] min-h-[48px]',
  lg: 'px-8 py-3.5 text-base min-h-[52px]',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading,
  fullWidth,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[14px] font-semibold transition-all duration-200 select-none',
        'active:scale-[0.97]',
        'disabled:opacity-40 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-5 w-5 animate-spin" />}
      {children}
    </button>
  )
}
