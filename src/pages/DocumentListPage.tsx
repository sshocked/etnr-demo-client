import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, FileText, ChevronRight, SlidersHorizontal, X, CheckSquare, Square } from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { SkeletonCard } from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import { useToast } from '../components/ui/Toast'
import { DocumentStatus, STATUS_LABELS, STATUS_COLORS, DOC_TYPE_LABELS, type DocRecord } from '../lib/constants'
import { formatDate, cn } from '../lib/utils'
import { api } from '../lib/api'
import { type DocumentsListResponse, normalizeListDocument } from '../lib/documents'
import { refuseDocument, signDocument } from '../lib/documentSigning'
import { useSse } from '../lib/useSse'

const statusFilters: { label: string; value: string }[] = [
  { label: 'Все', value: 'ALL' },
  { label: 'На подпись', value: DocumentStatus.NEED_SIGN },
  { label: 'В работе', value: DocumentStatus.IN_PROGRESS },
  { label: 'Отказ', value: DocumentStatus.REFUSED },
  { label: 'Ошибка', value: DocumentStatus.ERROR },
]

const SELECTABLE_STATUSES = new Set([DocumentStatus.NEED_SIGN, DocumentStatus.ERROR])

const badgeVariant: Record<DocumentStatus, 'info' | 'warning' | 'success' | 'error'> = {
  [DocumentStatus.NEED_SIGN]: 'info',
  [DocumentStatus.IN_PROGRESS]: 'warning',
  [DocumentStatus.SIGNED]: 'success',
  [DocumentStatus.SIGNED_WITH_RESERVATIONS]: 'warning',
  [DocumentStatus.REFUSED]: 'error',
  [DocumentStatus.ERROR]: 'error',
}

function toDateInputValue(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function DocumentListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const [docs, setDocs] = useState<DocRecord[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)

  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'ALL')
  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') || '')
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') || '')
  const [senderFilter, setSenderFilter] = useState(searchParams.get('sender') || '')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [signingId, setSigningId] = useState<string | null>(null)
  const [refusingId, setRefusingId] = useState<string | null>(null)
  const [refuseDoc, setRefuseDoc] = useState<DocRecord | null>(null)
  const [refuseReason, setRefuseReason] = useState('')

  const deferredSearch = useDeferredValue(search.trim())
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const requestIdRef = useRef(0)

  const syncParams = useCallback(
    (overrides: Record<string, string> = {}) => {
      const state: Record<string, string> = {
        status: statusFilter,
        q: search,
        dateFrom,
        dateTo,
        sender: senderFilter,
        ...overrides,
      }
      const params: Record<string, string> = {}
      if (state.status && state.status !== 'ALL') params.status = state.status
      if (state.q) params.q = state.q
      if (state.dateFrom) params.dateFrom = state.dateFrom
      if (state.dateTo) params.dateTo = state.dateTo
      if (state.sender) params.sender = state.sender
      setSearchParams(params, { replace: true })
    },
    [statusFilter, search, dateFrom, dateTo, senderFilter, setSearchParams],
  )

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (dateFrom) count++
    if (dateTo) count++
    if (senderFilter) count++
    return count
  }, [dateFrom, dateTo, senderFilter])

  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string }[] = []
    if (dateFrom) chips.push({ key: 'dateFrom', label: `С ${dateFrom}` })
    if (dateTo) chips.push({ key: 'dateTo', label: `По ${dateTo}` })
    if (senderFilter) chips.push({ key: 'sender', label: senderFilter })
    return chips
  }, [dateFrom, dateTo, senderFilter])

  const removeFilter = (key: string) => {
    const updates: Record<string, string> = {}
    if (key === 'dateFrom') { setDateFrom(''); updates.dateFrom = '' }
    if (key === 'dateTo') { setDateTo(''); updates.dateTo = '' }
    if (key === 'sender') { setSenderFilter(''); updates.sender = '' }
    syncParams(updates)
  }

  const clearAllFilters = () => {
    setDateFrom('')
    setDateTo('')
    setSenderFilter('')
    syncParams({ dateFrom: '', dateTo: '', sender: '' })
  }

  const uniqueSenders = useMemo(() => {
    const names = new Set<string>()
    docs.forEach(doc => names.add(doc.sender.name))
    return Array.from(names).sort()
  }, [docs])

  const apiStatus = statusFilter === 'ALL' ? undefined : statusFilter

  const fetchPage = useCallback(async (cursor?: string | null, reset = false) => {
    const currentRequestId = requestIdRef.current

    if (reset) {
      setLoading(true)
      setError(false)
    } else {
      setLoadingMore(true)
    }

    try {
      const response = await api.get<DocumentsListResponse>('/documents', {
        status: apiStatus,
        cursor: cursor ?? undefined,
        search: deferredSearch || undefined,
        limit: 20,
      })

      if (requestIdRef.current !== currentRequestId) return

      const items = (response.documents ?? []).map(normalizeListDocument)
      setDocs(prev => {
        if (reset) return items

        const seen = new Set(prev.map(item => item.id))
        return [...prev, ...items.filter(item => !seen.has(item.id))]
      })
      setNextCursor(response.nextCursor ?? null)
    } catch {
      if (requestIdRef.current !== currentRequestId) return
      setError(true)
    } finally {
      if (requestIdRef.current !== currentRequestId) return
      setLoading(false)
      setLoadingMore(false)
    }
  }, [apiStatus, deferredSearch])

  const reload = useCallback(() => {
    requestIdRef.current += 1
    setDocs([])
    setNextCursor(null)
    setSelectedIds(new Set())
    fetchPage(undefined, true)
  }, [fetchPage])

  useEffect(() => {
    reload()
  }, [reload])

  // SSE: reload when server notifies about new/updated documents
  useSse('/documents/events', useCallback((event: MessageEvent) => {
    if (event.type === 'document.received' || event.type === 'document.updated') {
      reload()
    }
  }, [reload]))

  useEffect(() => {
    syncParams()
  }, [statusFilter, search, dateFrom, dateTo, senderFilter, syncParams])

  useEffect(() => {
    if (!nextCursor || loading || loadingMore || error) return
    const node = sentinelRef.current
    if (!node) return

    const observer = new IntersectionObserver(entries => {
      if (!entries[0]?.isIntersecting) return
      fetchPage(nextCursor, false)
    }, { rootMargin: '240px 0px' })

    observer.observe(node)
    return () => observer.disconnect()
  }, [nextCursor, loading, loadingMore, error, fetchPage])

  const filtered = useMemo(() => {
    let result = docs

    if (dateFrom) {
      const from = new Date(dateFrom)
      from.setHours(0, 0, 0, 0)
      result = result.filter(doc => new Date(doc.updatedAt) >= from)
    }

    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)
      result = result.filter(doc => new Date(doc.updatedAt) <= to)
    }

    if (senderFilter) {
      result = result.filter(doc => doc.sender.name === senderFilter)
    }

    return result
  }, [docs, dateFrom, dateTo, senderFilter])

  const selectableDocs = useMemo(
    () => filtered.filter(doc => SELECTABLE_STATUSES.has(doc.status)),
    [filtered],
  )

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === selectableDocs.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(selectableDocs.map(doc => doc.id)))
    }
  }

  const exitSelectionMode = () => {
    setSelectionMode(false)
    setSelectedIds(new Set())
  }

  const handleSign = async (documentId: string) => {
    setSigningId(documentId)
    try {
      await signDocument(documentId)
      toast('Документ подписан', 'success')
      reload()
    } catch {
      toast('Не удалось подписать документ', 'error')
    } finally {
      setSigningId(null)
    }
  }

  const openRefuseModal = (doc: DocRecord) => {
    setRefuseDoc(doc)
    setRefuseReason('')
  }

  const closeRefuseModal = () => {
    if (refusingId) return
    setRefuseDoc(null)
    setRefuseReason('')
  }

  const submitRefuse = async () => {
    if (!refuseDoc) return

    const reason = refuseReason.trim()
    if (!reason) {
      toast('Укажите причину отказа', 'error')
      return
    }

    setRefusingId(refuseDoc.id)
    try {
      await refuseDocument(refuseDoc.id, reason)
      toast('Отказ отправлен', 'success')
      setRefuseDoc(null)
      setRefuseReason('')
      reload()
    } catch {
      toast('Не удалось отправить отказ', 'error')
    } finally {
      setRefusingId(null)
    }
  }

  const handleBulkSign = () => {
    if (selectedIds.size === 0) return
    navigate(`/documents/bulk-sign?ids=${Array.from(selectedIds).join(',')}`)
  }

  const applyDatePreset = (preset: 'today' | 'week' | 'month') => {
    const now = new Date()
    const todayStr = toDateInputValue(now)
    const fromDate = new Date(now)

    if (preset === 'week') fromDate.setDate(now.getDate() - 7)
    if (preset === 'month') fromDate.setMonth(now.getMonth() - 1)

    setDateFrom(toDateInputValue(fromDate))
    setDateTo(todayStr)
  }

  const renderDocCard = (doc: DocRecord) => {
    const isSelectable = SELECTABLE_STATUSES.has(doc.status)
    const isSelected = selectedIds.has(doc.id)

    return (
      <Card
        key={doc.id}
        onClick={() => {
          if (selectionMode) {
            if (isSelectable) toggleSelection(doc.id)
            return
          }
          navigate(`/documents/${doc.id}`)
        }}
        className={cn(
          'flex items-center gap-3 !p-4',
          selectionMode && isSelected && 'ring-2 ring-brand-500 bg-brand-50/30',
          selectionMode && !isSelectable && 'opacity-50',
        )}
      >
        {selectionMode && (
          <div className="shrink-0">
            {isSelectable ? (
              isSelected ? <CheckSquare className="h-6 w-6 text-brand-600" /> : <Square className="h-6 w-6 text-gray-300" />
            ) : (
              <div className="h-6 w-6" />
            )}
          </div>
        )}
        <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0', STATUS_COLORS[doc.status].bg)}>
          <FileText className={cn('h-6 w-6', STATUS_COLORS[doc.status].text)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">{doc.number}</p>
            <Badge variant={badgeVariant[doc.status]} className="shrink-0">{STATUS_LABELS[doc.status]}</Badge>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">{doc.sender.name} → {doc.receiver.name}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{DOC_TYPE_LABELS[doc.type]} · {formatDate(doc.updatedAt)}</p>
          {!selectionMode && doc.requiresSign && (
            <div className="flex gap-2 mt-3" onClick={event => event.stopPropagation()}>
              <Button
                size="sm"
                loading={signingId === doc.id}
                onClick={() => void handleSign(doc.id)}
              >
                Подписать
              </Button>
              <Button
                size="sm"
                variant="secondary"
                loading={refusingId === doc.id}
                disabled={signingId === doc.id}
                onClick={() => openRefuseModal(doc)}
              >
                Отказать
              </Button>
            </div>
          )}
        </div>
        {!selectionMode && <ChevronRight className="h-5 w-5 text-gray-300 shrink-0" />}
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-12 skeleton rounded-xl" />
        <div className="flex gap-2">{[1, 2, 3, 4].map(i => <div key={i} className="h-8 w-20 skeleton rounded-full" />)}</div>
        {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
      </div>
    )
  }

  if (error) {
    return <ErrorState title="Не удалось загрузить" description="Проверьте подключение и попробуйте снова" onRetry={reload} />
  }

  return (
    <div className={cn('p-4 space-y-3', selectionMode && selectedIds.size > 0 && 'pb-32')}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="search"
            inputMode="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Номер или отправитель..."
            className="w-full pl-11 pr-4 py-3.5 rounded-[14px] border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/80 text-base text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all duration-200"
          />
        </div>
        {!selectionMode ? (
          <>
            <button
              onClick={() => setFiltersOpen(open => !open)}
              className={cn(
                'flex items-center gap-1.5 px-4 rounded-xl border font-medium text-sm whitespace-nowrap min-h-[44px] transition-colors shrink-0',
                filtersOpen || activeFilterCount > 0
                  ? 'bg-brand-50 dark:bg-brand-900/30 border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-400'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 active:bg-gray-50 dark:active:bg-gray-700',
              )}
            >
              <SlidersHorizontal className="h-5 w-5" />
              <span>Фильтры{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
            </button>
            <button
              onClick={() => setSelectionMode(true)}
              className="shrink-0 px-4 rounded-[14px] bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 text-sm font-semibold whitespace-nowrap active:bg-brand-100 dark:active:bg-brand-900/50 transition-colors min-h-[44px]"
            >
              Выбрать
            </button>
          </>
        ) : (
          <button
            onClick={exitSelectionMode}
            className="shrink-0 w-12 h-12 rounded-[14px] bg-gray-100 dark:bg-gray-800 flex items-center justify-center active:bg-gray-200 dark:active:bg-gray-700 transition-colors"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        )}
      </div>

      {selectionMode && selectableDocs.length > 0 && (
        <button
          onClick={toggleSelectAll}
          className="flex items-center gap-2 text-sm font-medium text-brand-600 active:text-brand-800 py-1"
        >
          {selectedIds.size === selectableDocs.length ? (
            <>
              <CheckSquare className="h-5 w-5" />
              Снять выделение
            </>
          ) : (
            <>
              <Square className="h-5 w-5" />
              Выбрать все ({selectableDocs.length})
            </>
          )}
        </button>
      )}

      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          filtersOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Период</p>
            <div className="flex gap-2 mb-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">С</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="w-full px-3 py-3 rounded-[14px] border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-base text-gray-900 dark:text-gray-100 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">По</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="w-full px-3 py-3 rounded-[14px] border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-base text-gray-900 dark:text-gray-100 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {([['today', 'Сегодня'], ['week', 'Неделя'], ['month', 'Месяц']] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => applyDatePreset(key)}
                  className="px-4 py-2 rounded-full text-sm font-medium bg-white border border-gray-200 text-gray-600 active:bg-gray-100 min-h-[44px] transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {uniqueSenders.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Отправитель</p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <button
                  onClick={() => setSenderFilter('')}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap shrink-0 min-h-[44px] transition-colors',
                    senderFilter === ''
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-white border border-gray-200 text-gray-600 active:bg-gray-100',
                  )}
                >
                  Все отправители
                </button>
                {uniqueSenders.map(name => (
                  <button
                    key={name}
                    onClick={() => setSenderFilter(name)}
                    className={cn(
                      'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap shrink-0 min-h-[44px] transition-colors',
                      senderFilter === name
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-white border border-gray-200 text-gray-600 active:bg-gray-100',
                    )}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {activeFilterChips.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {activeFilterChips.map(chip => (
            <button
              key={chip.key}
              onClick={() => removeFilter(chip.key)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-brand-50 text-brand-700 border border-brand-200 min-h-[36px] transition-colors active:bg-brand-100"
            >
              {chip.label}
              <X className="h-3.5 w-3.5" />
            </button>
          ))}
          <button
            onClick={clearAllFilters}
            className="text-sm text-gray-500 underline underline-offset-2 active:text-gray-700 min-h-[36px] px-1"
          >
            Сбросить все
          </button>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {statusFilters.map(filter => (
          <button
            key={filter.value}
            onClick={() => setStatusFilter(filter.value)}
            className={cn(
              'px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0 min-h-[44px]',
              statusFilter === filter.value
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 active:bg-gray-200 dark:active:bg-gray-700',
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="Нет документов" description="Документы появятся здесь, когда будут отправлены" />
      ) : (
        <div className="space-y-2">
          {filtered.map(renderDocCard)}
        </div>
      )}

      {nextCursor && <div ref={sentinelRef} className="h-4" />}

      {loadingMore && (
        <div className="space-y-2">
          {[1, 2].map(item => <SkeletonCard key={item} />)}
        </div>
      )}

      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-100 dark:border-gray-700/50 pb-safe">
          <Button fullWidth size="lg" onClick={handleBulkSign}>
            Подписать выбранные ({selectedIds.size})
          </Button>
        </div>
      )}

      {refuseDoc && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={closeRefuseModal}>
          <Card className="w-full max-w-md !p-4">
            <div
              className="space-y-4"
              onClick={event => event.stopPropagation()}
            >
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Причина отказа</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{refuseDoc.number}</p>
              </div>

              <textarea
                value={refuseReason}
                onChange={event => setRefuseReason(event.target.value)}
                rows={4}
                placeholder="Укажите причину отказа"
                className="w-full rounded-[14px] border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 resize-none"
              />

              <div className="flex gap-2">
                <Button fullWidth variant="secondary" disabled={Boolean(refusingId)} onClick={closeRefuseModal}>
                  Отмена
                </Button>
                <Button fullWidth variant="danger" loading={refusingId === refuseDoc.id} onClick={() => void submitRefuse()}>
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
