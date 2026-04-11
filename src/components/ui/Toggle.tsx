import { cn } from '../../lib/utils'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
}

export default function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
      {label && <span className="text-[15px] text-gray-700 dark:text-gray-300">{label}</span>}
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-[30px] w-[52px] items-center rounded-full transition-colors duration-300 ease-in-out shrink-0',
          checked ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-600',
        )}
      >
        <span
          className={cn(
            'inline-block h-[26px] w-[26px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.15)] transition-transform duration-300 ease-in-out',
            checked ? 'translate-x-[24px]' : 'translate-x-[2px]',
          )}
        />
      </button>
    </label>
  )
}
