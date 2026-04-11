import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, Smartphone, CheckCircle } from 'lucide-react'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Card from '../components/ui/Card'
import { useToast } from '../components/ui/Toast'
import { getItem, setItem } from '../lib/storage'
import { STORAGE_KEYS } from '../lib/constants'
import type { Subscription } from '../lib/constants'
import { cn } from '../lib/utils'

export default function PaymentPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const sub = getItem<Subscription>(STORAGE_KEYS.SUBSCRIPTION)
  const [tab, setTab] = useState<'card' | 'sbp'>('card')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // If subscription is already active, show info
  if (sub?.status === 'active' && !success) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 min-h-[calc(100vh-56px)]">
        <div className="w-20 h-20 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-6">
          <CheckCircle className="h-10 w-10 text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Подписка активна</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 text-center">Ваша подписка действует. Оплата не требуется.</p>
        <Button fullWidth onClick={() => navigate('/profile')}>Вернуться в профиль</Button>
      </div>
    )
  }

  const handlePay = () => {
    setLoading(true)
    setTimeout(() => {
      const sub = getItem<Subscription>(STORAGE_KEYS.SUBSCRIPTION)
      if (sub) {
        setItem(STORAGE_KEYS.SUBSCRIPTION, { ...sub, status: 'active' })
      }
      setLoading(false)
      setSuccess(true)
      toast('Оплата прошла успешно (демо)', 'success')
    }, 2000)
  }

  if (success) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 min-h-[calc(100vh-56px)]">
        <div className="w-20 h-20 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-6 scale-in">
          <CheckCircle className="h-10 w-10 text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Оплата прошла!</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Подписка активирована</p>
        <Button fullWidth onClick={() => navigate('/profile')}>Вернуться в профиль</Button>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
        {[
          { key: 'card' as const, icon: CreditCard, label: 'Карта' },
          { key: 'sbp' as const, icon: Smartphone, label: 'СБП' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-colors',
              tab === t.key ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400',
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'card' ? (
        <Card>
          <div className="space-y-4">
            <Input label="Номер карты" placeholder="0000 0000 0000 0000" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Срок" placeholder="MM/YY" />
              <Input label="CVV" placeholder="000" type="password" />
            </div>
            <Button fullWidth loading={loading} onClick={handlePay}>
              Оплатить 15 000 ₽
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Отсканируйте QR-код в приложении банка</p>
          {/* Mock QR */}
          <div className="w-48 h-48 mx-auto bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4 border-2 border-dashed border-gray-300 dark:border-gray-600">
            <div className="grid grid-cols-5 grid-rows-5 gap-1">
              {Array.from({ length: 25 }).map((_, i) => (
                <div key={i} className={cn('w-6 h-6 rounded-sm', Math.random() > 0.4 ? 'bg-gray-800' : 'bg-white')} />
              ))}
            </div>
          </div>
          <Button fullWidth variant="secondary" loading={loading} onClick={handlePay}>
            Открыть приложение банка
          </Button>
        </Card>
      )}

      <p className="text-xs text-center text-gray-400 dark:text-gray-500">Это демо-версия. Реальная оплата не производится.</p>
    </div>
  )
}
