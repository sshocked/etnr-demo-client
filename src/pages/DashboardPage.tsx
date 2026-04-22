import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileSignature, Clock, Archive, FileText, CheckCircle, AlertTriangle, Eye, ChevronRight, Inbox, Shield, KeyRound, BarChart3, QrCode } from 'lucide-react'
import Card from '../components/ui/Card'
import { SkeletonCard } from '../components/ui/Skeleton'
import Skeleton from '../components/ui/Skeleton'
import { getItem } from '../lib/storage'
import { STORAGE_KEYS } from '../lib/constants'
import type { ActivityLogEntry, UserProfile, Certificate, Mcd } from '../lib/constants'
import { formatDateTime } from '../lib/utils'
import { api } from '../lib/api'
import { type DocumentCountsApi, normalizeCounts } from '../lib/documents'

const activityIcons = {
  sign: CheckCircle,
  view: Eye,
  receive: FileText,
  error: AlertTriangle,
}

const activityColors = {
  sign: 'text-green-600 bg-green-50',
  view: 'text-blue-600 bg-blue-50',
  receive: 'text-brand-600 bg-brand-50',
  error: 'text-red-600 bg-red-50',
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState(() => normalizeCounts(undefined))
  const [activity, setActivity] = useState<ActivityLogEntry[]>([])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const [countsResponse] = await Promise.all([
          api.get<DocumentCountsApi>('/documents/counts'),
        ])

        if (cancelled) return
        setCounts(normalizeCounts(countsResponse))
        setActivity(getItem<ActivityLogEntry[]>(STORAGE_KEYS.ACTIVITY) ?? [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const user = getItem<UserProfile>(STORAGE_KEYS.USER)
  const cert = getItem<Certificate>(STORAGE_KEYS.CERTIFICATE)
  const mcds = getItem<Mcd[]>(STORAGE_KEYS.MCD) ?? []

  const warnings = useMemo(() => {
    const now = new Date()
    const result: { icon: typeof AlertTriangle; color: string; bg: string; text: string; action: string }[] = []

    if (!cert || cert.status !== 'active') {
      result.push({ icon: KeyRound, color: 'text-red-600', bg: 'bg-red-50', text: 'Сертификат УКЭП не выпущен. Выпустите для подписания.', action: '/cert-issue' })
    } else if (cert.validTo) {
      const daysLeft = Math.ceil((new Date(cert.validTo).getTime() - now.getTime()) / 86400000)
      if (daysLeft <= 30 && daysLeft > 0) {
        result.push({ icon: KeyRound, color: 'text-orange-600', bg: 'bg-orange-50', text: `Сертификат УКЭП истекает через ${daysLeft} дн.`, action: '/cert-issue' })
      } else if (daysLeft <= 0) {
        result.push({ icon: KeyRound, color: 'text-red-600', bg: 'bg-red-50', text: 'Сертификат УКЭП истёк. Обновите сертификат.', action: '/cert-issue' })
      }
    }

    const expiringMcds = mcds.filter(mcd => {
      if (!mcd.validUntil || mcd.status !== 'linked') return false
      const daysLeft = Math.ceil((new Date(mcd.validUntil).getTime() - now.getTime()) / 86400000)
      return daysLeft <= 30
    })

    if (expiringMcds.length > 0) {
      const mcd = expiringMcds[0]
      const daysLeft = Math.ceil((new Date(mcd.validUntil!).getTime() - now.getTime()) / 86400000)
      if (daysLeft <= 0) {
        result.push({ icon: Shield, color: 'text-red-600', bg: 'bg-red-50', text: `МЧД от ${mcd.principal.companyName} истекла`, action: '/profile' })
      } else {
        result.push({ icon: Shield, color: 'text-orange-600', bg: 'bg-orange-50', text: `МЧД от ${mcd.principal.companyName} истекает через ${daysLeft} дн.`, action: '/profile' })
      }
    }

    if (mcds.length === 0 || mcds.every(mcd => mcd.status === 'none')) {
      result.push({ icon: Shield, color: 'text-red-600', bg: 'bg-red-50', text: 'МЧД не привязана. Загрузите для подписания.', action: '/mcd' })
    }

    return result
  }, [cert, mcds])

  const needSign = counts.NEED_SIGN
  const inProgress = counts.IN_PROGRESS
  const signed = counts.SIGNED + counts.SIGNED_WITH_RESERVATIONS + counts.REFUSED

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <SkeletonCard />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map(i => <SkeletonCard key={i} />)}
        </div>
        <Skeleton className="h-6 w-40" />
        {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
      </div>
    )
  }

  return (
    <div className="p-4 space-y-5">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
        {(() => {
          const name = user?.name?.trim() ?? ''
          if (!name) return 'Привет!'
          const parts = name.split(/\s+/).filter(Boolean)
          const firstName = parts[1] || parts[0] || ''
          const display = firstName.length > 30 ? firstName.slice(0, 28) + '…' : firstName
          return `${display}, привет!`
        })()}
      </h2>

      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((warning, index) => (
            <button
              key={index}
              onClick={() => navigate(warning.action)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl ${warning.bg} dark:bg-opacity-20 active:scale-[0.98] transition-all duration-200`}
            >
              <warning.icon className={`h-5 w-5 ${warning.color} shrink-0`} />
              <p className={`text-sm font-medium ${warning.color} text-left flex-1`}>{warning.text}</p>
              <ChevronRight className={`h-4 w-4 ${warning.color} shrink-0 opacity-50`} />
            </button>
          ))}
        </div>
      )}

      {needSign > 0 ? (
        <div className="w-full bg-gradient-to-r from-brand-600 to-brand-700 rounded-2xl p-5 text-white shadow-lg">
          <button
            onClick={() => navigate('/documents?status=NEED_SIGN')}
            className="w-full text-left active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                  <FileSignature className="h-7 w-7 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{needSign}</p>
                  <p className="text-base text-white/90 mt-0.5">
                    {needSign === 1 ? 'документ на подпись' : needSign < 5 ? 'документа на подпись' : 'документов на подпись'}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-6 w-6 text-white/60" />
            </div>
          </button>
          <button
            onClick={() => navigate('/documents?status=NEED_SIGN')}
            className="w-full mt-3 py-2.5 rounded-xl bg-white/20 text-white text-sm font-medium active:bg-white/30 transition-colors"
          >
            Открыть документы
          </button>
        </div>
      ) : (
        <div className="w-full bg-green-50 dark:bg-green-900/20 rounded-2xl p-5 text-center">
          <CheckCircle className="h-10 w-10 text-green-500 dark:text-green-400 mx-auto mb-2" />
          <p className="text-base font-semibold text-green-800 dark:text-green-300">Все документы подписаны</p>
          <p className="text-sm text-green-600 dark:text-green-400/70 mt-1">Новые документы появятся здесь</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card onClick={() => navigate('/documents?status=IN_PROGRESS')} className="text-center !py-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-2">
            <Clock className="h-6 w-6 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{inProgress}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">В работе</p>
        </Card>
        <Card onClick={() => navigate('/archive')} className="text-center !py-4">
          <div className="w-12 h-12 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-2">
            <Archive className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{signed}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">В архиве</p>
        </Card>
      </div>

      <Card onClick={() => navigate('/stats')} className="flex items-center gap-3 !p-4">
        <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center shrink-0">
          <BarChart3 className="h-6 w-6 text-brand-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-gray-900 dark:text-gray-100">Статистика за месяц</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Подписания, суммы, маршруты</p>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-300 shrink-0" />
      </Card>

      <Card onClick={() => navigate('/scan')} className="flex items-center gap-3 !p-4">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
          <QrCode className="h-6 w-6 text-gray-700 dark:text-gray-200" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-gray-900 dark:text-gray-100">Сканер QR</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Открыть документ по коду</p>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-300 shrink-0" />
      </Card>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Последние действия</h2>
          {activity.length > 5 && (
            <button onClick={() => navigate('/documents')} className="text-sm text-brand-600 font-medium">
              Все
            </button>
          )}
        </div>
        {activity.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Пока нет действий</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activity.slice(0, 5).map(item => {
              const Icon = activityIcons[item.type]
              const color = activityColors[item.type]
              return (
                <Card key={item.id} onClick={() => navigate(`/documents/${item.documentId}`)} className="flex items-center gap-3 !p-3.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.documentNumber}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.message}</p>
                  </div>
                  <p className="text-[11px] text-gray-400 shrink-0">{formatDateTime(item.timestamp)}</p>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
