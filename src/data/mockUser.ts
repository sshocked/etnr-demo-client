import type { UserProfile, Subscription, Mcd } from '../lib/constants'

export const defaultUser: UserProfile = {
  id: 'user-001',
  phone: '79161234567',
  name: 'Смирнов Алексей Николаевич',
  email: 'smirnov@translogistic.ru',
  company: 'ООО «ТрансЛогистик»',
  inn: '7712345678',
  kind: 'ul',
  ogrn: '1027700123456',
  onboardingCompleted: true,
}

export const defaultSubscription: Subscription = {
  companyName: 'ООО "ТрансЛогистик"',
  companyInn: '7712345678',
  status: 'active',
  periodFrom: '2026-01-01',
  periodTo: '2026-12-31',
  plan: '500 документов/мес',
  used: 127,
  limit: 500,
}

export const defaultMcds: Mcd[] = [
  {
    status: 'linked',
    number: 'МЧД-2026-00456',
    principal: {
      companyName: 'ООО "ТрансЛогистик"',
      inn: '7712345678',
    },
    trustedPerson: 'Иванов Сергей Петрович',
    validUntil: '2027-01-15',
    powers: [
      { code: '02.08', name: 'Подписание электронных транспортных накладных (ЭТрН)' },
      { code: '02.09', name: 'Подписание заказ-нарядов (ЭЗЗ)' },
    ],
    fileName: 'МЧД_TRANSLOGISTIC_2026.xml',
    uploadedAt: '2026-01-15T10:00:00Z',
  },
  {
    status: 'linked',
    number: 'МЧД-2026-00789',
    principal: {
      companyName: 'ООО "АгроТрейд"',
      inn: '7701234567',
    },
    trustedPerson: 'Иванов Сергей Петрович',
    validUntil: '2026-09-30',
    powers: [
      { code: '02.08', name: 'Подписание электронных транспортных накладных (ЭТрН)' },
    ],
    fileName: 'МЧД_AGROTRADE_2026.xml',
    uploadedAt: '2026-02-20T12:30:00Z',
  },
]
