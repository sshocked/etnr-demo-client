import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, CheckCircle, AlertTriangle, CreditCard, Info, BellOff, UserCheck } from 'lucide-react'
import type { NotificationType } from '../lib/constants'
import { cn } from '../lib/utils'
import { api } from '../lib/api'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'

const ICON_MAP: Record<NotificationType, typeof FileText> = {
  new_doc: FileText,
  signed: CheckCircle,
  cert_expiry: AlertTriangle,
  mcd_expiry: AlertTriangle,
  payment: CreditCard,
  system: Info,
  assigned: UserCheck,
}

const ICON_COLORS: Record<NotificationType, { bg: string; text: string }> = {
  new_doc: { bg: 'bg-brand-50 dark:bg-brand-900/30', text: 'text-brand-600' },
  signed: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600' },
  cert_expiry: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600' },
  mcd_expiry: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600' },
  payment: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600' },
  system: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' },
  assigned: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600' },
}

const BORDER_COLORS: Record<NotificationType, string> = {
  new_doc: 'border-l-brand-500',
  signed: 'border-l-green-500',
  cert_expiry: 'border-l-orange-500',
  mcd_expiry: 'border-l-orange-500',
  payment: 'border-l-blue-500',
  system: 'border-l-gray-400',
  assigned: 'border-l-blue-500',
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'только что'
  if (minutes < 60) return `${minutes} мин назад`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ч назад`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'вчера'
  if (days < 7) return `${days} дн назад`
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

interface ApiNotification {
  id: string
  kind: string
  title: string
  body: string
  entityId?: string
  isRead: boolean
  createdAt: string
}

function kindToType(kind: string): NotificationType {
  const map: Record<string, NotificationType> = {
    document_received: 'new_doc',
    document_signed: 'signed',
    document_refused: 'signed',
    mcd_expiring: 'mcd_expiry',
    mcd_revoked: 'mcd_expiry',
    system: 'system',
  }
  return map[kind] ?? 'system'
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<ApiNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<{ notifications: ApiNotification[] }>('/notifications')
      .then(data => setNotifications(data.notifications ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const markAllRead = useCallback(async () => {
    await api.post('/notifications/read-all').catch(() => {})
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
  }, [])

  const handleClick = useCallback(
    async (notif: ApiNotification) => {
      if (!notif.isRead) {
        await api.post(`/notifications/${notif.id}/read`).catch(() => {})
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n))
      }
      if (notif.entityId && (notif.kind === 'document_received' || notif.kind === 'document_signed' || notif.kind === 'document_refused')) {
        navigate(`/documents/${notif.entityId}`)
      }
    },
    [navigate],
  )

  if (loading) return <div className="px-4 pt-6"><p className="text-gray-400 text-sm text-center">Загрузка...</p></div>

  if (notifications.length === 0) {
    return (
      <div className="px-4 pt-6">
        <EmptyState icon={BellOff} title="Нет уведомлений" description="Новые уведомления появятся здесь" />
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      {unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {unreadCount} непрочитанн{unreadCount === 1 ? 'ое' : 'ых'}
          </p>
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            Отметить все как прочитанные
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {notifications.map((notif) => {
          const t = kindToType(notif.kind)
          const Icon = ICON_MAP[t]
          const colors = ICON_COLORS[t]
          const borderColor = BORDER_COLORS[t]

          return (
            <div
              key={notif.id}
              onClick={() => handleClick(notif)}
              className={cn(
                'bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm p-4 cursor-pointer',
                'hover:shadow-md active:scale-[0.99] transition-all duration-150',
                'border-l-4',
                borderColor,
                !notif.isRead && 'bg-brand-50/40',
              )}
            >
              <div className="flex gap-3">
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                    colors.bg,
                  )}
                >
                  <Icon className={cn('h-5 w-5', colors.text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn('text-base font-medium text-gray-900 dark:text-gray-100', !notif.isRead && 'font-semibold')}>
                      {notif.title}
                    </p>
                    {!notif.isRead && (
                      <span className="w-2.5 h-2.5 rounded-full bg-brand-500 flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">{notif.body}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">{formatRelativeTime(notif.createdAt)}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
