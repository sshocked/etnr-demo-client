import type { UserProfile, Subscription, Mcd } from '../lib/constants'

export const defaultUser: UserProfile = {
  id: 'user-001',
  phone: '79161234567',
  name: 'Иванов Сергей Петрович',
  company: 'ООО "ТрансЛогистик"',
  inn: '7712345678',
  role: 'employee',
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
    powers: ['Подписание ЭТрН', 'Подписание ЭПД'],
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
    powers: ['Подписание ЭТрН'],
  },
]
