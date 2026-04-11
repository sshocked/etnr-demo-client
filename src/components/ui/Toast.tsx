import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'
import { cn } from '../../lib/utils'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

let nextId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++nextId
    setToasts(prev => [...prev, { id, message, type }])
    const duration = type === 'error' ? 5000 : 3000
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div aria-live="polite" role="status" className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 w-[90vw] max-w-sm">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
}

const colors = {
  success: 'bg-gray-900/90 dark:bg-gray-100/95',
  error: 'bg-red-600/95 dark:bg-red-500/95',
  info: 'bg-gray-900/90 dark:bg-gray-100/95',
}

const textColors = {
  success: 'text-white dark:text-gray-900',
  error: 'text-white',
  info: 'text-white dark:text-gray-900',
}

const iconColors = {
  success: 'text-green-400 dark:text-green-600',
  error: 'text-white/90',
  info: 'text-brand-400 dark:text-brand-600',
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const Icon = icons[toast.type]
  return (
    <div
      className={cn(
        'toast-enter flex items-center gap-3 px-4 py-3.5 rounded-2xl backdrop-blur-xl shadow-lg min-w-[280px]',
        colors[toast.type],
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0', iconColors[toast.type])} />
      <span className={cn('font-medium flex-1 text-[14px] leading-snug', textColors[toast.type])}>{toast.message}</span>
      <button onClick={onClose} className="shrink-0 p-0.5 hover:opacity-70">
        <X className={cn('h-4 w-4', textColors[toast.type])} />
      </button>
    </div>
  )
}
