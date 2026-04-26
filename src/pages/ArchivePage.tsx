import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, FileText, ChevronRight, Archive, Download, X } from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { SkeletonCard } from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import { DocumentStatus, DOC_TYPE_LABELS, STATUS_LABELS, type DocRecord } from '../lib/constants'
import { formatDate } from '../lib/utils'
import { useToast } from '../components/ui/Toast'
import { api } from '../lib/api'
import { type DocumentsListResponse, normalizeListDocument } from '../lib/documents'

export default function ArchivePage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [docs, setDocs] = useState<DocRecord[]>([])
  const [search, setSearch] = useState('')
  const [showExport, setShowExport] = useState(false)
  const [exportFrom, setExportFrom] = useState('')
  const [exportTo, setExportTo] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const response = await api.get<DocumentsListResponse>('/documents', {
          status: 'SIGNED,REFUSED',
          limit: 100,
        })
        if (cancelled) return
        setDocs((response.documents ?? []).map(normalizeListDocument))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    const now = new Date()
    setExportFrom(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`)
    setExportTo(now.toISOString().split('T')[0])

    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return docs
    const query = search.toLowerCase()
    return docs.filter(doc => doc.number.toLowerCase().includes(query) || doc.sender.name.toLowerCase().includes(query))
  }, [docs, search])

  const handleExport = () => {
    setExporting(true)

    window.setTimeout(() => {
      let exportDocs = docs

      if (exportFrom) {
        const from = new Date(exportFrom)
        from.setHours(0, 0, 0, 0)
        exportDocs = exportDocs.filter(doc => new Date(doc.signedAt || doc.updatedAt) >= from)
      }

      if (exportTo) {
        const to = new Date(exportTo)
        to.setHours(23, 59, 59, 999)
        exportDocs = exportDocs.filter(doc => new Date(doc.signedAt || doc.updatedAt) <= to)
      }

      const headers = ['№', 'Номер документа', 'Дата', 'Отправитель', 'Получатель', 'Статус']
      const rows = exportDocs.map((doc, index) => [
        String(index + 1),
        doc.number,
        formatDate(doc.signedAt || doc.updatedAt),
        doc.sender.name,
        doc.receiver.name,
        STATUS_LABELS[doc.status],
      ].map(value => `"${value}"`).join(';'))

      const bom = '\uFEFF'
      const csv = bom + headers.join(';') + '\n' + rows.join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `etrn_archive_${exportFrom}_${exportTo}.csv`
      anchor.click()
      URL.revokeObjectURL(url)

      setExporting(false)
      setShowExport(false)
      toast('Реестр выгружен', 'success')
    }, 300)
  }

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-12 skeleton rounded-xl" />
        {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="search"
            inputMode="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Номер или отправитель..."
            className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/80 dark:text-gray-100 text-base focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setShowExport(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/80 text-sm font-medium text-gray-700 dark:text-gray-300 active:bg-gray-50 shrink-0"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Выгрузить</span>
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Archive} title="Архив пуст" description="Подписанные документы будут отображаться здесь" />
      ) : (
        <div className="space-y-2">
          {filtered.map(doc => (
            <Card key={doc.id} onClick={() => navigate(`/archive/${doc.id}`)} className="flex items-center gap-3 !p-4 active:scale-[0.99] transition-transform">
              <div className="w-12 h-12 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center shrink-0">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">{doc.number}</p>
                  <Badge variant={doc.status === DocumentStatus.REFUSED ? 'error' : 'success'}>
                    {STATUS_LABELS[doc.status]}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">{doc.sender.name} → {doc.receiver.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{DOC_TYPE_LABELS[doc.type]} · {formatDate(doc.signedAt || doc.updatedAt)}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300 shrink-0" />
            </Card>
          ))}
        </div>
      )}

      {showExport && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowExport(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full bg-white dark:bg-gray-900 rounded-t-2xl p-4 pb-safe animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600 mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Выгрузить реестр</h3>
              <button onClick={() => setShowExport(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </button>
            </div>

            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Период</p>
            <div className="flex gap-2 mb-4">
              <div className="flex-1">
                <label className="text-xs text-gray-500 dark:text-gray-400">С</label>
                <input type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 text-sm" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 dark:text-gray-400">По</label>
                <input type="date" value={exportTo} onChange={e => setExportTo(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 text-sm" />
              </div>
            </div>

            <Button fullWidth size="lg" loading={exporting} onClick={handleExport}>
              Выгрузить CSV
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
