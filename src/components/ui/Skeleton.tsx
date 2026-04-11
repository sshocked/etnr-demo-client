import { cn } from '../../lib/utils'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circle' | 'rect'
  width?: string | number
  height?: string | number
}

export default function Skeleton({ className, variant = 'text', width, height }: SkeletonProps) {
  return (
    <div
      className={cn(
        'skeleton',
        variant === 'text' && 'h-4 w-full rounded-lg',
        variant === 'circle' && 'rounded-full',
        variant === 'rect' && 'rounded-2xl',
        className,
      )}
      style={{ width, height }}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton width="60%" />
        <Skeleton width={80} className="h-5 rounded-full" />
      </div>
      <Skeleton width="80%" />
      <Skeleton width="40%" />
    </div>
  )
}
