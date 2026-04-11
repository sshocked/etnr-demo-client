import { forwardRef, useId } from 'react'
import { cn } from '../../lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const generatedId = useId()
    const errorId = `${id ?? generatedId}-error`

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
        )}
        <input
          ref={ref}
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'w-full px-4 py-3.5 rounded-[14px] border bg-white dark:bg-gray-800/80 text-base text-gray-900 dark:text-gray-100 transition-all duration-200',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500',
            error
              ? 'border-red-400 dark:border-red-500 focus:ring-red-500/40 focus:border-red-500'
              : 'border-gray-200 dark:border-gray-600',
            className,
          )}
          {...props}
        />
        {error && <p id={errorId} className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    )
  },
)

Input.displayName = 'Input'

export default Input
