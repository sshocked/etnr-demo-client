import { useState, useEffect } from 'react'
import { WifiOff } from 'lucide-react'

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine)
  const [showBack, setShowBack] = useState(false)

  useEffect(() => {
    const goOffline = () => setOffline(true)
    const goOnline = () => {
      setOffline(false)
      setShowBack(true)
      setTimeout(() => setShowBack(false), 3000)
    }

    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  if (!offline && !showBack) return null

  return (
    <div
      className={`fixed top-14 left-0 right-0 z-40 px-4 py-2.5 text-center text-sm font-medium transition-all duration-300 ${
        offline
          ? 'bg-red-500 text-white'
          : 'bg-green-500 text-white'
      }`}
    >
      {offline ? (
        <span className="flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" />
          Нет подключения к интернету
        </span>
      ) : (
        'Подключение восстановлено'
      )}
    </div>
  )
}
