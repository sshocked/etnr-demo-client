import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react'
import Card from '../components/ui/Card'
import Skeleton, { SkeletonCard } from '../components/ui/Skeleton'
import { api } from '../lib/api'
import { DOC_TYPE_LABELS } from '../lib/constants'
import type { DocumentType } from '../lib/constants'

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

interface DocItem {
  id: string
  number: string
  type: string
  status: string
  senderName: string
  receiverName: string
  updatedAt: string
}

interface CountsResponse {
  needSign: number
  inProgress: number
  signed: number
  signedWithReservations: number
  refused: number
  total: number
}

interface DocumentsResponse {
  documents: DocItem[]
  nextCursor: string
}

async function fetchAllDocuments(): Promise<DocItem[]> {
  const result: DocItem[] = []
  let cursor = ''
  for (let i = 0; i < 10; i++) {
    const params: Record<string, string> = { limit: '100' }
    if (cursor) params.cursor = cursor
    const data = await api.get<DocumentsResponse>('/documents', params)
    result.push(...(data.documents ?? []))
    cursor = data.nextCursor ?? ''
    if (!cursor) break
  }
  return result
}

function getMonthDocs(docs: DocItem[], year: number, month: number): DocItem[] {
  return docs.filter(d => {
    if (!d.updatedAt) return false
    const date = new Date(d.updatedAt)
    return date.getFullYear() === year && date.getMonth() === month
  })
}

export default function StatsPage() {
  const [loading, setLoading] = useState(true)
  const [docs, setDocs] = useState<DocItem[]>([])
  const [counts, setCounts] = useState<CountsResponse | null>(null)
  const [monthOffset, setMonthOffset] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [allDocs, countsData] = await Promise.all([
          fetchAllDocuments(),
          api.get<CountsResponse>('/documents/counts'),
        ])
        if (cancelled) return
        setDocs(allDocs)
        setCounts(countsData)
      } catch {
        if (!cancelled) {
          setDocs([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const now = new Date()
  const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const viewYear = viewDate.getFullYear()
  const viewMonth = viewDate.getMonth()

  const monthDocs = useMemo(() => getMonthDocs(docs, viewYear, viewMonth), [docs, viewYear, viewMonth])

  const signed = monthDocs.filter(d => d.status === 'signed' || d.status === 'signed_with_reservations')
  const refused = monthDocs.filter(d => d.status === 'refused')
  const inProgress = monthDocs.filter(d => d.status === 'in_progress' || d.status === 'need_sign')

  const byType = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const d of monthDocs) {
      counts[d.type] = (counts[d.type] || 0) + 1
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [monthDocs])

  const maxTypeCount = Math.max(...byType.map(([, c]) => c), 1)

  const bySender = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const d of monthDocs) {
      if (d.senderName) counts[d.senderName] = (counts[d.senderName] || 0) + 1
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [monthDocs])

  const maxSenderCount = Math.max(...bySender.map(([, c]) => c), 1)

  const trend = useMemo(() => {
    const result: { label: string; signed: number; isCurrent: boolean }[] = []
    for (let i = -2; i <= 0; i++) {
      const d = new Date(viewYear, viewMonth + i, 1)
      const mDocs = getMonthDocs(docs, d.getFullYear(), d.getMonth())
      const mSigned = mDocs.filter(doc => doc.status === 'signed' || doc.status === 'signed_with_reservations')
      result.push({
        label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
        signed: mSigned.length,
        isCurrent: i === 0,
      })
    }
    return result
  }, [docs, viewYear, viewMonth])

  const typeColors: Record<string, string> = {
    etrn: 'bg-brand-500',
    trn: 'bg-brand-500',
    ttn: 'bg-blue-500',
    act: 'bg-green-500',
    invoice: 'bg-orange-500',
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48 mx-auto" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-5">
      {/* Month selector */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setMonthOffset(o => o - 1)}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 min-w-[160px] text-center">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </h2>
        <button
          onClick={() => setMonthOffset(o => o + 1)}
          disabled={monthOffset >= 0}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Summary cards — per-month from docs, total counts from API */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="text-center !py-4">
          <p className="text-2xl font-bold text-green-600">{monthOffset === 0 && counts ? counts.signed + counts.signedWithReservations : signed.length}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Подписано</p>
        </Card>
        <Card className="text-center !py-4">
          <p className="text-2xl font-bold text-red-600">{monthOffset === 0 && counts ? counts.refused : refused.length}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Отказано</p>
        </Card>
        <Card className="text-center !py-4">
          <p className="text-2xl font-bold text-blue-600">{monthOffset === 0 && counts ? counts.inProgress + counts.needSign : inProgress.length}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">В работе</p>
        </Card>
        <Card className="text-center !py-4">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{monthOffset === 0 && counts ? counts.total : monthDocs.length}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Всего</p>
        </Card>
      </div>

      {/* By document type */}
      <Card>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">По типам документов</h3>
        {byType.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Нет данных за этот месяц</p>
        ) : (
          <div className="space-y-3">
            {byType.map(([type, count]) => (
              <div key={type}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{DOC_TYPE_LABELS[type as DocumentType] ?? type.toUpperCase()}</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{count}</span>
                </div>
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${typeColors[type] ?? 'bg-gray-400'}`}
                    style={{ width: `${(count / maxTypeCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* By sender */}
      <Card>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">По отправителям</h3>
        {bySender.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Нет данных за этот месяц</p>
        ) : (
          <div className="space-y-3">
            {bySender.map(([name, count]) => (
              <div key={name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate mr-2">{name}</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 shrink-0">{count}</span>
                </div>
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-500 transition-all duration-500"
                    style={{ width: `${(count / maxSenderCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Monthly trend */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-5 w-5 text-brand-600" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Динамика по месяцам</h3>
        </div>
        <div className="space-y-2">
          {trend.map(t => (
            <div
              key={t.label}
              className={`flex items-center justify-between p-3 rounded-xl ${t.isCurrent ? 'bg-brand-50 dark:bg-brand-900/30 border border-brand-200' : 'bg-gray-50 dark:bg-gray-800/50'}`}
            >
              <span className={`text-sm font-medium ${t.isCurrent ? 'text-brand-700' : 'text-gray-700 dark:text-gray-300'}`}>
                {t.label}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">{t.signed} подп.</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
