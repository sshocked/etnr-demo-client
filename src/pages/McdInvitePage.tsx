import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Copy, Check, CheckCircle, ChevronLeft, QrCode } from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import { cn } from '../lib/utils'
import { useToast } from '../components/ui/Toast'

type Step = 'form' | 'sent'

export default function McdInvitePage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [step, setStep] = useState<Step>('form')
  const [recipientName, setRecipientName] = useState('')
  const [recipientContact, setRecipientContact] = useState('')
  const [channel, setChannel] = useState<'sms' | 'email'>('sms')
  const [copied, setCopied] = useState(false)
  const [sending, setSending] = useState(false)

  // Мок: токенизированная ссылка для получателя.
  // В проде — HMAC-токен с TTL, генерируется на бэке.
  const inviteLink = (() => {
    const base = window.location.origin + window.location.pathname
    const token = Math.random().toString(36).slice(2, 10).toUpperCase()
    return `${base}#/mcd?invite=${token}`
  })()

  const handleSend = () => {
    if (!recipientName.trim()) {
      toast('Укажите ФИО получателя', 'error')
      return
    }
    if (!recipientContact.trim()) {
      toast(channel === 'sms' ? 'Укажите телефон' : 'Укажите email', 'error')
      return
    }
    setSending(true)
    setTimeout(() => {
      setSending(false)
      setStep('sent')
      toast(`Ссылка отправлена на ${channel === 'sms' ? 'телефон' : 'email'}`, 'success')
    }, 900)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = inviteLink
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    toast('Ссылка скопирована!', 'success')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700/50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => step === 'sent' ? navigate('/profile') : navigate('/mcd')}
            className="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Назад"
          >
            <ChevronLeft className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Отправить сотруднику</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Ссылка на загрузку МЧД</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* STEP: form */}
        {step === 'form' && (
          <>
            <div className="rounded-xl bg-brand-50 dark:bg-brand-900/20 p-4 text-sm text-brand-800 dark:text-brand-200 leading-relaxed">
              <p>
                Отправьте сотруднику персональную ссылку — он откроет её на своём телефоне и загрузит свою МЧД прямо в приложение.
              </p>
            </div>

            <Card>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Получатель</h3>

              <div className="space-y-3">
                <Input
                  label="ФИО"
                  value={recipientName}
                  onChange={e => setRecipientName(e.target.value)}
                  placeholder="Иванов Иван Иванович"
                />

                {/* Channel switch */}
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
                      SMS на телефон
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
                    onChange={e => setRecipientContact(e.target.value)}
                    placeholder="+7 (900) 123-45-67"
                  />
                ) : (
                  <Input
                    label="Email"
                    type="email"
                    value={recipientContact}
                    onChange={e => setRecipientContact(e.target.value)}
                    placeholder="ivanov@company.ru"
                  />
                )}
              </div>
            </Card>

            <Button fullWidth size="lg" loading={sending} onClick={handleSend}>
              <Send className="h-5 w-5" />
              Отправить ссылку
            </Button>

            <p className="text-xs text-gray-400 dark:text-gray-500 text-center leading-relaxed">
              Ссылка действительна 7 дней. После перехода по ней сотрудник увидит форму загрузки XML-МЧД.
            </p>
          </>
        )}

        {/* STEP: sent — подтверждение отправки */}
        {step === 'sent' && (
          <>
            <div className="text-center mb-4">
              <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-4 scale-in">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Ссылка отправлена</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {channel === 'sms' ? 'Отправили SMS на' : 'Отправили письмо на'} <span className="font-medium text-gray-700 dark:text-gray-300">{recipientContact}</span>
              </p>
            </div>

            {/* Recipient info */}
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Получатель</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{recipientName}</p>
                </div>
                <div className="px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-700 text-xs font-medium">
                  {channel === 'sms' ? 'SMS' : 'Email'}
                </div>
              </div>
            </Card>

            {/* QR + link */}
            <Card>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Или покажите QR-код</h3>
              <div className="flex justify-center mb-4">
                <MockQrCode />
              </div>
              <div className="flex gap-2">
                <div className="flex-1 px-3 py-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-xs text-gray-600 dark:text-gray-400 font-mono truncate border border-gray-200 dark:border-gray-600">
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
            </Card>

            <div className="space-y-2">
              <Button fullWidth variant="secondary" onClick={() => { setStep('form'); setRecipientName(''); setRecipientContact('') }}>
                Отправить ещё одну
              </Button>
              <Button fullWidth onClick={() => navigate('/profile')}>
                Готово
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/** Декоративный QR-код (в проде рендерится библиотекой). */
function MockQrCode() {
  // генерируем стабильный псевдо-QR 21x21 на базе текущей секунды
  const seed = Math.floor(Date.now() / 1000)
  const size = 21
  const cells: boolean[] = []
  let s = seed
  for (let i = 0; i < size * size; i++) {
    s = (s * 9301 + 49297) % 233280
    cells.push(s / 233280 > 0.55)
  }
  // Фиксированные «позиционные квадраты» в углах
  const setFinder = (ox: number, oy: number) => {
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
      const edge = x === 0 || x === 6 || y === 0 || y === 6
      const inner = x >= 2 && x <= 4 && y >= 2 && y <= 4
      cells[(oy + y) * size + (ox + x)] = edge || inner
    }
  }
  setFinder(0, 0)
  setFinder(size - 7, 0)
  setFinder(0, size - 7)

  return (
    <div className="inline-block p-3 bg-white rounded-xl shadow-sm border border-gray-200 relative">
      <div
        className="grid gap-0"
        style={{ gridTemplateColumns: `repeat(${size}, 8px)` }}
      >
        {cells.map((on, i) => (
          <div key={i} className={cn('w-2 h-2', on ? 'bg-gray-900' : 'bg-white')} />
        ))}
      </div>
      <div className="absolute bottom-1 right-1">
        <QrCode className="h-3 w-3 text-gray-300" />
      </div>
    </div>
  )
}
