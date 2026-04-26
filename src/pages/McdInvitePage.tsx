import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, Check, CheckCircle, ChevronLeft, Clock, Copy, Lock, Send, ShieldCheck } from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import { cn, formatDateTime } from '../lib/utils'
import { useToast } from '../components/ui/Toast'
import { API_BASE_URL, api, type ApiError } from '../lib/api'

type Step = 'form' | 'sent'
type Channel = 'sms' | 'email'

interface InviteCreateResponse {
  inviteUrl: string
  token: string
  id: string
}

interface InvitePreviewResponse {
  valid: boolean
  inviter?: { name?: string; company?: string }
  recipient?: { name?: string }
  expiresAt?: string
  reason?: string
}

export default function McdInvitePage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { token } = useParams()
  const isPreviewMode = Boolean(token)

  const [step, setStep] = useState<Step>('form')
  const [recipientName, setRecipientName] = useState('')
  const [recipientContact, setRecipientContact] = useState('')
  const [channel, setChannel] = useState<Channel>('sms')
  const [copied, setCopied] = useState(false)
  const [sending, setSending] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [previewLoading, setPreviewLoading] = useState(isPreviewMode)
  const [preview, setPreview] = useState<InvitePreviewResponse | null>(null)
  const [previewError, setPreviewError] = useState('')

  useEffect(() => {
    if (!token) return

    let cancelled = false

    const loadPreview = async () => {
      setPreviewLoading(true)
      setPreviewError('')

      try {
        const response = await fetch(new URL(`/mcd/invite/${token}/preview`, API_BASE_URL).toString())
        const data = await response.json() as InvitePreviewResponse

        if (!response.ok) {
          throw new Error('Не удалось загрузить приглашение')
        }

        if (!cancelled) {
          setPreview(data)
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'Не удалось загрузить приглашение'
          setPreviewError(message)
        }
      } finally {
        if (!cancelled) {
          setPreviewLoading(false)
        }
      }
    }

    void loadPreview()

    return () => {
      cancelled = true
    }
  }, [token])

  const handleSend = async () => {
    if (!recipientName.trim()) {
      toast('Укажите ФИО получателя', 'error')
      return
    }
    if (!recipientContact.trim()) {
      toast(channel === 'sms' ? 'Укажите телефон' : 'Укажите email', 'error')
      return
    }

    setSending(true)
    try {
      const result = await api.post<InviteCreateResponse>('/mcd/invite', {
        recipientName: recipientName.trim(),
        recipientContact: recipientContact.trim(),
        channel,
      })

      setInviteUrl(result.inviteUrl)
      setStep('sent')
      toast(`Ссылка отправлена через ${channel === 'sms' ? 'SMS' : 'email'}`, 'success')
    } catch (error) {
      const apiError = error as ApiError
      toast(apiError.message || 'Не удалось создать ссылку', 'error')
    } finally {
      setSending(false)
    }
  }

  const handleCopy = async () => {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = inviteUrl
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    toast('Ссылка скопирована', 'success')
    setTimeout(() => setCopied(false), 2000)
  }

  if (isPreviewMode) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50">
        <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700/50">
          <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Приглашение на загрузку МЧД</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Публичная preview-страница</p>
            </div>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-8">
          {previewLoading ? (
            <Card>
              <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                Проверяем приглашение...
              </div>
            </Card>
          ) : previewError ? (
            <Card className="!border-red-200 !bg-red-50 dark:!border-red-800 dark:!bg-red-900/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-semibold text-red-900 dark:text-red-100">Не удалось открыть приглашение</h2>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">{previewError}</p>
                </div>
              </div>
            </Card>
          ) : !preview?.valid ? (
            <Card className="!border-red-200 !bg-red-50 dark:!border-red-800 dark:!bg-red-900/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-semibold text-red-900 dark:text-red-100">Ссылка недействительна</h2>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    Приглашение истекло или было отозвано.
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <div className="text-center mb-5">
                  <div className="w-16 h-16 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-brand-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Вас пригласили загрузить МЧД</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Подтвердите приглашение и перейдите к загрузке доверенности.
                  </p>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 dark:text-gray-400">Пригласил</span>
                    <span className="font-medium text-right text-gray-900 dark:text-gray-100">
                      {preview.inviter?.name || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 dark:text-gray-400">Действует до</span>
                    <span className="font-medium text-right text-gray-900 dark:text-gray-100">
                      {preview.expiresAt ? formatDateTime(preview.expiresAt) : '—'}
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="!bg-green-50 dark:!bg-green-900/20 !border-green-200 dark:!border-green-800/50">
                <div className="space-y-2 text-sm text-green-800 dark:text-green-200">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Ссылка имеет ограниченный срок действия
                  </div>
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Preview доступен без JWT, сам upload выполняется в приложении
                  </div>
                </div>
              </Card>

              <Button fullWidth size="lg" onClick={() => navigate('/mcd')}>
                Принять
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700/50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => step === 'sent' ? navigate('/mcd') : navigate('/mcd')}
            className="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Назад"
          >
            <ChevronLeft className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Отправить сотруднику</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Создание invite-ссылки через `/mcd/invite`</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {step === 'form' && (
          <>
            <div className="rounded-xl bg-brand-50 dark:bg-brand-900/20 p-4 text-sm text-brand-800 dark:text-brand-200 leading-relaxed">
              Система создаст защищённую ссылку для сотрудника. После открытия preview он сможет перейти к загрузке своей МЧД.
            </div>

            <Card>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Получатель</h3>
              <div className="space-y-3">
                <Input
                  label="ФИО"
                  value={recipientName}
                  onChange={event => setRecipientName(event.target.value)}
                  placeholder="Иванов Иван Иванович"
                />

                <div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Способ отправки</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setChannel('sms'); setRecipientContact('') }}
                      className={cn(
                        'py-2.5 rounded-xl text-sm font-medium border transition-colors',
                        channel === 'sms'
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
                      )}
                    >
                      SMS
                    </button>
                    <button
                      onClick={() => { setChannel('email'); setRecipientContact('') }}
                      className={cn(
                        'py-2.5 rounded-xl text-sm font-medium border transition-colors',
                        channel === 'email'
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
                      )}
                    >
                      Email
                    </button>
                  </div>
                </div>

                {channel === 'sms' ? (
                  <Input
                    label="Телефон"
                    type="tel"
                    value={recipientContact}
                    onChange={event => setRecipientContact(event.target.value)}
                    placeholder="+7 (900) 123-45-67"
                  />
                ) : (
                  <Input
                    label="Email"
                    type="email"
                    value={recipientContact}
                    onChange={event => setRecipientContact(event.target.value)}
                    placeholder="ivanov@company.ru"
                  />
                )}
              </div>
            </Card>

            <Button fullWidth size="lg" loading={sending} onClick={handleSend}>
              <Send className="h-5 w-5" />
              Создать и отправить
            </Button>
          </>
        )}

        {step === 'sent' && (
          <>
            <div className="text-center mb-2">
              <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-4 scale-in">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Ссылка создана</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Получатель: <span className="font-medium text-gray-700 dark:text-gray-300">{recipientContact}</span>
              </p>
            </div>

            <Card>
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Получатель</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{recipientName}</p>
                </div>
                <div className="px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-700 text-xs font-medium shrink-0 ml-2">
                  {channel === 'sms' ? 'SMS' : 'Email'}
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Ссылка для копирования</h3>
              <div className="flex gap-2">
                <div className="flex-1 px-3 py-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-xs text-gray-600 dark:text-gray-400 font-mono truncate border border-gray-200 dark:border-gray-600">
                  {inviteUrl}
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
            </Card>

            <div className="space-y-2">
              <Button
                fullWidth
                variant="secondary"
                onClick={() => {
                  setStep('form')
                  setRecipientName('')
                  setRecipientContact('')
                  setInviteUrl('')
                }}
              >
                Создать ещё одну
              </Button>
              <Button fullWidth onClick={() => navigate('/mcd')}>
                Вернуться к МЧД
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
