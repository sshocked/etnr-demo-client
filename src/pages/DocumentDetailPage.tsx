import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { FileText, Download, MapPin, Truck, Package, Building2, Shield } from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { SkeletonCard } from '../components/ui/Skeleton'
import Skeleton from '../components/ui/Skeleton'
import { DocumentStatus, STATUS_LABELS, DOC_TYPE_LABELS, EDO_OPERATORS, type DocRecord } from '../lib/constants'
import { formatDateTime, formatMoney, cn } from '../lib/utils'
import { useToast } from '../components/ui/Toast'
import MockPdfPreview from '../components/documents/MockPdfPreview'
import { api } from '../lib/api'
import { type DocumentDetailApi, normalizeDetailDocument } from '../lib/documents'
import { refuseDocument, signDocument } from '../lib/documentSigning'

const badgeVariant: Record<DocumentStatus, 'info' | 'warning' | 'success' | 'error'> = {
  [DocumentStatus.NEED_SIGN]: 'info',
  [DocumentStatus.IN_PROGRESS]: 'warning',
  [DocumentStatus.SIGNED]: 'success',
  [DocumentStatus.SIGNED_WITH_RESERVATIONS]: 'warning',
  [DocumentStatus.REFUSED]: 'error',
  [DocumentStatus.ERROR]: 'error',
}

const historyDotColor: Record<string, string> = {
  created: 'bg-gray-400',
  sent: 'bg-blue-500',
  viewed: 'bg-yellow-500',
  signed: 'bg-green-500',
  rejected: 'bg-red-500',
  error: 'bg-red-500',
}

export default function DocumentDetailPage() {
  const { id } = useParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [signing, setSigning] = useState(false)
  const [refusing, setRefusing] = useState(false)
  const [refuseModalOpen, setRefuseModalOpen] = useState(false)
  const [refuseReason, setRefuseReason] = useState('')
  const [doc, setDoc] = useState<DocRecord | null>(null)
  const [tab, setTab] = useState<'preview' | 'details' | 'history' | 'files'>('preview')

  const loadDocument = useCallback(async (showLoader = true) => {
    if (!id) return

    if (showLoader) setLoading(true)

    try {
      const response = await api.get<DocumentDetailApi>(`/documents/${id}`)
      setDoc(normalizeDetailDocument(response))
      void api.post(`/documents/${id}/view`).catch(() => undefined)
    } catch {
      setDoc(null)
    } finally {
      if (showLoader) setLoading(false)
    }
  }, [id])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      if (!id) return
      setLoading(true)
      try {
        const response = await api.get<DocumentDetailApi>(`/documents/${id}`)
        if (cancelled) return
        setDoc(normalizeDetailDocument(response))
        void api.post(`/documents/${id}/view`).catch(() => undefined)
      } catch {
        if (cancelled) return
        setDoc(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [id])

  const tabs = useMemo(() => {
    if (!doc) return []
    return [
      { key: 'preview' as const, label: 'Просмотр' },
      { key: 'details' as const, label: 'Детали' },
      { key: 'history' as const, label: 'История' },
      { key: 'files' as const, label: `Файлы (${doc.files.length})` },
    ]
  }, [doc])

  const handleExport = async () => {
    if (!id) return
    setExporting(true)
    try {
      const response = await api.post<{ downloadUrl: string }>(`/documents/${id}/export`, { format: 'pdf' })
      window.open(response.downloadUrl, '_blank', 'noopener,noreferrer')
    } catch {
      toast('Не удалось подготовить экспорт', 'error')
    } finally {
      setExporting(false)
    }
  }

  const handleSign = async () => {
    if (!id) return

    setSigning(true)
    try {
      await signDocument(id)
      toast('Документ подписан', 'success')
      await loadDocument(false)
    } catch {
      toast('Не удалось подписать документ', 'error')
    } finally {
      setSigning(false)
    }
  }

  const handleRefuse = async () => {
    if (!id) return

    const reason = refuseReason.trim()
    if (!reason) {
      toast('Укажите причину отказа', 'error')
      return
    }

    setRefusing(true)
    try {
      await refuseDocument(id, reason)
      toast('Отказ отправлен', 'success')
      setRefuseModalOpen(false)
      setRefuseReason('')
      await loadDocument(false)
    } catch {
      toast('Не удалось отправить отказ', 'error')
    } finally {
      setRefusing(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  if (!doc) {
    return <div className="p-4 text-center text-gray-500 dark:text-gray-400 mt-20">Документ не найден</div>
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-56px)]">
      <div className="flex-1 p-4 space-y-4 pb-24">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{doc.number}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{DOC_TYPE_LABELS[doc.type]}</p>
          </div>
          <Badge variant={badgeVariant[doc.status]}>{STATUS_LABELS[doc.status]}</Badge>
        </div>

        {doc.edoOperator && EDO_OPERATORS[doc.edoOperator] && (
          <div className="flex items-center gap-2 px-3 py-2 bg-brand-50 dark:bg-brand-900/30 rounded-xl">
            <Shield className="h-4 w-4 text-brand-600" />
            <span className="text-sm text-brand-700 font-medium">{EDO_OPERATORS[doc.edoOperator].name}</span>
            <span className="text-xs text-brand-500">{EDO_OPERATORS[doc.edoOperator].description}</span>
          </div>
        )}

        {doc.reservations && (
          <div className="px-3 py-2 bg-yellow-50 rounded-xl border border-yellow-200">
            <p className="text-xs font-medium text-yellow-700 mb-1">Оговорка при подписании:</p>
            <p className="text-sm text-yellow-800">{doc.reservations}</p>
          </div>
        )}

        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {tabs.map(item => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={cn(
                'flex-1 py-2 text-sm font-medium rounded-lg transition-colors',
                tab === item.key ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === 'preview' && <MockPdfPreview doc={doc} />}

        {tab === 'details' && (
          <div className="space-y-3">
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Стороны</span>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-400 dark:text-gray-500">Отправитель: </span>
                  <span className="text-gray-800 dark:text-gray-200">{doc.sender.name}</span>
                  <span className="text-gray-400 dark:text-gray-500 text-xs ml-1">ИНН {doc.sender.inn}</span>
                </div>
                <div>
                  <span className="text-gray-400 dark:text-gray-500">Получатель: </span>
                  <span className="text-gray-800 dark:text-gray-200">{doc.receiver.name}</span>
                  <span className="text-gray-400 dark:text-gray-500 text-xs ml-1">ИНН {doc.receiver.inn}</span>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Truck className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Водитель</span>
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-gray-800 dark:text-gray-200">{doc.driver.name}</p>
                <p className="text-gray-500 dark:text-gray-400">{doc.driver.vehiclePlate} · {doc.driver.phone}</p>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Маршрут</span>
              </div>
              <p className="text-sm text-gray-800 dark:text-gray-200">{doc.route.from} → {doc.route.to}</p>
            </Card>

            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Груз</span>
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-gray-800 dark:text-gray-200">{doc.cargo.description}</p>
                <p className="text-gray-500 dark:text-gray-400">
                  {doc.cargo.weight.toLocaleString('ru')} кг · {doc.cargo.volume} м³ · {doc.cargo.packages} мест
                </p>
                <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-2">{formatMoney(doc.amount)}</p>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Даты</span>
              </div>
              <div className="space-y-1 text-sm text-gray-800 dark:text-gray-200">
                <p>Создан: {formatDateTime(doc.createdAt)}</p>
                <p>Обновлён: {formatDateTime(doc.updatedAt)}</p>
                {doc.signedAt && <p>Подписан: {formatDateTime(doc.signedAt)}</p>}
              </div>
            </Card>

            {doc.signLocation && (
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Место подписания</span>
                </div>
                <p className="text-sm text-gray-800 dark:text-gray-200">{doc.signLocation.address || 'Адрес не определён'}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{doc.signLocation.lat.toFixed(6)}, {doc.signLocation.lng.toFixed(6)}</p>
              </Card>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-0">
            {doc.history.length === 0 ? (
              <Card>
                <p className="text-sm text-gray-500 dark:text-gray-400">История изменений отсутствует</p>
              </Card>
            ) : (
              doc.history.map((item, index) => (
                <div key={item.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={cn('w-3 h-3 rounded-full shrink-0 mt-1.5', historyDotColor[item.action] || 'bg-gray-400')} />
                    {index < doc.history.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700 my-1" />}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm text-gray-800 dark:text-gray-200">{item.description}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{item.actor} · {formatDateTime(item.timestamp)}</p>
                    {item.location && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {item.location.address || `${item.location.lat.toFixed(4)}, ${item.location.lng.toFixed(4)}`}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'files' && (
          <div className="space-y-2">
            {doc.files.length === 0 ? (
              <Card>
                <p className="text-sm text-gray-500 dark:text-gray-400">Файлы отсутствуют</p>
              </Card>
            ) : (
              doc.files.map(file => (
                <Card key={file.id} className="flex items-center gap-3 !p-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{file.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{(file.size / 1024).toFixed(0)} КБ</p>
                  </div>
                  <button
                    onClick={() => {
                      if (!file.downloadUrl) {
                        toast('Ссылка на скачивание недоступна', 'info')
                        return
                      }
                      window.open(file.downloadUrl, '_blank', 'noopener,noreferrer')
                    }}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Download className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  </button>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-100 dark:border-gray-700/50 pb-safe">
        <div className="flex gap-2">
          <Button fullWidth variant="secondary" loading={exporting} onClick={handleExport}>
            Экспортировать PDF
          </Button>
          {doc.requiresSign && (
            <>
              <Button fullWidth variant="secondary" disabled={signing || refusing} onClick={() => setRefuseModalOpen(true)}>
                Отказать
              </Button>
              <Button fullWidth loading={signing} disabled={refusing} onClick={() => void handleSign()}>
                Подписать
              </Button>
            </>
          )}
        </div>
      </div>

      {refuseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={() => !refusing && setRefuseModalOpen(false)}>
          <Card className="w-full max-w-md !p-4">
            <div className="space-y-4" onClick={event => event.stopPropagation()}>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Причина отказа</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{doc.number}</p>
              </div>

              <textarea
                value={refuseReason}
                onChange={event => setRefuseReason(event.target.value)}
                rows={4}
                placeholder="Укажите причину отказа"
                className="w-full rounded-[14px] border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 resize-none"
              />

              <div className="flex gap-2">
                <Button fullWidth variant="secondary" disabled={refusing} onClick={() => setRefuseModalOpen(false)}>
                  Отмена
                </Button>
                <Button fullWidth variant="danger" loading={refusing} onClick={() => void handleRefuse()}>
                  Отправить отказ
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
