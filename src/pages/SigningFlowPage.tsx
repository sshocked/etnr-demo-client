import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2, AlertTriangle, MapPin } from 'lucide-react'
import Button from '../components/ui/Button'
import ProgressSteps from '../components/ui/ProgressSteps'
import type { GeoLocation } from '../lib/constants'
import { api } from '../lib/api'

const MOCK_ADDRESS = '\u041c\u043e\u0441\u043a\u0432\u0430, \u0443\u043b. \u0422\u0432\u0435\u0440\u0441\u043a\u0430\u044f, 12'
const FALLBACK_LOCATION: GeoLocation = { lat: 55.7558, lng: 37.6173, address: '\u041c\u043e\u0441\u043a\u0432\u0430 (\u043f\u0440\u0438\u0431\u043b\u0438\u0437\u0438\u0442\u0435\u043b\u044c\u043d\u043e)' }

type SignMode = 'sign' | 'reservations' | 'refuse'

const stepsForMode: Record<SignMode, string[]> = {
  sign: ['Проверка сертификата и МЧД', 'Формирование подписи', 'Отправка документа', 'Документ подписан'],
  reservations: ['Проверка сертификата и МЧД', 'Оговорка', 'Формирование подписи', 'Подписан с оговоркой'],
  refuse: ['Проверка сертификата и МЧД', 'Формирование отказа', 'Отправка уведомления', 'Отказ отправлен'],
}

const successTitle: Record<SignMode, string> = {
  sign: 'Документ подписан!',
  reservations: 'Подписан с оговоркой',
  refuse: 'Отказ отправлен',
}

const successDesc: Record<SignMode, string> = {
  sign: 'Подпись успешно применена и отправлена',
  reservations: 'Документ подписан с оговоркой, контрагент уведомлён',
  refuse: 'Отказ отправлен отправителю документа',
}

export default function SigningFlowPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const mode = (searchParams.get('mode') || 'sign') as SignMode
  const reservationsText = searchParams.get('text') || ''
  const refuseReason = searchParams.get('reason') || ''
  const mcdNumber = searchParams.get('mcd') || ''

  const steps = stepsForMode[mode] || stepsForMode.sign

  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState(false)
  const [done, setDone] = useState(false)
  const [geoStatus, setGeoStatus] = useState<'pending' | 'success' | 'denied'>('pending')
  const geoRef = useRef<GeoLocation>(FALLBACK_LOCATION)

  // Capture geolocation on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoStatus('denied')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        geoRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude, address: MOCK_ADDRESS }
        setGeoStatus('success')
      },
      () => {
        geoRef.current = FALLBACK_LOCATION
        setGeoStatus('denied')
      },
      { timeout: 5000 }
    )
  }, [])

  useEffect(() => {
    if (done || error || !id) return

    const geo = geoRef.current

    const run = async () => {
      try {
        if (mode === 'refuse') {
          setCurrentStep(0)
          await api.post(`/documents/${id}/refuse`, { reason: refuseReason || 'Отказ' })
          setCurrentStep(3)
          setDone(true)
          return
        }

        // step 0 — init
        setCurrentStep(0)
        const apiMode = mode === 'reservations' ? 'sign_with_reservations' : 'sign'
        const initResp = await api.post<{ signRequestId: string; requiredDigest: string }>(`/documents/${id}/sign/init`, {
          mode: apiMode,
        })

        // step 1 — sign (demo: base64 of requiredDigest)
        setCurrentStep(1)
        const signature = btoa(initResp.requiredDigest)

        // step 2 — submit
        setCurrentStep(2)
        await api.post(`/documents/${id}/sign/submit`, {
          signRequestId: initResp.signRequestId,
          signature,
          reservations: mode === 'reservations' ? reservationsText : undefined,
          geoLat: geo.lat,
          geoLon: geo.lng,
        })

        setCurrentStep(3)
        setDone(true)
      } catch {
        setError(true)
      }
    }

    const timer = setTimeout(run, 500)
    return () => clearTimeout(timer)
  }, [id, done, error, mode, reservationsText, refuseReason])

  const handleRetry = () => {
    setError(false)
    setCurrentStep(0)
    setDone(false)
  }

  const progressLabels: Record<SignMode, Record<number, string>> = {
    sign: { 0: 'Проверка сертификата и МЧД...', 1: 'Формирование электронной подписи...', 2: 'Отправка подписанного документа...' },
    reservations: { 0: 'Проверка сертификата и МЧД...', 1: 'Сохранение оговорки...', 2: 'Формирование электронной подписи...' },
    refuse: { 0: 'Проверка сертификата и МЧД...', 1: 'Формирование отказа...', 2: 'Отправка уведомления...' },
  }

  const SuccessIcon = mode === 'refuse' ? XCircle : mode === 'reservations' ? AlertTriangle : CheckCircle
  const successIconColor = mode === 'refuse' ? 'text-red-500' : mode === 'reservations' ? 'text-yellow-500' : 'text-green-500'
  const successBg = mode === 'refuse' ? 'bg-red-50' : mode === 'reservations' ? 'bg-yellow-50' : 'bg-green-50'

  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-12">
          <ProgressSteps steps={steps} currentStep={done ? 4 : currentStep} />
        </div>

        {error ? (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-6 scale-in">
              <XCircle className="h-10 w-10 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Ошибка</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Не удалось выполнить операцию. Попробуйте ещё раз.</p>
            <div className="space-y-3">
              <Button fullWidth onClick={handleRetry}>Повторить подписание</Button>
              <Button fullWidth variant="ghost" onClick={() => navigate(-1)}>Вернуться к документу</Button>
            </div>
          </div>
        ) : done ? (
          <div className="text-center">
            <div className={`w-20 h-20 rounded-full ${successBg} flex items-center justify-center mx-auto mb-6 scale-in`}>
              <SuccessIcon className={`h-10 w-10 ${successIconColor}`} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{successTitle[mode]}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{successDesc[mode]}</p>
            {mode !== 'refuse' && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mb-6">
                <MapPin className="h-3.5 w-3.5" />
                <span>{geoRef.current.address || `${geoRef.current.lat.toFixed(4)}, ${geoRef.current.lng.toFixed(4)}`}</span>
              </div>
            )}
            {mode === 'refuse' && <div className="mb-6" />}
            {mode === 'reservations' && reservationsText && (
              <div className="mb-6 px-4 py-3 bg-yellow-50 rounded-xl text-left">
                <p className="text-xs font-medium text-yellow-700 mb-1">Оговорка:</p>
                <p className="text-sm text-yellow-800">{reservationsText}</p>
              </div>
            )}
            {mode === 'refuse' && refuseReason && (
              <div className="mb-6 px-4 py-3 bg-red-50 rounded-xl text-left">
                <p className="text-xs font-medium text-red-700 mb-1">Причина отказа:</p>
                <p className="text-sm text-red-800">{refuseReason}</p>
              </div>
            )}
            <div className="space-y-3">
              <Button fullWidth onClick={() => navigate('/documents')}>К документам</Button>
              <Button fullWidth variant="ghost" onClick={() => navigate('/dashboard')}>На главную</Button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-brand-600 animate-spin mx-auto mb-6" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {progressLabels[mode]?.[currentStep] || 'Обработка...'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Пожалуйста, подождите</p>
            {mcdNumber && mode !== 'refuse' && (
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-900/30 text-xs">
                <span className="text-brand-700 dark:text-brand-300 font-medium">Подписание по МЧД {mcdNumber}</span>
              </div>
            )}
            <div className="mt-4 flex items-center justify-center gap-1.5 text-xs">
              <MapPin className="h-3.5 w-3.5" />
              {geoStatus === 'pending' && <span className="text-gray-400 dark:text-gray-500">Определение местоположения...</span>}
              {geoStatus === 'success' && <span className="text-green-600">{geoRef.current.address}</span>}
              {geoStatus === 'denied' && <span className="text-gray-400 dark:text-gray-500">Геолокация недоступна</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
