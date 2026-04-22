import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Building2, Loader2, Link2Off, Plus } from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Input from '../components/ui/Input'
import { EDO_OPERATORS } from '../lib/constants'
import type { EdoOperator } from '../lib/constants'
import { cn } from '../lib/utils'
import { useToast } from '../components/ui/Toast'

type FlowStep = 'list' | 'select' | 'register' | 'connecting'

export default function EdoConnectPage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [connectedOps, setConnectedOps] = useState<EdoOperator[]>([])
  const [flowStep, setFlowStep] = useState<FlowStep>('select')
  const [selectedOp, setSelectedOp] = useState<EdoOperator | null>(null)
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')

  const availableOps = (Object.keys(EDO_OPERATORS) as EdoOperator[]).filter(
    op => !connectedOps.includes(op)
  )

  const handleStartReg = () => {
    if (!selectedOp) return
    setFlowStep('register')
  }

  const handleSubmitReg = () => {
    if (!regEmail.trim() && !regPhone.trim()) {
      toast('Укажите email или телефон', 'error')
      return
    }
    setFlowStep('connecting')
    setTimeout(() => {
      setConnectedOps(prev => [...prev, selectedOp!])
      toast(`${EDO_OPERATORS[selectedOp!].name} подключён!`, 'success')
      setSelectedOp(null)
      setRegEmail('')
      setFlowStep('list')
    }, 2500)
  }

  const handleDisconnect = (op: EdoOperator) => {
    setConnectedOps(prev => prev.filter(o => o !== op))
    toast(`${EDO_OPERATORS[op].name} отключён`, 'info')
  }

  return (
    <div className="p-4 space-y-4">
      {/* List of connected operators */}
      {flowStep === 'list' && (
        <>
          <div className="mb-2">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Операторы ЭДО</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Подключённые операторы вашей компании</p>
          </div>

          <div className="space-y-3">
            {connectedOps.map(op => (
              <Card key={op}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-brand-600" />
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{EDO_OPERATORS[op].name}</span>
                  </div>
                  <Badge variant="success">Подключён</Badge>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1 mb-3">
                  <p>{EDO_OPERATORS[op].fullName}</p>
                  <p>{EDO_OPERATORS[op].description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400 dark:text-gray-500">Роуминг:</span>
                    <Badge variant="success">Активен</Badge>
                  </div>
                </div>
                <button
                  onClick={() => handleDisconnect(op)}
                  className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 transition-colors"
                >
                  <Link2Off className="h-4 w-4" />
                  Отключить
                </button>
              </Card>
            ))}
          </div>

          {availableOps.length > 0 && (
            <Button
              fullWidth
              variant="secondary"
              onClick={() => setFlowStep('select')}
            >
              <Plus className="h-4 w-4" />
              Подключить ещё оператора
            </Button>
          )}

          <Button fullWidth variant="ghost" onClick={() => navigate(-1)}>
            Назад
          </Button>
        </>
      )}

      {/* Select new operator */}
      {flowStep === 'select' && (
        <>
          <div className="mb-2">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {connectedOps.length > 0 ? 'Добавить оператора' : 'Выберите оператора ЭДО'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {connectedOps.length > 0
                ? `Подключено: ${connectedOps.map(o => EDO_OPERATORS[o].name).join(', ')}`
                : 'Для обмена электронными транспортными документами'
              }
            </p>
          </div>

          <div className="space-y-3">
            {availableOps.length === 0 ? (
              <Card className="text-center !py-8">
                <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Все операторы подключены!</p>
              </Card>
            ) : (
              availableOps.map(key => {
                const op = EDO_OPERATORS[key]
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedOp(key)}
                    className={cn(
                      'w-full text-left p-4 rounded-2xl border-2 transition-all',
                      selectedOp === key
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30'
                        : 'border-gray-200 dark:border-gray-600 hover:border-brand-300',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{op.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{op.fullName}</p>
                      </div>
                      {selectedOp === key && (
                        <div className="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{op.description}</p>
                  </button>
                )
              })
            )}
          </div>

          {availableOps.length > 0 && (
            <Button fullWidth onClick={handleStartReg} disabled={!selectedOp}>
              Подключить {selectedOp ? EDO_OPERATORS[selectedOp].name : ''}
            </Button>
          )}

          {connectedOps.length > 0 && (
            <Button fullWidth variant="ghost" onClick={() => setFlowStep('list')}>
              Назад к списку
            </Button>
          )}
        </>
      )}

      {/* Registration form */}
      {flowStep === 'register' && selectedOp && (
        <>
          <div className="mb-2">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Регистрация в {EDO_OPERATORS[selectedOp].name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Заполните данные для подключения</p>
          </div>

          <Card>
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="h-5 w-5 text-brand-600" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Ваша компания</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Данные будут переданы оператору ЭДО</p>
              </div>
            </div>
            <div className="space-y-3">
              <Input
                label="Email для уведомлений"
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
                placeholder="user@company.ru"
              />
              <Input
                label="Телефон"
                value={regPhone}
                onChange={e => setRegPhone(e.target.value)}
                placeholder="+7 (999) 123-45-67"
              />
            </div>
          </Card>

          {connectedOps.length > 0 && (
            <Card className="!bg-blue-50">
              <p className="text-xs text-blue-700 leading-relaxed">
                У вас уже подключено: {connectedOps.map(o => EDO_OPERATORS[o].name).join(', ')}.
                Роуминг между операторами обеспечит обмен ЭТрН с любыми контрагентами.
              </p>
            </Card>
          )}

          <div className="space-y-2">
            <Button fullWidth onClick={handleSubmitReg}>Подключить</Button>
            <Button fullWidth variant="ghost" onClick={() => setFlowStep('select')}>Назад</Button>
          </div>
        </>
      )}

      {/* Connecting animation */}
      {flowStep === 'connecting' && (
        <div className="text-center py-16">
          <Loader2 className="h-12 w-12 text-brand-600 animate-spin mx-auto mb-6" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Подключение...</h3>
          <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
            <p>Проверка данных компании...</p>
            <p>Регистрация в {selectedOp ? EDO_OPERATORS[selectedOp].name : ''}...</p>
            <p>Настройка роуминга...</p>
          </div>
        </div>
      )}
    </div>
  )
}
