import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, Info, Moon } from 'lucide-react'
import Card from '../components/ui/Card'
import Toggle from '../components/ui/Toggle'
import Button from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import { getSettings, setSettings, clear } from '../lib/storage'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [settings, setLocalSettings] = useState(getSettings())

  const update = (patch: Partial<typeof settings>) => {
    const next = { ...settings, ...patch }
    setLocalSettings(next)
    setSettings(patch)
  }

  const handleReset = () => {
    clear()
    toast('Данные сброшены', 'info')
    navigate('/')
  }

  return (
    <div className="p-4 space-y-4">
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Moon className="h-5 w-5 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Внешний вид</h3>
        </div>
        <Toggle
          label="Тёмная тема"
          checked={settings.darkMode}
          onChange={v => {
            update({ darkMode: v })
            document.documentElement.classList.toggle('dark', v)
          }}
        />
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Симуляция</h3>
        <div className="space-y-4">
          <Toggle
            label="Имитация задержек"
            checked={settings.simulateDelay}
            onChange={v => update({ simulateDelay: v })}
          />
          <Toggle
            label="Имитация ошибок"
            checked={settings.simulateErrors}
            onChange={v => update({ simulateErrors: v })}
          />
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Данные</h3>
        <Button fullWidth variant="danger" onClick={handleReset}>
          <Trash2 className="h-4 w-4" />
          Сбросить все демо-данные
        </Button>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-center">Все документы и настройки будут удалены</p>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Info className="h-5 w-5 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">О приложении</h3>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
          <p>eTRN Demo v1.0</p>
          <p>Демонстрационная версия</p>
          <p>Электронные транспортные накладные</p>
          <p className="pt-2 text-xs text-gray-400 dark:text-gray-500">Все данные хранятся локально на устройстве</p>
        </div>
      </Card>
    </div>
  )
}
