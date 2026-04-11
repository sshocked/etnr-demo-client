import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Shield, RefreshCw, CreditCard, FileText, KeyRound, Link2, Copy, Check, ExternalLink, HelpCircle, ChevronRight } from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import { getItem, setItem } from '../lib/storage'
import { STORAGE_KEYS, SUB_STATUS_LABELS, MCD_STATUS_LABELS, EDO_OPERATORS } from '../lib/constants'
import type { UserProfile, Subscription, Mcd, Certificate } from '../lib/constants'
import { formatDate, cn } from '../lib/utils'

const subBadgeVariant: Record<string, 'success' | 'error' | 'warning'> = {
  active: 'success', expired: 'error', unpaid: 'warning',
}

const mcdBadgeVariant: Record<string, 'success' | 'default' | 'error' | 'warning'> = {
  linked: 'success', none: 'default', expired: 'error', invalid: 'error', insufficient: 'warning',
}

const certBadgeVariant: Record<string, 'success' | 'error' | 'warning'> = {
  active: 'success', expired: 'error', revoked: 'error',
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const user = getItem<UserProfile>(STORAGE_KEYS.USER)
  const subscription = getItem<Subscription>(STORAGE_KEYS.SUBSCRIPTION)
  const mcds = getItem<Mcd[]>(STORAGE_KEYS.MCD) ?? []
  const cert = getItem<Certificate>(STORAGE_KEYS.CERTIFICATE) ?? user?.certificate
  const [mcdLoading, setMcdLoading] = useState<number | null>(null)
  const [mcdLinkCopied, setMcdLinkCopied] = useState(false)

  const mcdShareLink = (() => {
    const base = window.location.origin + window.location.pathname
    return `${base}#/mcd?id=${user?.id || 'demo'}`
  })()

  const handleInvoice = () => {
    toast('Счёт отправлен на email (демо)', 'success')
  }

  const handleCopyMcdLink = async () => {
    try {
      await navigator.clipboard.writeText(mcdShareLink)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = mcdShareLink
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setMcdLinkCopied(true)
    toast('Ссылка скопирована!', 'success')
    setTimeout(() => setMcdLinkCopied(false), 2000)
  }

  const handleMcdRefresh = async (idx: number) => {
    setMcdLoading(idx)
    setTimeout(() => {
      const updated = [...mcds]
      updated[idx] = { ...updated[idx], status: 'linked', validUntil: '2027-06-01' }
      setItem(STORAGE_KEYS.MCD, updated)
      setMcdLoading(null)
      toast('МЧД обновлена', 'success')
    }, 1500)
  }

  const handleIssueCert = () => {
    navigate('/cert-issue')
  }

  const handleReissueCert = () => {
    navigate('/cert-issue?reissue=true')
  }

  const usagePercent = subscription?.limit ? Math.round((subscription.used / subscription.limit) * 100) : 0

  return (
    <div className="p-4 space-y-4">
      {/* User info — prominent header */}
      <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-xl font-bold">
              {user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2) || '?'}
            </span>
          </div>
          <div>
            <p className="text-lg font-bold">{user?.name}</p>
            <p className="text-sm text-white/70">{user?.company || 'Без компании'}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {user?.inn && (
            <span className="px-2.5 py-1 bg-white/15 rounded-lg">ИНН: {user.inn}</span>
          )}
          <span className="px-2.5 py-1 bg-white/15 rounded-lg">
            {user?.role === 'employee' ? 'Сотрудник' : 'Водитель'}
          </span>
          {user?.edoOperators?.length ? (
            <span className="px-2.5 py-1 bg-white/15 rounded-lg">
              ЭДО: {user.edoOperators.map(op => EDO_OPERATORS[op].name).join(', ')}
            </span>
          ) : null}
        </div>
      </div>

      {/* Certificate */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-gray-400" />
            <span className="font-semibold text-gray-900 dark:text-gray-100">Сертификат ЭП</span>
          </div>
          {cert ? (
            <Badge variant={certBadgeVariant[cert.status]}>
              {cert.status === 'active' ? 'Действителен' : cert.status === 'expired' ? 'Истёк' : 'Отозван'}
            </Badge>
          ) : (
            <Badge variant="default">Нет</Badge>
          )}
        </div>

        {cert ? (
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-500">Владелец</span>
              <span className="font-medium text-gray-800">{cert.owner}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">УЦ</span>
              <span className="font-medium">{cert.issuer}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Серийный №</span>
              <span className="font-mono text-xs">{cert.serialNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Провайдер</span>
              <span className="font-medium">{cert.provider === 'cryptopro' ? 'КриптоПро CSP' : 'ViPNet CSP'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Действует</span>
              <span className="text-xs">{formatDate(cert.validFrom)} — {formatDate(cert.validTo)}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Электронная подпись не настроена</p>
        )}

        <div className="mt-4">
          {!cert ? (
            <Button fullWidth variant="primary" onClick={handleIssueCert}>
              <KeyRound className="h-4 w-4" />
              Выпустить сертификат
            </Button>
          ) : cert.status !== 'active' ? (
            <Button fullWidth variant="primary" onClick={handleReissueCert}>
              <RefreshCw className="h-4 w-4" />
              Перевыпустить
            </Button>
          ) : null}
        </div>
      </Card>

      {/* EDO Operators */}
      <Card onClick={() => navigate('/profile/edo')}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-gray-400" />
            <span className="font-semibold text-gray-900 dark:text-gray-100">Операторы ЭДО</span>
          </div>
          <Badge variant={user?.edoOperators?.length ? 'success' : 'default'}>
            {user?.edoOperators?.length ? `${user.edoOperators.length} подкл.` : 'Нет'}
          </Badge>
        </div>
        {user?.edoOperators?.length ? (
          <div className="flex flex-wrap gap-1.5">
            {user.edoOperators.map(op => (
              <span key={op} className="px-2.5 py-1 bg-brand-50 text-brand-700 rounded-lg text-xs font-medium">
                {EDO_OPERATORS[op].name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Нажмите для подключения</p>
        )}
      </Card>

      {/* MCDs — always show */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-gray-400" />
            <span className="font-semibold text-gray-900 dark:text-gray-100">МЧД</span>
          </div>
          <Badge variant={mcds.some(m => m.status === 'linked') ? 'success' : mcds.length ? 'warning' : 'default'}>
            {mcds.length ? `${mcds.length} шт.` : 'Нет'}
          </Badge>
        </div>

        {mcds.length > 0 ? (
          <div className="space-y-4">
            {mcds.map((mcd, idx) => (
              <div key={mcd.number || idx} className={cn(
                idx > 0 && 'pt-4 border-t border-gray-100',
              )}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {mcd.number || `МЧД #${idx + 1}`}
                  </span>
                  <Badge variant={mcdBadgeVariant[mcd.status]} className="text-xs">
                    {MCD_STATUS_LABELS[mcd.status]}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <p>Доверитель: {mcd.principal.companyName} (ИНН {mcd.principal.inn})</p>
                  <p>
                    Доверенный: <span className={mcd.trustedPerson === user?.name ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>
                      {mcd.trustedPerson}
                    </span>
                  </p>
                  {mcd.validUntil && <p>Действительна до: {formatDate(mcd.validUntil)}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {mcd.powers.map(p => (
                      <span key={p} className="px-2 py-0.5 bg-brand-50 text-brand-700 rounded text-xs font-medium">{p}</span>
                    ))}
                  </div>
                </div>
                {(mcd.status === 'expired' || mcd.status === 'invalid' || mcd.status === 'insufficient') && (
                  <Button fullWidth variant="secondary" size="sm" className="mt-3" loading={mcdLoading === idx} onClick={() => handleMcdRefresh(idx)}>
                    <RefreshCw className="h-4 w-4" />
                    Обновить
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 mb-3">Машиночитаемые доверенности не привязаны</p>
        )}

        <div className="mt-4 space-y-2">
          <Button fullWidth variant="secondary" size="sm" onClick={handleCopyMcdLink}>
            {mcdLinkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {mcdLinkCopied ? 'Ссылка скопирована!' : 'Скопировать ссылку на МЧД'}
          </Button>
          <Button fullWidth variant="ghost" size="sm" onClick={() => navigate('/mcd')}>
            <ExternalLink className="h-4 w-4" />
            {mcds.length > 0 ? 'Загрузить ещё МЧД' : 'Загрузить МЧД'}
          </Button>
        </div>
      </Card>

      {/* Subscription */}
      {subscription && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-gray-400" />
              <span className="font-semibold text-gray-900 dark:text-gray-100">Подписка</span>
            </div>
            <Badge variant={subBadgeVariant[subscription.status]}>
              {SUB_STATUS_LABELS[subscription.status]}
            </Badge>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <p>{subscription.companyName} · ИНН {subscription.companyInn}</p>
            <p>Период: {formatDate(subscription.periodFrom)} — {formatDate(subscription.periodTo)}</p>
            <p>Тариф: <span className="font-medium text-gray-900 dark:text-gray-100">{subscription.plan}</span></p>

            {subscription.limit && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Использовано: {subscription.used} из {subscription.limit}</span>
                  <span>{usagePercent}%</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-600 rounded-full transition-all"
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2">
            <Button fullWidth variant="primary" onClick={handleInvoice}>
              <FileText className="h-4 w-4" />
              Выставить счёт для юрлица
            </Button>
            <Button fullWidth variant="secondary" onClick={() => navigate('/profile/payment')}>
              <CreditCard className="h-4 w-4" />
              Оплатить как физлицо
            </Button>
          </div>
        </Card>
      )}

      {/* FAQ / Help */}
      <Card onClick={() => navigate('/faq')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-gray-400" />
            <span className="font-semibold text-gray-900 dark:text-gray-100">Помощь и FAQ</span>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </div>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Частые вопросы, инструкции, поддержка</p>
      </Card>
    </div>
  )
}
