import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Check, CheckCircle, Copy, FileText, Loader2, RefreshCw, Send, Shield, Trash2, Upload } from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { formatDate, formatDateTime, cn } from '../lib/utils'
import { useToast } from '../components/ui/Toast'
import { api, type ApiError } from '../lib/api'

interface McdItem {
  id: string
  status: string
  principal?: string | null
  principalInn?: string | null
  validFrom?: string | null
  validUntil?: string | null
  number?: string | null
  powers?: string[]
}

interface ParsedMcdPrincipal {
  name?: string | null
  inn?: string | null
  ogrn?: string | null
  kpp?: string | null
}

interface ParsedMcdTrustedPerson {
  fullName?: string | null
}

interface ParsedMcdPower {
  code?: string | null
  name?: string | null
}

interface ParsedMcd {
  number?: string | null
  principal?: ParsedMcdPrincipal | null
  trustedPerson?: ParsedMcdTrustedPerson | null
  validFrom?: string | null
  validUntil?: string | null
  registryGuid?: string | null
  powers?: ParsedMcdPower[]
}

interface ParsedMcdDraft {
  draftId: string
  parsed: ParsedMcd
}

const statusVariantMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  active: 'success',
  linked: 'success',
  attached: 'success',
  valid: 'success',
  pending: 'warning',
  pending_verification: 'warning',
  processing: 'warning',
  draft: 'warning',
  expired: 'error',
  invalid: 'error',
  revoked: 'error',
  insufficient: 'warning',
}

const statusLabelMap: Record<string, string> = {
  active: 'Действует',
  linked: 'Привязана',
  attached: 'Привязана',
  valid: 'Действует',
  pending: 'Проверяется',
  pending_verification: 'Проверяется',
  processing: 'Обновляется',
  draft: 'Черновик',
  expired: 'Истекла',
  invalid: 'Недействительна',
  revoked: 'Отозвана',
  insufficient: 'Недостаточно полномочий',
}

function getStatusVariant(status: string): 'success' | 'warning' | 'error' | 'default' {
  return statusVariantMap[status.toLowerCase()] ?? 'default'
}

function getStatusLabel(status: string): string {
  return statusLabelMap[status.toLowerCase()] ?? status
}


export default function McdLandingPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [items, setItems] = useState<McdItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [linkLoading, setLinkLoading] = useState(true)
  const [linkError, setLinkError] = useState('')
  const [parseError, setParseError] = useState('')
  const [parsedDraft, setParsedDraft] = useState<ParsedMcdDraft | null>(null)
  const [parsing, setParsing] = useState(false)
  const [attaching, setAttaching] = useState(false)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const parsedView = useMemo(() => {
    if (!parsedDraft) return null
    const p = parsedDraft.parsed
    return {
      number: p.number ?? null,
      principalName: p.principal?.name ?? null,
      principalInn: p.principal?.inn ?? null,
      representativeName: p.trustedPerson?.fullName ?? null,
      representativeInn: null,
      validFrom: p.validFrom ?? null,
      validTo: p.validUntil ?? null,
      powers: (p.powers ?? []).map(pw => ({ code: pw.code ?? undefined, name: pw.name ?? undefined })),
    }
  }, [parsedDraft])

  const loadItems = async () => {
    setLoading(true)
    setError('')

    try {
      const data = await api.get<{ mcds: McdItem[] }>('/mcd')
      setItems(data.mcds ?? [])
    } catch (rawError) {
      const apiError = rawError as ApiError
      setError(apiError.message || 'Не удалось загрузить список МЧД')
    } finally {
      setLoading(false)
    }
  }

  const loadInviteLink = async () => {
    setLinkLoading(true)
    setLinkError('')

    try {
      const data = await api.get<{ url: string }>('/mcd/invite-link')
      setInviteLink(data.url)
    } catch (rawError) {
      const apiError = rawError as ApiError
      setLinkError(apiError.message || 'Не удалось загрузить invite-ссылку')
    } finally {
      setLinkLoading(false)
    }
  }

  useEffect(() => {
    void loadItems()
    void loadInviteLink()
  }, [])

  const handleCopy = async () => {
    if (!inviteLink) return

    try {
      await navigator.clipboard.writeText(inviteLink)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = inviteLink
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }

    setCopied(true)
    toast('Ссылка скопирована', 'success')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const isXml = file.name.toLowerCase().endsWith('.xml') || file.type.includes('xml')
    if (!isXml) {
      setParseError('Файл должен быть в формате XML')
      event.target.value = ''
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setParseError('Размер файла превышает 10 МБ')
      event.target.value = ''
      return
    }

    setParsing(true)
    setParseError('')
    setParsedDraft(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      const draft = await api.postForm<ParsedMcdDraft>('/mcd/parse', formData)
      setParsedDraft(draft)
      toast('Файл распознан', 'success')
    } catch (rawError) {
      const apiError = rawError as ApiError
      setParseError(apiError.message || 'Не удалось разобрать XML')
    } finally {
      setParsing(false)
      event.target.value = ''
    }
  }

  const handleAttach = async () => {
    if (!parsedDraft) return

    setAttaching(true)
    try {
      await api.post('/mcd/attach', { draftId: parsedDraft.draftId })
      setParsedDraft(null)
      await loadItems()
      toast('МЧД привязана', 'success')
    } catch (rawError) {
      const apiError = rawError as ApiError
      toast(apiError.message || 'Не удалось привязать МЧД', 'error')
    } finally {
      setAttaching(false)
    }
  }

  const handleRefresh = async (id: string) => {
    setRefreshingId(id)
    try {
      await api.post(`/mcd/${id}/refresh`)
      await loadItems()
      toast('Статус МЧД обновлён', 'success')
    } catch (rawError) {
      const apiError = rawError as ApiError
      toast(apiError.message || 'Не удалось обновить статус', 'error')
    } finally {
      setRefreshingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await api.delete(`/mcd/${id}`)
      setItems(current => current.filter(item => item.id !== id))
      toast('МЧД удалена', 'success')
    } catch (rawError) {
      const apiError = rawError as ApiError
      toast(apiError.message || 'Не удалось удалить МЧД', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700/50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">МЧД</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Реестр доверенностей и загрузка XML</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <Card>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Добавить МЧД</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Загрузите XML-файл, распознайте данные и привяжите доверенность к аккаунту.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                ref={fileRef}
                type="file"
                accept=".xml,application/xml,text/xml"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button onClick={() => fileRef.current?.click()} loading={parsing}>
                <Upload className="h-4 w-4" />
                Загрузить XML
              </Button>
              <Button variant="secondary" onClick={() => navigate('/mcd/invite')}>
                <Send className="h-4 w-4" />
                Отправить приглашение
              </Button>
            </div>
          </div>

          {parseError && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{parseError}</p>
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Ссылка-приглашение</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Текущая ссылка для приглашения сотрудника на загрузку МЧД.
              </p>
            </div>
          </div>

          {linkLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Загружаем ссылку...
            </div>
          ) : linkError ? (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{linkError}</p>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-mono text-gray-600 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300">
                {inviteLink}
              </div>
              <button
                onClick={handleCopy}
                className={cn(
                  'px-4 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-1.5 shrink-0',
                  copied ? 'bg-green-500 text-white' : 'bg-brand-600 text-white hover:bg-brand-700',
                )}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Готово' : 'Копировать'}
              </button>
            </div>
          )}
        </Card>

        {parsedView && (
          <Card>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Предпросмотр распознанной МЧД</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Проверьте данные перед привязкой.</p>
              </div>
              <Badge variant="warning">draftId: {parsedDraft?.draftId}</Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <FieldRow label="Номер" value={parsedView.number} />
              <FieldRow label="Статус" value="Распознана" />
              <FieldRow label="Доверитель" value={parsedView.principalName} />
              <FieldRow label="ИНН доверителя" value={parsedView.principalInn} />
              <FieldRow label="Представитель" value={parsedView.representativeName} />
              <FieldRow label="ИНН представителя" value={parsedView.representativeInn} />
              <FieldRow label="Действует с" value={parsedView.validFrom ? formatDate(parsedView.validFrom) : null} />
              <FieldRow label="Действует до" value={parsedView.validTo ? formatDate(parsedView.validTo) : null} />
            </div>

            {parsedView.powers.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/50">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Полномочия</p>
                <div className="space-y-1.5">
                  {parsedView.powers.map((power, index) => (
                    <div key={`${power.code ?? 'power'}-${index}`} className="flex items-start gap-2 text-xs">
                      {power.code && (
                        <span className="shrink-0 rounded bg-brand-50 px-2 py-0.5 font-mono font-medium text-brand-700 dark:bg-brand-900/30">
                          {power.code}
                        </span>
                      )}
                      <span className="text-gray-700 dark:text-gray-300">{power.name ?? 'Без названия'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button onClick={handleAttach} loading={attaching}>
                <CheckCircle className="h-4 w-4" />
                Привязать МЧД
              </Button>
              <Button variant="ghost" onClick={() => setParsedDraft(null)}>
                Сбросить
              </Button>
            </div>
          </Card>
        )}

        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Список МЧД</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Загружается из BFF `GET /mcd`.</p>
          </div>
          <Button variant="ghost" onClick={() => void loadItems()} loading={loading}>
            <RefreshCw className="h-4 w-4" />
            Обновить список
          </Button>
        </div>

        {error && !loading && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
            Загружаем МЧД...
          </div>
        ) : items.length === 0 ? (
          <Card>
            <div className="py-6 text-center">
              <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">Пока нет привязанных МЧД</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Загрузите XML-файл или отправьте приглашение сотруднику.</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <Card key={item.id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="h-5 w-5 text-brand-600 shrink-0" />
                      <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {item.number || item.id}
                      </p>
                      <Badge variant={getStatusVariant(item.status)}>{getStatusLabel(item.status)}</Badge>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 text-sm">
                      <FieldRow label="Доверитель" value={item.principal} />
                      <FieldRow label="ИНН доверителя" value={item.principalInn} />
                      <FieldRow label="Действует с" value={item.validFrom ? formatDate(item.validFrom) : null} />
                      <FieldRow label="Действует до" value={item.validUntil ? formatDate(item.validUntil) : null} />
                    </div>
                  </div>

                  <div className="flex gap-2 lg:flex-col lg:w-44">
                    <Button
                      variant="secondary"
                      size="sm"
                      fullWidth
                      onClick={() => void handleRefresh(item.id)}
                      loading={refreshingId === item.id}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Обновить статус
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      fullWidth
                      onClick={() => void handleDelete(item.id)}
                      loading={deletingId === item.id}
                    >
                      <Trash2 className="h-4 w-4" />
                      Удалить
                    </Button>
                  </div>
                </div>

                {(item.validFrom || item.validUntil) && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/50 text-xs text-gray-500 dark:text-gray-400">
                    {item.validFrom && item.validUntil
                      ? `Период действия: ${formatDateTime(item.validFrom)} - ${formatDateTime(item.validUntil)}`
                      : item.validUntil
                        ? `Действует до ${formatDateTime(item.validUntil)}`
                        : `Действует с ${formatDateTime(item.validFrom as string)}`}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function FieldRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2 dark:bg-gray-800/50">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-right font-medium text-gray-900 dark:text-gray-100">{value || '—'}</span>
    </div>
  )
}
