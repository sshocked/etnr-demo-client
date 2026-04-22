import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Briefcase, Building2, Loader2, Search, User } from 'lucide-react'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Card from '../components/ui/Card'
import { STORAGE_KEYS, type UserKind, type UserProfile } from '../lib/constants'
import { getItem, setItem } from '../lib/storage'
import { api, type ApiError } from '../lib/api'
import { validateInn } from '../lib/mockDadata'
import { cn } from '../lib/utils'

interface PartyResponse {
  kind: UserKind
  inn: string
  ogrn?: string
  kpp?: string
  name: string
  shortName?: string
  address?: string
}

type StoredUserProfile = UserProfile & { role?: string }

export default function OnboardingPage() {
  const navigate = useNavigate()
  const existingUser = getItem<StoredUserProfile>(STORAGE_KEYS.USER)

  const [inn, setInn] = useState(existingUser?.inn ?? '')
  const [dadata, setDadata] = useState<PartyResponse | null>(null)
  const [manualName, setManualName] = useState(existingUser?.name ?? '')
  const [manualCompany, setManualCompany] = useState(existingUser?.company ?? '')
  const [looking, setLooking] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const [manualMode, setManualMode] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestInnRef = useRef(inn)

  const lookupParty = async (requestedInn: string) => {
    latestInnRef.current = requestedInn
    setLooking(true)
    setLookupError('')
    setSubmitError('')

    try {
      const party = await api.get<PartyResponse>('/dadata/party', { inn: requestedInn })

      if (latestInnRef.current !== requestedInn) return

      setDadata(party)
      setManualMode(false)
      setManualName(party.kind === 'ul' ? existingUser?.name ?? '' : party.shortName ?? party.name)
      setManualCompany(party.shortName ?? party.name)
    } catch (error) {
      if (latestInnRef.current !== requestedInn) return

      const apiError = error as ApiError

      // TODO: when /dadata/party is consistently available in every environment,
      // revisit this manual fallback flow and narrow it to real outage cases only.
      if (apiError?.status === 404 || apiError?.status >= 500) {
        setLookupError('Сервис временно недоступен')
        setManualMode(true)
        setDadata(null)
        return
      }

      setLookupError(apiError?.message || 'Не удалось проверить ИНН')
      setDadata(null)
    } finally {
      if (latestInnRef.current === requestedInn) {
        setLooking(false)
      }
    }
  }

  const handleInnChange = (value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 12)

    setInn(clean)
    setDadata(null)
    setLookupError('')
    setSubmitError('')
    setManualMode(false)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (clean.length === 10 || clean.length === 12) {
      debounceRef.current = setTimeout(() => {
        void lookupParty(clean)
      }, 500)
    }
  }

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  useEffect(() => {
    if ((inn.length === 10 || inn.length === 12) && !dadata && !looking && !manualMode) {
      void lookupParty(inn)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async () => {
    const innError = validateInn(inn)
    if (innError) {
      setLookupError(innError)
      return
    }

    if (!dadata && !manualMode) {
      setLookupError('Дождитесь проверки ИНН')
      return
    }

    const name = dadata
      ? (dadata.kind === 'ul' ? manualName.trim() : dadata.shortName?.trim() || dadata.name.trim())
      : manualName.trim()
    const company = dadata ? (dadata.shortName?.trim() || dadata.name.trim()) : manualCompany.trim()

    if (!name) {
      setSubmitError('Укажите ФИО')
      return
    }

    if (!company) {
      setSubmitError('Укажите компанию или ИП')
      return
    }

    setSubmitting(true)
    setSubmitError('')

    try {
      await api.put('/auth/profile', {
        name,
        company,
        inn,
        role: existingUser?.role,
      })
      await api.post('/auth/onboarding/complete')

      const nextUser: StoredUserProfile = {
        ...(existingUser ?? {
          id: '',
          phone: '',
          email: '',
          kind: inn.length === 10 ? 'ul' : 'fl',
          onboardingCompleted: false,
          name: '',
          inn: '',
          company: '',
        }),
        name,
        company,
        inn,
        kind: dadata?.kind ?? (inn.length === 10 ? 'ul' : existingUser?.kind ?? 'fl'),
        ogrn: dadata?.ogrn ?? existingUser?.ogrn,
        onboardingCompleted: true,
      }

      setItem(STORAGE_KEYS.USER, nextUser)
      navigate('/dashboard', { replace: true })
    } catch (error) {
      const apiError = error as ApiError
      setSubmitError(apiError?.message || 'Не удалось завершить онбординг')
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = (Boolean(dadata) || manualMode) && !looking && !submitting

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
      <div className="flex-1 flex flex-col px-6 py-8 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-brand-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Завершите регистрацию</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Найдём вас в ЕГРЮЛ / ЕГРИП по ИНН</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <Input
              label="ИНН"
              value={inn}
              onChange={e => handleInnChange(e.target.value)}
              placeholder="10 цифр для компании или 12 — для ИП/физлица"
              inputMode="numeric"
              error={lookupError || undefined}
            />
            {looking && (
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Проверяем ИНН в DaData...</span>
              </div>
            )}
          </div>

          {dadata && !looking && (
            <Card className="!p-4 !border-green-200 dark:!border-green-800">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                  dadata.kind === 'ul' ? 'bg-brand-50 dark:bg-brand-900/30' :
                  dadata.kind === 'ip' ? 'bg-blue-50 dark:bg-blue-900/20' :
                  'bg-gray-50 dark:bg-gray-800/50',
                )}>
                  {dadata.kind === 'ul' ? (
                    <Building2 className="h-5 w-5 text-brand-600" />
                  ) : dadata.kind === 'ip' ? (
                    <Briefcase className="h-5 w-5 text-blue-600" />
                  ) : (
                    <User className="h-5 w-5 text-gray-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {dadata.kind === 'ul' ? 'Юридическое лицо' : dadata.kind === 'ip' ? 'Индивидуальный предприниматель' : 'Физическое лицо'}
                  </span>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug mt-1 mb-2">
                    {dadata.name}
                  </p>
                  <div className="space-y-1 text-xs">
                    <div className="flex gap-2">
                      <span className="text-gray-400 dark:text-gray-500 shrink-0">ИНН</span>
                      <span className="font-mono text-gray-700 dark:text-gray-300">{dadata.inn}</span>
                    </div>
                    {dadata.ogrn && (
                      <div className="flex gap-2">
                        <span className="text-gray-400 dark:text-gray-500 shrink-0">{dadata.kind === 'ip' ? 'ОГРНИП' : 'ОГРН'}</span>
                        <span className="font-mono text-gray-700 dark:text-gray-300">{dadata.ogrn}</span>
                      </div>
                    )}
                    {dadata.kpp && (
                      <div className="flex gap-2">
                        <span className="text-gray-400 dark:text-gray-500 shrink-0">КПП</span>
                        <span className="font-mono text-gray-700 dark:text-gray-300">{dadata.kpp}</span>
                      </div>
                    )}
                    {dadata.address && (
                      <div className="flex gap-2">
                        <span className="text-gray-400 dark:text-gray-500 shrink-0">Адрес</span>
                        <span className="text-gray-700 dark:text-gray-300">{dadata.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {manualMode && !looking && (
            <Card className="!p-4 !border-amber-200 dark:!border-amber-800">
              <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200 mb-4">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>Сервис временно недоступен. Заполните данные вручную.</p>
              </div>
              <div className="space-y-3">
                <Input
                  label="ФИО"
                  value={manualName}
                  onChange={e => setManualName(e.target.value)}
                  placeholder="Иванов Иван Иванович"
                />
                <Input
                  label="Компания / ИП"
                  value={manualCompany}
                  onChange={e => setManualCompany(e.target.value)}
                  placeholder="ООО «Компания» / ИП Иванов И.И."
                />
              </div>
            </Card>
          )}

          {dadata && dadata.kind === 'ul' && (
            <Input
              label="ФИО подписанта"
              value={manualName}
              onChange={e => setManualName(e.target.value)}
              placeholder="Иванов Иван Иванович"
            />
          )}

          {dadata === null && !looking && inn.length > 0 && inn.length < 10 && (
            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
              <Search className="h-3 w-3" />
              <span>Введите полный ИНН для поиска</span>
            </div>
          )}

          {submitError && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>{submitError}</p>
            </div>
          )}

          <div className="mt-8">
            <Button fullWidth size="lg" loading={submitting} disabled={!canSubmit} onClick={handleSubmit}>
              Продолжить
            </Button>

            {(dadata || manualMode) && (
              <div className="flex items-start gap-2 mt-4 p-3 rounded-xl bg-brand-50 dark:bg-brand-900/20 text-xs text-brand-800 dark:text-brand-200">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Для подписания документов в дальнейшем потребуется УКЭП и МЧД — это можно настроить после входа в приложение.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
