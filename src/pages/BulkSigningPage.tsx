import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2, FileText, RotateCcw } from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { cn } from '../lib/utils'
import { api } from '../lib/api'
import type { DocumentDetailApi } from '../lib/documents'

type StepStatus = 'pending' | 'active' | 'done' | 'error'

interface DocSignState {
  id: string
  number: string
  senderName: string
  senderInn: string
  steps: StepStatus[]
  status: 'waiting' | 'processing' | 'success' | 'error'
  mcdNumber?: string
  mcdPrincipal?: string
  errorReason?: string
}

interface McdForSigningResponse {
  mcd: { id: string; number?: string; principalName?: string; principalInn?: string } | null
  reason?: string
}

interface SignInitResponse {
  signRequestId: string
  requiredDigest: string
}

const STEP_LABELS = ['Проверка', 'Подпись', 'Отправка']

export default function BulkSigningPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const ids = (searchParams.get('ids') || '').split(',').filter(Boolean)

  const [docStates, setDocStates] = useState<DocSignState[]>([])
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const startedRef = useRef(false)

  useEffect(() => {
    if (ids.length === 0) {
      setLoading(false)
      return
    }

    let cancelled = false

    ;(async () => {
      try {
        const docs = await Promise.all(
          ids.map(id => api.get<DocumentDetailApi>(`/documents/${id}`).catch(() => null)),
        )

        if (cancelled) return

        const states: DocSignState[] = docs
          .filter((d): d is DocumentDetailApi => d !== null)
          .map(doc => ({
            id: doc.id,
            number: doc.number,
            senderName: doc.sender?.name ?? 'Неизвестный',
            senderInn: doc.sender?.inn ?? '',
            steps: ['pending', 'pending', 'pending'] as StepStatus[],
            status: 'waiting' as const,
          }))

        setDocStates(states)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const processDocuments = useCallback(async (states: DocSignState[]) => {
    if (states.length === 0) return

    setProcessing(true)
    let currentStates = [...states]

    for (let docIdx = 0; docIdx < currentStates.length; docIdx++) {
      const docState = currentStates[docIdx]
      if (docState.status === 'success') continue

      currentStates = currentStates.map((s, i) =>
        i === docIdx ? { ...s, status: 'processing' as const, steps: ['active', 'pending', 'pending'] as StepStatus[] } : s,
      )
      setDocStates([...currentStates])

      // Step 1: Check MCD
      let mcdNumber: string | undefined
      let mcdPrincipal: string | undefined
      try {
        const mcdResp = await api.get<McdForSigningResponse>('/mcd/find-for-signing', {
          docType: 'etrn',
          senderInn: docState.senderInn,
        })
        if (!mcdResp.mcd) {
          throw new Error(mcdResp.reason ?? `Нет подходящей МЧД от «${docState.senderName}»`)
        }
        mcdNumber = mcdResp.mcd.number ?? mcdResp.mcd.id
        mcdPrincipal = mcdResp.mcd.principalName ?? docState.senderName
      } catch (err) {
        const errorReason = err instanceof Error ? err.message : 'Ошибка проверки МЧД'
        currentStates = currentStates.map((s, i) =>
          i === docIdx ? { ...s, status: 'error' as const, steps: ['error', 'pending', 'pending'] as StepStatus[], errorReason, mcdNumber, mcdPrincipal } : s,
        )
        setDocStates([...currentStates])
        continue
      }

      currentStates = currentStates.map((s, i) =>
        i === docIdx ? { ...s, steps: ['done', 'active', 'pending'] as StepStatus[], mcdNumber, mcdPrincipal } : s,
      )
      setDocStates([...currentStates])

      // Step 2: Init sign
      let signRequestId: string
      let requiredDigest: string
      try {
        const initResp = await api.post<SignInitResponse>(`/documents/${docState.id}/sign/init`, { mode: 'sign' })
        signRequestId = initResp.signRequestId
        requiredDigest = initResp.requiredDigest
      } catch (err) {
        const errorReason = err instanceof Error ? err.message : 'Ошибка инициализации подписи'
        currentStates = currentStates.map((s, i) =>
          i === docIdx ? { ...s, status: 'error' as const, steps: ['done', 'error', 'pending'] as StepStatus[], errorReason } : s,
        )
        setDocStates([...currentStates])
        continue
      }

      currentStates = currentStates.map((s, i) =>
        i === docIdx ? { ...s, steps: ['done', 'done', 'active'] as StepStatus[] } : s,
      )
      setDocStates([...currentStates])

      // Step 3: Submit signature
      try {
        const signature = btoa(requiredDigest)
        await api.post(`/documents/${docState.id}/sign/submit`, {
          signRequestId,
          signature,
          geoLat: null,
          geoLon: null,
        })
      } catch (err) {
        const errorReason = err instanceof Error ? err.message : 'Ошибка отправки подписи'
        currentStates = currentStates.map((s, i) =>
          i === docIdx ? { ...s, status: 'error' as const, steps: ['done', 'done', 'error'] as StepStatus[], errorReason } : s,
        )
        setDocStates([...currentStates])
        continue
      }

      currentStates = currentStates.map((s, i) =>
        i === docIdx ? { ...s, status: 'success' as const, steps: ['done', 'done', 'done'] as StepStatus[] } : s,
      )
      setDocStates([...currentStates])
    }

    setProcessing(false)
    setDone(true)
  }, [])

  useEffect(() => {
    if (docStates.length > 0 && !processing && !done && !startedRef.current) {
      startedRef.current = true
      processDocuments(docStates)
    }
  }, [docStates, processing, done, processDocuments])

  const successCount = docStates.filter(s => s.status === 'success').length
  const errorCount = docStates.filter(s => s.status === 'error').length
  const totalCount = docStates.length

  const handleRetryFailed = () => {
    startedRef.current = false
    setDone(false)
    const resetStates = docStates.map(s =>
      s.status === 'error'
        ? { ...s, status: 'waiting' as const, steps: ['pending', 'pending', 'pending'] as StepStatus[], errorReason: undefined }
        : s,
    )
    setDocStates(resetStates)
  }

  if (ids.length === 0) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center px-6">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Нет документов для подписания</p>
        <Button onClick={() => navigate('/documents')}>К документам</Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 pb-8">
      {done ? (
        <div className={cn(
          'rounded-2xl p-5 text-center',
          errorCount > 0 ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-green-50 dark:bg-green-900/20',
        )}>
          <div className="flex justify-center mb-3">
            {errorCount > 0 ? (
              <XCircle className="h-12 w-12 text-yellow-500" />
            ) : (
              <CheckCircle className="h-12 w-12 text-green-500" />
            )}
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            Подписано {successCount} из {totalCount} документов
          </h2>
          {errorCount > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {errorCount} {errorCount === 1 ? 'документ' : errorCount < 5 ? 'документа' : 'документов'} с ошибкой
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-brand-50 dark:bg-brand-900/30 p-5 text-center">
          <Loader2 className="h-10 w-10 text-brand-600 animate-spin mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Подписание документов</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {successCount} из {totalCount} подписано
          </p>
        </div>
      )}

      <div className="space-y-2">
        {docStates.map(ds => (
          <Card key={ds.id} className={cn(
            '!p-4',
            ds.status === 'error' && 'ring-1 ring-red-200',
          )}>
            <div className="flex items-start gap-3">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                ds.status === 'success' ? 'bg-green-50 dark:bg-green-900/20' :
                ds.status === 'error' ? 'bg-red-50 dark:bg-red-900/20' :
                ds.status === 'processing' ? 'bg-brand-50 dark:bg-brand-900/30' :
                'bg-gray-100 dark:bg-gray-800',
              )}>
                {ds.status === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : ds.status === 'error' ? (
                  <XCircle className="h-5 w-5 text-red-600" />
                ) : ds.status === 'processing' ? (
                  <Loader2 className="h-5 w-5 text-brand-600 animate-spin" />
                ) : (
                  <FileText className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{ds.number}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{ds.senderName}</p>

                {(ds.status === 'processing' || ds.status === 'success' || ds.status === 'error') && (
                  <div className="flex items-center gap-3 mt-2">
                    {STEP_LABELS.map((label, idx) => {
                      const stepStatus = ds.steps[idx]
                      return (
                        <div key={idx} className="flex items-center gap-1">
                          {stepStatus === 'done' ? (
                            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                          ) : stepStatus === 'active' ? (
                            <Loader2 className="h-3.5 w-3.5 text-brand-600 animate-spin" />
                          ) : stepStatus === 'error' ? (
                            <XCircle className="h-3.5 w-3.5 text-red-500" />
                          ) : (
                            <div className="h-3.5 w-3.5 rounded-full border border-gray-300" />
                          )}
                          <span className={cn(
                            'text-xs',
                            stepStatus === 'done' ? 'text-green-600' :
                            stepStatus === 'active' ? 'text-brand-600 font-medium' :
                            stepStatus === 'error' ? 'text-red-600' :
                            'text-gray-400',
                          )}>
                            {label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {ds.status === 'error' && (
                  <p className="text-xs text-red-600 mt-1">{ds.errorReason ?? 'Не удалось подписать документ'}</p>
                )}
                {ds.status !== 'error' && ds.mcdNumber && (
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                    МЧД {ds.mcdNumber} · {ds.mcdPrincipal}
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {done && (
        <div className="space-y-3 pt-2">
          {errorCount > 0 && (
            <Button fullWidth variant="secondary" onClick={handleRetryFailed}>
              <RotateCcw className="h-5 w-5" />
              Повторить ({errorCount})
            </Button>
          )}
          <Button fullWidth onClick={() => navigate('/documents')}>К документам</Button>
          <Button fullWidth variant="ghost" onClick={() => navigate('/dashboard')}>На главную</Button>
        </div>
      )}
    </div>
  )
}
