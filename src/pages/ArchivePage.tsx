import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, FileText, ChevronRight, Archive, Download, X } from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { SkeletonCard } from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import { getItem, simulateDelay } from '../lib/storage'
import { STORAGE_KEYS, DocumentStatus, DOC_TYPE_LABELS, STATUS_LABELS } from '../lib/constants'
import type { DocRecord } from '../lib/constants'
import { formatDate, formatMoney } from '../lib/utils'
import { useToast } from '../components/ui/Toast'

export default function ArchivePage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [docs, setDocs] = useState<DocRecord[]>([])
  const [search, setSearch] = useState('')
  const [showExport, setShowExport] = useState(false)
  const [exportFormat, setExportFormat] = useState<'csv' | 'xml'>('csv')
  const [exportFrom, setExportFrom] = useState('')
  const [exportTo, setExportTo] = useState('')
  const [exportInclude, setExportInclude] = useState({ amounts: true, routes: true, driver: true })
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    (async () => {
      await simulateDelay()
      const all = getItem<DocRecord[]>(STORAGE_KEYS.DOCUMENTS) ?? []
      setDocs(all.filter(d => d.status === DocumentStatus.SIGNED || d.status === DocumentStatus.SIGNED_WITH_RESERVATIONS))
      setLoading(false)
    })()

    // Default export period: current month
    const now = new Date()
    setExportFrom(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`)
    setExportTo(now.toISOString().split('T')[0])
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return docs
    const q = search.toLowerCase()
    return docs.filter(d => d.number.toLowerCase().includes(q) || d.sender.name.toLowerCase().includes(q))
  }, [docs, search])

  const handleExport = () => {
    setExporting(true)
    setTimeout(() => {
      // Filter docs by date range
      let exportDocs = docs
      if (exportFrom) {
        const from = new Date(exportFrom)
        from.setHours(0, 0, 0, 0)
        exportDocs = exportDocs.filter(d => new Date(d.signedAt || d.updatedAt) >= from)
      }
      if (exportTo) {
        const to = new Date(exportTo)
        to.setHours(23, 59, 59, 999)
        exportDocs = exportDocs.filter(d => new Date(d.signedAt || d.updatedAt) <= to)
      }

      if (exportFormat === 'csv') {
        // Build CSV
        const headers = ['№', 'Номер документа', 'Дата подписания', 'Отправитель', 'Получатель', 'Статус']
        if (exportInclude.routes) headers.push('Маршрут')
        if (exportInclude.amounts) headers.push('Сумма')
        if (exportInclude.driver) headers.push('Водитель', 'Гос. номер')

        const rows = exportDocs.map((d, i) => {
          const row: string[] = [
            String(i + 1),
            d.number,
            formatDate(d.signedAt || d.updatedAt),
            d.sender.name,
            d.receiver.name,
            STATUS_LABELS[d.status],
          ]
          if (exportInclude.routes) row.push(`${d.route.from} → ${d.route.to}`)
          if (exportInclude.amounts) row.push(formatMoney(d.amount))
          if (exportInclude.driver) { row.push(d.driver.name); row.push(d.driver.vehiclePlate) }
          return row.map(v => `"${v}"`).join(';')
        })

        const bom = '\uFEFF'
        const csv = bom + headers.join(';') + '\n' + rows.join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `etrn_reestr_${exportFrom}_${exportTo}.csv`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        // XML for 1C
        const xmlRows = exportDocs.map(d => `  <Document>
    <Number>${d.number}</Number>
    <Date>${d.signedAt || d.updatedAt}</Date>
    <Sender>${d.sender.name}</Sender>
    <SenderINN>${d.sender.inn}</SenderINN>
    <Receiver>${d.receiver.name}</Receiver>
    <ReceiverINN>${d.receiver.inn}</ReceiverINN>
    <Route>${d.route.from} - ${d.route.to}</Route>
    <Amount>${d.amount}</Amount>
    <Status>${STATUS_LABELS[d.status]}</Status>
    <Driver>${d.driver.name}</Driver>
    <Vehicle>${d.driver.vehiclePlate}</Vehicle>
  </Document>`).join('\n')
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Registry date="${new Date().toISOString()}">\n${xmlRows}\n</Registry>`
        const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `etrn_reestr_${exportFrom}_${exportTo}.xml`
        a.click()
        URL.revokeObjectURL(url)
      }

      setExporting(false)
      setShowExport(false)
      toast('Реестр выгружен', 'success')
    }, 1500)
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
                  <Badge variant={doc.status === DocumentStatus.SIGNED_WITH_RESERVATIONS ? 'warning' : 'success'}>
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

      {/* Export bottom sheet */}
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

            {/* Format */}
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Формат</p>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setExportFormat('csv')}
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${exportFormat === 'csv' ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
              >
                Excel (.csv)
              </button>
              <button
                onClick={() => setExportFormat('xml')}
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${exportFormat === 'xml' ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
              >
                1С (.xml)
              </button>
            </div>

            {/* Date range */}
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

            {/* Include options (CSV only) */}
            {exportFormat === 'csv' && (
              <>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Включить</p>
                <div className="space-y-2 mb-4">
                  {([['amounts', 'Суммы'], ['routes', 'Маршруты'], ['driver', 'Данные водителя']] as const).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <input
                        type="checkbox"
                        checked={exportInclude[key]}
                        onChange={e => setExportInclude(prev => ({ ...prev, [key]: e.target.checked }))}
                        className="w-5 h-5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                    </label>
                  ))}
                </div>
              </>
            )}

            <Button fullWidth size="lg" loading={exporting} onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Скачать
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
