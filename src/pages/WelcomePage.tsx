import { useNavigate } from 'react-router-dom'
import { FileCheck } from 'lucide-react'
import Button from '../components/ui/Button'
import { setAuth, setItem, getItem } from '../lib/storage'
import { STORAGE_KEYS } from '../lib/constants'
import { seedDocuments, seedTrips } from '../data/mockDocuments'
import { defaultUser, defaultSubscription, defaultMcds } from '../data/mockUser'
import { seedActivity } from '../data/mockHistory'
import { seedNotifications } from '../data/mockNotifications'

export default function WelcomePage() {
  const navigate = useNavigate()
  const hasPin = !!getItem(STORAGE_KEYS.PIN)
  const user = getItem(STORAGE_KEYS.USER)

  const handleLogin = () => {
    if (hasPin && user) {
      // Returning user — go to PIN/biometrics login
      navigate('/pin-login')
    } else {
      // New user — phone auth
      navigate('/auth')
    }
  }

  const handleDemo = () => {
    setAuth({ isAuthenticated: true, phone: defaultUser.phone })
    setItem(STORAGE_KEYS.USER, defaultUser)
    setItem(STORAGE_KEYS.DOCUMENTS, seedDocuments())
    setItem(STORAGE_KEYS.ACTIVITY, seedActivity())
    setItem(STORAGE_KEYS.SUBSCRIPTION, defaultSubscription)
    setItem(STORAGE_KEYS.MCD, defaultMcds)
    setItem(STORAGE_KEYS.NOTIFICATIONS, seedNotifications())
    setItem(STORAGE_KEYS.TRIPS, seedTrips())
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center text-center max-w-sm">
        {/* Logo */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mb-6 shadow-lg">
          <FileCheck className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">eTRN</h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 mb-10 leading-relaxed">
          Подписывай ЭТрН прямо с телефона
        </p>

        <div className="w-full space-y-3">
          <Button fullWidth size="lg" onClick={handleLogin}>
            Войти
          </Button>
          <Button fullWidth size="lg" variant="secondary" onClick={handleDemo}>
            Попробовать демо
          </Button>
        </div>

        <p className="text-xs text-gray-400 mt-8">Версия 1.0 — Демо</p>
      </div>
    </div>
  )
}
