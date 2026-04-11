import { cn } from '../../lib/utils'

interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default'
  children: React.ReactNode
  className?: string
}

const variants = {
  success: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 ring-1 ring-green-600/10 dark:ring-green-400/20',
  warning: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 ring-1 ring-orange-600/10 dark:ring-orange-400/20',
  error: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 ring-1 ring-red-600/10 dark:ring-red-400/20',
  info: 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 ring-1 ring-brand-600/10 dark:ring-brand-400/20',
  default: 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 ring-1 ring-gray-600/5 dark:ring-gray-400/10',
}

export default function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
