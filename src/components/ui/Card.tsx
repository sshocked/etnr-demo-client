import { cn } from '../../lib/utils'

interface CardProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  padding?: boolean
}

export default function Card({ children, onClick, className, padding = true }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700/50',
        'shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]',
        'dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)]',
        padding && 'p-4',
        onClick && 'cursor-pointer active:scale-[0.98] transition-all duration-200',
        className,
      )}
    >
      {children}
    </div>
  )
}
