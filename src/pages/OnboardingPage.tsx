import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, UserCircle, KeyRound, Truck, Building2, Loader2, Link, Download, HelpCircle, Plus, Check } from 'lucide-react'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import ProgressSteps from '../components/ui/ProgressSteps'
import { getItem, setItem, removeItem } from '../lib/storage'
import { STORAGE_KEYS, EDO_OPERATORS } from '../lib/constants'
import type { UserProfile, EdoOperator, Certificate } from '../lib/constants'
import { cn } from '../lib/utils'
import { maskInn, validateEmail, validateInn } from '../lib/masks'

const STEPS = ['Профиль', 'УКЭП', 'Оператор ЭДО', 'Готово']

// Invitation codes map to operators (simulated)
const INVITATION_CODES: Record<string, { operator: EdoOperator; company: string; inn: string }> = {
  'SBIS-2026': { operator: 'sbis', company: 'ООО "АгроТрейд"', inn: '7701234567' },
  'SBER-2026': { operator: 'sberkorus', company: 'ООО "СтройБаза"', inn: '7802345678' },
  'ASTR-2026': { operator: 'astral', company: 'ООО "ТрансЛогистик"', inn: '7712345678' },
  'KONT-2026': { operator: 'kontur', company: 'ООО "МеталлТорг"', inn: '7703456789' },
  'DEMO-2026': { operator: 'sberkorus', company: 'ООО "ТрансЛогистик"', inn: '7712345678' },
}

type EdoMode = null | 'invite' | 'manual'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const certDone = searchParams.get('certDone') === 'true'

  const user = getItem<UserProfile>(STORAGE_KEYS.USER)
  const cert = getItem<Certificate>(STORAGE_KEYS.CERTIFICATE)

  // Restore saved step from localStorage for CJM persistence
  const savedStep = getItem<number>(STORAGE_KEYS.ONBOARDING_STEP)
  const initialStep = certDone ? 2 : (savedStep ?? 0)

  const [step, setStepRaw] = useState(initialStep)
  const [name, setName] = useState(user?.name ?? '')
  const [company, setCompany] = useState(user?.company ?? '')
  const [inn, setInn] = useState(user?.inn ?? '')

  // Persist step changes to localStorage
  const setStep = (s: number) => {
    setStepRaw(s)
    setItem(STORAGE_KEYS.ONBOARDING_STEP, s)
  }

  // If certDone query param is set, persist step 2
  useEffect(() => {
    if (certDone) {
      setItem(STORAGE_KEYS.ONBOARDING_STEP, 2)
    }
  }, [certDone])

  // EDO connection
  const [edoMode, setEdoMode] = useState<EdoMode>(null)
  const [inviteCode, setInviteCode] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [connectedOperators, setConnectedOperators] = useState<EdoOperator[]>(user?.edoOperators ?? [])
  const [connectedCompany, setConnectedCompany] = useState(user?.company ?? '')
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [docsLoaded, setDocsLoaded] = useState(false)
  const [docsCount, setDocsCount] = useState(0)

  // Manual registration — multiple operator selection
  const [selectedOps, setSelectedOps] = useState<EdoOperator[]>([])
  const [regEmail, setRegEmail] = useState('')
  const [regInn, setRegInn] = useState(inn)
  const [regCompany, setRegCompany] = useState(company)
  const [registering, setRegistering] = useState(false)
  const [registered, setRegistered] = useState(false)
  const [regErrors, setRegErrors] = useState<{ inn?: string; email?: string; ops?: string }>({})

  const toggleOp = (op: EdoOperator) => {
    setSelectedOps(prev =>
      prev.includes(op) ? prev.filter(o => o !== op) : [...prev, op]
    )
    if (regErrors.ops) setRegErrors(p => ({ ...p, ops: undefined }))
  }

  // Step 0: Profile
  const handleProfileNext = () => {
    if (!name.trim()) return
    setItem(STORAGE_KEYS.USER, {
      ...getItem<UserProfile>(STORAGE_KEYS.USER),
      name,
      company,
      inn,
      role: 'driver' as const,
    })
    setStep(1)
  }

  // Step 1: УКЭП
  const handleCertIssue = () => {
    navigate('/cert-issue?from=onboarding')
  }

  // Step 2: EDO — invitation code
  const handleCheckInvite = () => {
    const code = inviteCode.trim().toUpperCase()
    const match = INVITATION_CODES[code]
    if (!match) {
      setInviteError('Код не найден. Проверьте код и попробуйте ещё раз.')
      return
    }

    setInviteError('')
    setConnecting(true)

    setTimeout(() => {
      setConnectedOperators([match.operator])
      setConnectedCompany(match.company)
      const u = getItem<UserProfile>(STORAGE_KEYS.USER)
      if (u) {
        setItem(STORAGE_KEYS.USER, {
          ...u,
          company: match.company,
          inn: match.inn,
          edoOperators: [match.operator],
        })
      }
      setConnecting(false)
      setLoadingDocs(true)
      setTimeout(() => {
        setDocsCount(5)
        setDocsLoaded(true)
        setLoadingDocs(false)
      }, 2500)
    }, 2000)
  }

  // Step 2: EDO — manual registration
  const handleManualRegister = () => {
    const newErrors: { inn?: string; email?: string; ops?: string } = {}
    if (selectedOps.length === 0) newErrors.ops = 'Выберите хотя бы одного оператора'
    const innErr = validateInn(regInn, 10)
    if (innErr) newErrors.inn = innErr
    const emailErr = validateEmail(regEmail)
    if (emailErr) newErrors.email = emailErr
    if (Object.keys(newErrors).length > 0) {
      setRegErrors(newErrors)
      return
    }
    setRegErrors({})
    setRegistering(true)

    setTimeout(() => {
      const companyName = regCompany || `ИП ${name}`
      setConnectedOperators(selectedOps)
      setConnectedCompany(companyName)
      const u = getItem<UserProfile>(STORAGE_KEYS.USER)
      if (u) {
        setItem(STORAGE_KEYS.USER, {
          ...u,
          company: companyName,
          inn: regInn,
          edoOperators: selectedOps,
        })
      }
      setRegistering(false)
      setRegistered(true)

      // Load docs after registration
      setLoadingDocs(true)
      setTimeout(() => {
        setDocsCount(0) // New registration — no docs yet
        setDocsLoaded(true)
        setLoadingDocs(false)
      }, 2000)
    }, 3000)
  }

  const handleEdoNext = () => setStep(3)

  // Step 3: Done
  const handleFinish = () => {
    const u = getItem<UserProfile>(STORAGE_KEYS.USER)
    if (u) setItem(STORAGE_KEYS.USER, { ...u, onboardingCompleted: true })
    removeItem(STORAGE_KEYS.ONBOARDING_STEP)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
      <div className="pt-8 pb-6 px-6">
        <ProgressSteps steps={STEPS} currentStep={step} />
      </div>

      <div className="flex-1 flex flex-col px-6 pb-8">
        {/* Step 0: Profile */}
        {step === 0 && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
                <UserCircle className="h-6 w-6 text-brand-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Ваш профиль</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Данные водителя для ЭТрН</p>
              </div>
            </div>

            <div className="bg-brand-50 dark:bg-brand-900/30 rounded-xl p-3 mb-5 flex items-center gap-2">
              <Truck className="h-5 w-5 text-brand-600 shrink-0" />
              <p className="text-sm text-brand-700 dark:text-brand-300">
                Приложение для водителей — подписание электронных транспортных накладных
              </p>
            </div>

            <div className="space-y-4">
              <Input label="ФИО *" value={name} onChange={e => setName(e.target.value)} placeholder="Иванов Сергей Петрович" />
              <Input label="Компания (если знаете)" value={company} onChange={e => setCompany(e.target.value)} placeholder='ООО "Перевозчик"' />
              <Input label="ИНН (если знаете)" value={inn} onChange={e => setInn(maskInn(e.target.value, 12))} placeholder="7712345678" inputMode="numeric" />
            </div>
            <div className="mt-8">
              <Button fullWidth onClick={handleProfileNext}>Далее</Button>
            </div>
          </>
        )}

        {/* Step 1: УКЭП */}
        {step === 1 && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
                <KeyRound className="h-6 w-6 text-brand-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Электронная подпись</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Для подписания ЭТрН нужен УКЭП</p>
              </div>
            </div>

            {cert ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-4 scale-in">
                  <KeyRound className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Сертификат выпущен!</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">УКЭП готов к использованию</p>
                <Card className="text-left !p-3 mb-6">
                  <div className="text-sm space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Владелец</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{cert.owner}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">УЦ</span>
                      <span className="font-medium">{cert.issuer}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Статус</span>
                      <Badge variant="success">Действителен</Badge>
                    </div>
                  </div>
                </Card>
                <Button fullWidth onClick={() => setStep(2)}>Далее</Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-yellow-50 rounded-xl p-3 mb-2">
                  <p className="text-sm text-yellow-800">
                    Для работы с ЭТрН необходим квалифицированный сертификат электронной подписи (УКЭП). Выпуск занимает 2–5 минут.
                  </p>
                </div>

                <button
                  onClick={handleCertIssue}
                  className="w-full text-left p-4 rounded-2xl border-2 border-brand-200 bg-brand-50 dark:bg-brand-900/30 hover:border-brand-400 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
                      <KeyRound className="h-5 w-5 text-brand-600" />
                    </div>
                    <div>
                      <span className="text-base font-semibold text-gray-900 dark:text-gray-100">Выпустить УКЭП через КриптоКлюч</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Анкета → проверка ФНС → QR-код → подпись</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setStep(2)}
                  className="w-full text-center p-3 text-sm text-gray-500 dark:text-gray-400 hover:text-brand-600"
                >
                  Пропустить (выпущу позже)
                </button>
              </div>
            )}
          </>
        )}

        {/* Step 2: EDO Operator */}
        {step === 2 && (
          <>
            {/* Already connected — show result */}
            {connectedOperators.length > 0 ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-4 scale-in">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
                    {registered ? 'Компания зарегистрирована!' : 'Подключено!'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {registered
                      ? `Вы зарегистрированы у ${connectedOperators.length > 1 ? 'операторов' : 'оператора'} ЭДО`
                      : 'Вы привязаны к компании через оператора ЭДО'}
                  </p>
                </div>

                <Card className="!p-4">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">{connectedOperators.length > 1 ? 'Операторы' : 'Оператор'}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {connectedOperators.map(op => (
                          <Badge key={op} variant="info">{EDO_OPERATORS[op].name}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Компания</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{connectedCompany}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Роль</span>
                      <Badge variant="default">Водитель</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Статус</span>
                      <Badge variant="success">Активен</Badge>
                    </div>
                  </div>
                </Card>

                {loadingDocs && (
                  <Card className="!p-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 text-brand-600 animate-spin shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Загрузка ЭТрН...</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Получаем документы от оператора</p>
                      </div>
                    </div>
                  </Card>
                )}

                {docsLoaded && docsCount > 0 && (
                  <Card className="!p-4 border-green-200 bg-green-50 dark:bg-green-900/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                        <Download className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Загружено {docsCount} ЭТрН</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Документы готовы к подписанию</p>
                      </div>
                    </div>
                  </Card>
                )}

                {docsLoaded && docsCount === 0 && (
                  <Card className="!p-4 border-blue-200 bg-blue-50">
                    <p className="text-sm text-blue-800 text-center">
                      Документов пока нет. Они появятся, когда диспетчер создаст ЭТрН на ваше имя.
                    </p>
                  </Card>
                )}

                {docsLoaded && (
                  <Button fullWidth onClick={handleEdoNext}>Далее</Button>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
                    <Link className="h-6 w-6 text-brand-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Оператор ЭДО</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Подключение к электронному документообороту</p>
                  </div>
                </div>

                {/* Mode selection */}
                {edoMode === null && (
                  <div className="space-y-3">
                    <button
                      onClick={() => setEdoMode('invite')}
                      className="w-full text-left p-4 rounded-2xl border-2 border-brand-200 bg-brand-50 dark:bg-brand-900/30 hover:border-brand-400 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
                          <Link className="h-5 w-5 text-brand-600" />
                        </div>
                        <div>
                          <span className="text-base font-semibold text-gray-900 dark:text-gray-100">У меня есть код приглашения</span>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Компания уже подключена к ЭДО — быстрое подключение</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setEdoMode('manual')}
                      className="w-full text-left p-4 rounded-2xl border border-gray-200 dark:border-gray-600 hover:border-brand-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                          <Plus className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div>
                          <span className="text-base font-semibold text-gray-900 dark:text-gray-100">Компания не подключена</span>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Зарегистрировать компанию у оператора ЭДО</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setEdoMode('invite')}
                      className="w-full text-left p-4 rounded-2xl border border-gray-200 dark:border-gray-600 hover:border-brand-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                          <HelpCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div>
                          <span className="text-base font-semibold text-gray-900 dark:text-gray-100">Не знаю</span>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Помогу разобраться — обратитесь к руководителю</p>
                        </div>
                      </div>
                    </button>
                  </div>
                )}

                {/* Invite code mode */}
                {edoMode === 'invite' && (
                  <>
                    <div className="bg-blue-50 rounded-xl p-3 mb-4">
                      <p className="text-sm text-blue-800">
                        Ваша компания уже подключена к оператору ЭДО. Введите код приглашения от диспетчера.
                      </p>
                    </div>

                    <div className="space-y-4 mb-6">
                      <Input
                        label="Код приглашения"
                        value={inviteCode}
                        onChange={e => { setInviteCode(e.target.value.toUpperCase()); setInviteError('') }}
                        placeholder="Например: DEMO-2026"
                        disabled={connecting}
                      />
                      {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}
                    </div>

                    <Button
                      fullWidth
                      onClick={handleCheckInvite}
                      loading={connecting}
                      disabled={!inviteCode.trim() || connecting}
                    >
                      {connecting ? 'Подключение...' : 'Подключиться'}
                    </Button>

                    {connecting && (
                      <div className="mt-4 space-y-2">
                        <StepLine label="Проверка кода приглашения" done active />
                        <StepLine label="Аутентификация через УКЭП" done={false} />
                        <StepLine label="Регистрация водителя у оператора" done={false} />
                      </div>
                    )}

                    <div className="mt-5 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        Для демо: <span className="font-mono font-bold text-brand-600">DEMO-2026</span>
                      </p>
                    </div>

                    <button
                      onClick={() => setEdoMode(null)}
                      className="w-full text-center p-3 mt-3 text-sm text-gray-500 dark:text-gray-400 hover:text-brand-600"
                    >
                      ← Назад
                    </button>
                  </>
                )}

                {/* Manual registration mode */}
                {edoMode === 'manual' && (
                  <>
                    <div className="bg-orange-50 rounded-xl p-3 mb-4">
                      <p className="text-sm text-orange-800">
                        Зарегистрируем вашу компанию у операторов ЭДО. Можно выбрать сразу нескольких.
                      </p>
                    </div>

                    <div className="space-y-4 mb-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Выберите операторов ЭДО</label>
                        <div className="space-y-2">
                          {(Object.entries(EDO_OPERATORS) as [EdoOperator, typeof EDO_OPERATORS[EdoOperator]][]).map(([key, op]) => {
                            const isSelected = selectedOps.includes(key)
                            return (
                              <button
                                key={key}
                                onClick={() => toggleOp(key)}
                                className={cn(
                                  'w-full text-left p-3 rounded-xl border-2 transition-all',
                                  isSelected
                                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30'
                                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300',
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{op.name}</span>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">{op.description}</p>
                                  </div>
                                  <div className={cn(
                                    'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                                    isSelected ? 'bg-brand-600 border-brand-600' : 'border-gray-300',
                                  )}>
                                    {isSelected && <Check className="h-3 w-3 text-white" />}
                                  </div>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                        {regErrors.ops && <p className="mt-1.5 text-sm text-red-600">{regErrors.ops}</p>}
                      </div>

                      <Input
                        label="ИНН компании *"
                        value={regInn}
                        onChange={e => { setRegInn(maskInn(e.target.value, 10)); if (regErrors.inn) setRegErrors(p => ({ ...p, inn: undefined })) }}
                        placeholder="7712345678"
                        inputMode="numeric"
                        error={regErrors.inn}
                      />
                      <Input
                        label="Название компании"
                        value={regCompany}
                        onChange={e => setRegCompany(e.target.value)}
                        placeholder='ООО "Перевозчик"'
                      />
                      <Input
                        label="Email руководителя *"
                        type="email"
                        value={regEmail}
                        onChange={e => { setRegEmail(e.target.value); if (regErrors.email) setRegErrors(p => ({ ...p, email: undefined })) }}
                        placeholder="director@company.ru"
                        error={regErrors.email}
                      />
                    </div>

                    <Button
                      fullWidth
                      onClick={handleManualRegister}
                      loading={registering}
                      disabled={selectedOps.length === 0 || !regInn.trim() || !regEmail.trim() || registering}
                    >
                      {registering ? 'Регистрация...' : `Зарегистрировать${selectedOps.length > 1 ? ` (${selectedOps.length})` : ''}`}
                    </Button>

                    {registering && (
                      <div className="mt-4 space-y-2">
                        <StepLine label="Проверка ИНН в ФНС" done active />
                        <StepLine label={`Создание учётных записей (${selectedOps.length})`} done={false} />
                        <StepLine label="Привязка УКЭП к учётной записи" done={false} />
                        <StepLine label="Активация электронного документооборота" done={false} />
                      </div>
                    )}

                    <button
                      onClick={() => setEdoMode(null)}
                      className="w-full text-center p-3 mt-3 text-sm text-gray-500 dark:text-gray-400 hover:text-brand-600"
                    >
                      ← Назад
                    </button>
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* Step 3: Done */}
        {step === 3 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6 scale-in">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Всё готово!</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Вы можете подписывать электронные транспортные накладные</p>

            <div className="flex flex-wrap gap-2 justify-center mb-2">
              {cert && <Badge variant="success">УКЭП</Badge>}
              {connectedOperators.map(op => (
                <Badge key={op} variant="info">{EDO_OPERATORS[op].name}</Badge>
              ))}
              <Badge variant="default">Водитель</Badge>
            </div>
            {docsCount > 0 && (
              <p className="text-sm text-brand-600 mb-4">{docsCount} ЭТрН ожидают подписания</p>
            )}
            {docsCount === 0 && registered && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">ЭТрН появятся, когда диспетчер создаст документы</p>
            )}

            <div className="w-full mt-4">
              <Button fullWidth size="lg" onClick={handleFinish}>
                Начать работу
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StepLine({ label, done, active }: { label: string; done: boolean; active?: boolean }) {
  return (
    <div className="flex items-center gap-3 text-left">
      {done && active ? (
        <Loader2 className="h-4 w-4 text-brand-600 animate-spin shrink-0" />
      ) : done ? (
        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
      ) : (
        <div className="w-4 h-4 rounded-full border-2 border-gray-200 dark:border-gray-600 shrink-0" />
      )}
      <span className={cn(
        'text-xs',
        done && active ? 'text-gray-900 dark:text-gray-100 font-medium' : done ? 'text-green-700' : 'text-gray-400 dark:text-gray-500',
      )}>
        {label}
      </span>
    </div>
  )
}
