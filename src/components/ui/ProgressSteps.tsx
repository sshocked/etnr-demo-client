import { Check } from 'lucide-react'
import { cn } from '../../lib/utils'

interface ProgressStepsProps {
  steps: string[]
  currentStep: number
}

export default function ProgressSteps({ steps, currentStep }: ProgressStepsProps) {
  return (
    <div className="flex items-center justify-between w-full max-w-md mx-auto px-4">
      {steps.map((label, i) => {
        const completed = i < currentStep
        const active = i === currentStep
        return (
          <div key={i} className="flex flex-col items-center flex-1">
            <div className="flex items-center w-full">
              {i > 0 && (
                <div
                  className={cn(
                    'h-0.5 flex-1 transition-colors duration-300',
                    i <= currentStep ? 'bg-brand-600' : 'bg-gray-200 dark:bg-gray-700',
                  )}
                />
              )}
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300',
                  completed && 'bg-brand-600 text-white',
                  active && 'bg-brand-600 text-white ring-4 ring-brand-100 dark:ring-brand-900/50',
                  !completed && !active && 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500',
                )}
              >
                {completed ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="text-xs font-bold">{i + 1}</span>
                )}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 flex-1 transition-colors duration-300',
                    i < currentStep ? 'bg-brand-600' : 'bg-gray-200 dark:bg-gray-700',
                  )}
                />
              )}
            </div>
            <span
              className={cn(
                'text-xs mt-2 text-center',
                (completed || active) ? 'text-brand-700 dark:text-brand-400 font-medium' : 'text-gray-400 dark:text-gray-500',
              )}
            >
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
