import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Shield, RefreshCw, CreditCard, FileText, KeyRound, Link2, Copy, Check, ExternalLink, HelpCircle, ChevronRight, Loader2 } from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { useToast } from '../components/ui/Toast'
import { getItem, setItem } from '../lib/storage'
import { STORAGE_KEYS, SUB_STATUS_LABELS, MCD_STATUS_LABELS } from '../lib/constants'
import type { UserProfile, Subscription, Certificate } from '../lib/constants'
import { formatDate, cn } from '../lib/utils'
import { api, type ApiError } from '../lib/api'
import { mapBillingStatusToSubscription, type BillingStatusResponse } from '../lib/billing'

interface McdApiItem {
  id: string
  number: string
  status: string
  principal: string
  principalInn: string
  validFrom: string
  validUntil: string
  powers: string[]
}

const subBadgeVariant: Record<string, 'success' | 'error' | 'warning'> = {
  active: 'success', expired: 'error', unpaid: 'warning',
}

const mcdBadgeVariant: Record<string, 'success' | 'default' | 'error' | 'warning' | undefined> = {
  linked: 'success', active: 'success', none: 'default', expired: 'error', invalid: 'error', insufficient: 'warning',
}

const certBadgeVariant: Record<string, 'success' | 'error' | 'warning'> = {
  active: 'success', expired: 'error', revoked: 'error',
}

interface AuthMeResponse {
  id: string
  phone: string
  name: string
  company: string
  inn: string
  role?: string
  onboardingCompleted: boolean
  createdAt: string
}

type StoredUserProfile = UserProfile & { role?: string }

function inferKind(inn: string, company: string, fallback?: UserProfile['kind']): UserProfile['kind'] {
  if (fallback) return fallback
  if (inn.length === 10) return 'ul'
  if (/^ип\b/i.test(company.trim())) return 'ip'
  return 'fl'
}

function mergeRemoteUser(remote: AuthMeResponse, current: StoredUserProfile | null): StoredUserProfile {
  return {
    ...(current ?? {
      id: remote.id,
      phone: remote.phone,
      email: '',
      kind: inferKind(remote.inn, remote.company),
      onboardingCompleted: remote.onboardingCompleted,
      name: remote.name,
      inn: remote.inn,
      company: remote.company,
    }),
    id: remote.id,
    phone: remote.phone,
    name: remote.name,
    company: remote.company,
    inn: remote.inn,
    kind: inferKind(remote.inn, remote.company, current?.kind),
    onboardingCompleted: remote.onboardingCompleted,
    role: remote.role ?? current?.role,
  }
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [storedUser] = useState<StoredUserProfile | null>(() => getItem<StoredUserProfile>(STORAGE_KEYS.USER))
  const [mcds, setMcds] = useState<McdApiItem[]>([])
  const [user, setUser] = useState<StoredUserProfile | null>(storedUser)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const storedUserRef = useRef(storedUser)
  const cert = getItem<Certificate>(STORAGE_KEYS.CERTIFICATE) ?? user?.certificate
  const [mcdLoading, setMcdLoading] = useState<string | null>(null)
  const [mcdLinkCopied, setMcdLinkCopied] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [form, setForm] = useState({
    name: storedUser?.name ?? '',
    company: storedUser?.company ?? '',
    inn: storedUser?.inn ?? '',
    role: storedUser?.role ?? '',
  })

  useEffect(() => {
    let cancelled = false

    const loadProfile = async () => {
      setProfileLoading(true)
      setProfileError('')

      try {
        const [remoteUser, billingStatus, mcdResp] = await Promise.all([
          api.get<AuthMeResponse>('/auth/me'),
          api.get<BillingStatusResponse>('/billing/status'),
          api.get<{ mcds: McdApiItem[] }>('/mcd').catch(() => ({ mcds: [] })),
        ])
        if (cancelled) return

        const nextUser = mergeRemoteUser(remoteUser, storedUserRef.current)
        const nextSubscription = mapBillingStatusToSubscription(billingStatus, nextUser.company, nextUser.inn)

        setUser(nextUser)
        setSubscription(nextSubscription)
        setMcds(mcdResp.mcds ?? [])
        setItem(STORAGE_KEYS.USER, nextUser)
        setForm({
          name: remoteUser.name ?? '',
          company: remoteUser.company ?? '',
          inn: remoteUser.inn ?? '',
          role: remoteUser.role ?? storedUserRef.current?.role ?? '',
        })
      } catch (error) {
        if (cancelled) return

        const apiError = error as ApiError
        setProfileError(apiError?.message || 'Не удалось загрузить профиль')
        toast('Не удалось загрузить профиль из auth-service', 'error')
      } finally {
        if (!cancelled) {
          setProfileLoading(false)
        }
      }
    }

    void loadProfile()

    return () => {
      cancelled = true
    }
  }, [toast])

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

  const handleMcdRefresh = async (mcdId: string) => {
    setMcdLoading(mcdId)
    try {
      await api.post(`/mcd/${mcdId}/refresh`)
      const mcdResp = await api.get<{ mcds: McdApiItem[] }>('/mcd')
      setMcds(mcdResp.mcds ?? [])
      toast('МЧД обновлена', 'success')
    } catch {
      toast('Не удалось обновить МЧД', 'error')
    } finally {
      setMcdLoading(null)
    }
  }

  const handleIssueCert = () => {
    navigate('/cert-issue')
  }

  const handleReissueCert = () => {
    navigate('/cert-issue?reissue=true')
  }

  const handleProfileSave = async () => {
    if (!form.name.trim() || !form.company.trim() || !form.inn.trim()) {
      setProfileError('Заполните ФИО, компанию и ИНН')
      return
    }

    setProfileSaving(true)
    setProfileError('')

    try {
      await api.put('/auth/profile', {
        name: form.name.trim(),
        company: form.company.trim(),
        inn: form.inn.trim(),
        role: form.role || undefined,
      })

      let nextUser: StoredUserProfile

      try {
        const remoteUser = await api.get<AuthMeResponse>('/auth/me')
        nextUser = mergeRemoteUser(remoteUser, user)
      } catch {
        nextUser = {
          ...(user ?? {
            id: '',
            phone: '',
            email: '',
            kind: inferKind(form.inn.trim(), form.company.trim()),
            onboardingCompleted: true,
            name: form.name.trim(),
            inn: form.inn.trim(),
            company: form.company.trim(),
          }),
          name: form.name.trim(),
          company: form.company.trim(),
          inn: form.inn.trim(),
          kind: inferKind(form.inn.trim(), form.company.trim(), user?.kind),
          role: form.role || user?.role,
        }
      }

      setUser(nextUser)
      setItem(STORAGE_KEYS.USER, nextUser)
      setForm({
        name: nextUser.name,
        company: nextUser.company,
        inn: nextUser.inn,
        role: nextUser.role ?? '',
      })
      toast('Профиль сохранён', 'success')
    } catch (error) {
      const apiError = error as ApiError
      setProfileError(apiError?.message || 'Не удалось сохранить профиль')
      toast('Не удалось сохранить профиль', 'error')
    } finally {
      setProfileSaving(false)
    }
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
          {user?.kind && (
            <span className="px-2.5 py-1 bg-white/15 rounded-lg">
              {user.kind === 'ul' ? 'Юридическое лицо' : user.kind === 'ip' ? 'ИП' : 'Физическое лицо'}
            </span>
          )}
          {user?.email && (
            <span className="px-2.5 py-1 bg-white/15 rounded-lg truncate max-w-[200px]">{user.email}</span>
          )}
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-gray-900 dark:text-gray-100">Данные профиля</span>
          {profileLoading && (
            <span className="inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Загрузка
            </span>
          )}
        </div>

        <div className="space-y-3">
          <Input
            label="ФИО"
            value={form.name}
            onChange={e => setForm(current => ({ ...current, name: e.target.value }))}
            disabled={profileLoading || profileSaving}
          />
          <Input
            label="Компания / ИП"
            value={form.company}
            onChange={e => setForm(current => ({ ...current, company: e.target.value }))}
            disabled={profileLoading || profileSaving}
          />
          <Input
            label="ИНН"
            inputMode="numeric"
            value={form.inn}
            onChange={e => setForm(current => ({ ...current, inn: e.target.value.replace(/\D/g, '').slice(0, 12) }))}
            disabled={profileLoading || profileSaving}
          />
        </div>

        {profileError && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{profileError}</p>
        )}

        <div className="mt-4">
          <Button fullWidth onClick={handleProfileSave} loading={profileSaving} disabled={profileLoading}>
            Сохранить профиль
          </Button>
        </div>
      </Card>

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
          <Badge variant="default">Нажмите →</Badge>
        </div>
        <p className="text-sm text-gray-400">Подключите оператора для обмена ЭТрН</p>
      </Card>

      {/* MCDs — always show */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-gray-400" />
            <span className="font-semibold text-gray-900 dark:text-gray-100">МЧД</span>
          </div>
          <Badge variant={mcds.some(m => m.status === 'active') ? 'success' : mcds.length ? 'warning' : 'default'}>
            {mcds.length ? `${mcds.length} шт.` : 'Нет'}
          </Badge>
        </div>

        {mcds.length > 0 ? (
          <div className="space-y-4">
            {mcds.map((mcd, idx) => (
              <div key={mcd.id || idx} className={cn(
                idx > 0 && 'pt-4 border-t border-gray-100',
              )}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {mcd.number || `МЧД #${idx + 1}`}
                  </span>
                  <Badge variant={mcdBadgeVariant[mcd.status] ?? 'default'} className="text-xs">
                    {(MCD_STATUS_LABELS as Record<string, string>)[mcd.status] ?? mcd.status}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <p>Доверитель: {mcd.principal} (ИНН {mcd.principalInn})</p>
                  {mcd.validUntil && <p>Действительна до: {formatDate(mcd.validUntil)}</p>}
                  {mcd.powers?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {mcd.powers.map((p, pi) => (
                        <span
                          key={pi}
                          className="px-2 py-0.5 bg-brand-50 text-brand-700 rounded text-xs font-medium"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {(mcd.status === 'expired' || mcd.status === 'invalid' || mcd.status === 'insufficient') && (
                  <Button fullWidth variant="secondary" size="sm" className="mt-3" loading={mcdLoading === mcd.id} onClick={() => handleMcdRefresh(mcd.id)}>
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
