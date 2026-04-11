import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, MessageCircle, Mail, Phone } from 'lucide-react'
import Card from '../components/ui/Card'
import { cn } from '../lib/utils'

interface FaqItem {
  q: string
  a: string
}

const FAQ_SECTIONS: { title: string; items: FaqItem[] }[] = [
  {
    title: 'Общие вопросы',
    items: [
      {
        q: 'Что такое eTRN?',
        a: 'eTRN — мобильное приложение для водителей, позволяющее подписывать электронные транспортные накладные (ЭТрН) с помощью квалифицированной электронной подписи (УКЭП). Работает через операторов ЭДО — СБИС, СберКорус, Контур, Калуга Астрал.',
      },
      {
        q: 'Кто может пользоваться приложением?',
        a: 'Приложение предназначено для водителей транспортных компаний. Водитель получает код приглашения от диспетчера или руководителя компании, проходит регистрацию и может подписывать ЭТрН прямо с телефона.',
      },
      {
        q: 'Нужен ли интернет для работы?',
        a: 'Для подписания документов и загрузки новых ЭТрН необходимо интернет-подключение. Просмотр уже загруженных документов доступен оффлайн.',
      },
    ],
  },
  {
    title: 'Электронная подпись (УКЭП)',
    items: [
      {
        q: 'Что такое УКЭП и зачем она нужна?',
        a: 'УКЭП — усиленная квалифицированная электронная подпись. Она юридически равнозначна собственноручной подписи. Без УКЭП нельзя подписывать ЭТрН — документ не будет иметь юридической силы.',
      },
      {
        q: 'Как выпустить сертификат УКЭП?',
        a: 'В приложении перейдите в Профиль → Сертификат ЭП → Выпустить. Заполните анкету (ФИО, СНИЛС, ИНН, email), дождитесь проверки ФНС, отсканируйте QR-код в приложении КриптоКлюч и подпишите заявление. Весь процесс занимает 2–5 минут.',
      },
      {
        q: 'Сколько действует сертификат?',
        a: 'Сертификат УКЭП действует 1 год (15 месяцев для квалифицированных). За 30 дней до истечения приложение напомнит о необходимости перевыпуска.',
      },
      {
        q: 'Сертификат выпускается долго, что делать?',
        a: 'Выпуск сертификата зависит от проверки в СМЭВ ФНС. Обычно это 2–5 минут, но может занять до 30 минут. Вы можете закрыть приложение и вернуться позже — прогресс сохранится. При повторном входе вы продолжите с места остановки.',
      },
    ],
  },
  {
    title: 'МЧД (машиночитаемая доверенность)',
    items: [
      {
        q: 'Что такое МЧД?',
        a: 'МЧД — машиночитаемая доверенность, электронный документ, подтверждающий полномочия сотрудника действовать от имени организации. С 1 сентября 2024 года МЧД обязательна для подписания документов от юридического лица.',
      },
      {
        q: 'Как получить МЧД?',
        a: 'МЧД выпускает руководитель организации (или уполномоченное лицо) и передаёт водителю. В приложении перейдите в Профиль → МЧД → Загрузить МЧД. Также руководитель может отправить ссылку для загрузки.',
      },
      {
        q: 'Может ли быть несколько МЧД?',
        a: 'Да, у водителя может быть несколько МЧД от разных организаций. Например, если вы работаете с несколькими транспортными компаниями. Все привязанные МЧД отображаются в профиле.',
      },
      {
        q: 'МЧД истекла, что делать?',
        a: 'Обратитесь к руководителю организации для выпуска новой МЧД. Затем загрузите её в приложение через Профиль → МЧД → Загрузить МЧД. Без действующей МЧД подписание документов невозможно.',
      },
    ],
  },
  {
    title: 'Операторы ЭДО',
    items: [
      {
        q: 'Что такое оператор ЭДО?',
        a: 'Оператор ЭДО — аккредитованная организация, через которую происходит обмен электронными документами. eTRN поддерживает 4 оператора: СБИС, СберКорус (TREDO), Контур (Diadok Логистика), Калуга Астрал.',
      },
      {
        q: 'Как подключиться к оператору?',
        a: 'Если ваша компания уже подключена, попросите диспетчера код приглашения и введите его в приложении. Если компания не подключена, выберите оператора и зарегистрируйте компанию через приложение.',
      },
      {
        q: 'Можно ли подключить несколько операторов?',
        a: 'Да, можно подключить сразу нескольких операторов ЭДО. Это полезно, если вы работаете с контрагентами, использующими разных операторов. Роуминг между операторами настраивается автоматически.',
      },
    ],
  },
  {
    title: 'Подписание документов',
    items: [
      {
        q: 'Как подписать ЭТрН?',
        a: 'Откройте документ из списка → нажмите «Подписать» → приложение проверит УКЭП и МЧД, сформирует подпись и отправит документ оператору ЭДО. Весь процесс занимает несколько секунд.',
      },
      {
        q: 'Не могу подписать — ошибка сертификата',
        a: 'Убедитесь, что ваш сертификат УКЭП действителен (не истёк и не отозван). Проверить статус можно в Профиль → Сертификат ЭП. При необходимости перевыпустите сертификат.',
      },
      {
        q: 'Не могу подписать — ошибка МЧД',
        a: 'Для подписания нужна действующая МЧД. Проверьте статус в Профиль → МЧД. Если МЧД истекла или недействительна — обратитесь к руководителю для обновления.',
      },
    ],
  },
]

export default function FaqPage() {
  const navigate = useNavigate()
  const [openIdx, setOpenIdx] = useState<string | null>(null)

  const toggle = (key: string) => {
    setOpenIdx(prev => prev === key ? null : key)
  }

  return (
    <div className="p-4 space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Помощь и FAQ</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Ответы на частые вопросы</p>
      </div>

      {/* Support chat button */}
      <button
        onClick={() => navigate('/support')}
        className="w-full bg-gradient-to-r from-brand-600 to-brand-700 rounded-2xl p-4 text-left text-white shadow-md active:scale-[0.98] transition-transform flex items-center gap-4"
      >
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <MessageCircle className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-base font-semibold">Написать в поддержку</p>
          <p className="text-sm text-white/80 mt-0.5">Чат с виртуальным помощником</p>
        </div>
      </button>

      {FAQ_SECTIONS.map((section, si) => (
        <div key={si}>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">
            {section.title}
          </h3>
          <div className="space-y-2">
            {section.items.map((item, qi) => {
              const key = `${si}-${qi}`
              const isOpen = openIdx === key
              return (
                <Card key={key} className="!p-0 overflow-hidden">
                  <button
                    onClick={() => toggle(key)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 pr-3">{item.q}</span>
                    <ChevronDown className={cn(
                      'h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0 transition-transform duration-200',
                      isOpen && 'rotate-180',
                    )} />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-0">
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item.a}</p>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      ))}

      {/* Support section */}
      <Card>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Не нашли ответ?</h3>
        <div className="space-y-3">
          <a href="mailto:support@etrn.ru" className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <Mail className="h-5 w-5 text-brand-600" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Написать в поддержку</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">support@etrn.ru</p>
            </div>
          </a>
          <a href="tel:+78001234567" className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <Phone className="h-5 w-5 text-brand-600" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Позвонить</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">8 (800) 123-45-67 (бесплатно)</p>
            </div>
          </a>
          <a href="#" className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <MessageCircle className="h-5 w-5 text-brand-600" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Telegram</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">@etrn_support</p>
            </div>
          </a>
        </div>
      </Card>
    </div>
  )
}
