import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Fingerprint, ChevronLeft } from 'lucide-react'
import Button from '../components/ui/Button'
import { setItem, getItem } from '../lib/storage'
import { STORAGE_KEYS } from '../lib/constants'
import { cn } from '../lib/utils'
import { useToast } from '../components/ui/Toast'

type Step = 'create' | 'confirm' | 'biometrics'

export default function PinSetupPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [step, setStep] = useState<Step>('create')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const pinLength = 4
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [step])

  const activePin = step === 'create' ? pin : confirmPin
  const setActivePin = step === 'create' ? setPin : setConfirmPin

  const handleDigit = (digit: string) => {
    if (activePin.length >= pinLength) return
    const next = activePin + digit
    setActivePin(next)
    setError('')

    if (step === 'create' && next.length >= pinLength) {
      setTimeout(() => setStep('confirm'), 200)
    }

    if (step === 'confirm' && next.length === pin.length) {
      setTimeout(() => {
        if (next === pin) {
          setItem(STORAGE_KEYS.PIN, pin)
          setStep('biometrics')
        } else {
          setError('ПИН-коды не совпадают')
          setConfirmPin('')
        }
      }, 200)
    }
  }

  const handleDelete = () => {
    setActivePin(activePin.slice(0, -1))
    setError('')
  }

  const handleBiometrics = (enable: boolean) => {
    setItem(STORAGE_KEYS.BIOMETRICS, enable)
    toast(enable ? 'Биометрия включена' : 'Только ПИН-код', 'success')

    // Navigate to onboarding or dashboard
    const user = getItem(STORAGE_KEYS.USER) as any
    if (user && !user.onboardingCompleted) {
      navigate('/onboarding')
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
      {step !== 'biometrics' && (
        <header className="flex items-center h-14 px-4">
          <button
            onClick={() => {
              if (step === 'confirm') {
                setStep('create')
                setPin('')
                setConfirmPin('')
              } else {
                navigate(-1)
              }
            }}
            className="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronLeft className="h-6 w-6 text-gray-700 dark:text-gray-300" />
          </button>
        </header>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {step === 'create' && (
          <>
            <div className="w-16 h-16 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center mb-6">
              <Lock className="h-8 w-8 text-brand-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Создайте ПИН-код</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Для быстрого входа в приложение</p>

            <PinDots length={pinLength} filled={pin.length} error={!!error} />
            {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
            <div className="mt-8 w-full max-w-xs">
              <Numpad onDigit={handleDigit} onDelete={handleDelete} />
            </div>
          </>
        )}

        {step === 'confirm' && (
          <>
            <div className="w-16 h-16 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center mb-6">
              <Lock className="h-8 w-8 text-brand-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Повторите ПИН-код</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Введите ПИН-код ещё раз для подтверждения</p>

            <PinDots length={pin.length} filled={confirmPin.length} error={!!error} />
            {error && <p className="text-sm text-red-500 mt-3 animate-shake">{error}</p>}
            <div className="mt-8 w-full max-w-xs">
              <Numpad onDigit={handleDigit} onDelete={handleDelete} />
            </div>
          </>
        )}

        {step === 'biometrics' && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center mb-6 mx-auto">
              <Fingerprint className="h-10 w-10 text-brand-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Вход по биометрии</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-xs">
              Используйте Face ID, Touch ID или отпечаток пальца для быстрого входа
            </p>

            <div className="w-full max-w-xs mx-auto space-y-3">
              <Button fullWidth size="lg" onClick={() => handleBiometrics(true)}>
                <Fingerprint className="h-5 w-5" />
                Включить биометрию
              </Button>
              <Button fullWidth variant="ghost" onClick={() => handleBiometrics(false)}>
                Пропустить
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden input for keyboard on mobile */}
      <input
        ref={inputRef}
        type="number"
        inputMode="numeric"
        className="absolute opacity-0 h-0 w-0"
        value=""
        onChange={e => {
          const d = e.target.value.replace(/\D/g, '')
          if (d) handleDigit(d[d.length - 1])
        }}
      />
    </div>
  )
}

function PinDots({ length, filled, error }: { length: number; filled: number; error: boolean }) {
  return (
    <div className="flex gap-4 justify-center">
      {Array.from({ length }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-4 h-4 rounded-full transition-all duration-150',
            i < filled
              ? error ? 'bg-red-500 scale-110' : 'bg-brand-600 scale-110'
              : 'border-2 border-gray-300 dark:border-gray-600',
          )}
        />
      ))}
    </div>
  )
}

function Numpad({ onDigit, onDelete }: { onDigit: (d: string) => void; onDelete: () => void }) {
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'del'],
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {keys.flat().map((key, i) => {
        if (key === '') return <div key={i} />
        if (key === 'del') {
          return (
            <button
              key={i}
              onClick={onDelete}
              className="h-16 rounded-2xl flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )
        }
        return (
          <button
            key={i}
            onClick={() => onDigit(key)}
            className="h-16 rounded-2xl text-2xl font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 transition-colors"
          >
            {key}
          </button>
        )
      })}
    </div>
  )
}
