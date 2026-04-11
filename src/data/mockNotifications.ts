import type { AppNotification } from '../lib/constants'

export function seedNotifications(): AppNotification[] {
  const now = Date.now()
  const hour = 3600000
  const day = 24 * hour

  return [
    // 3x new_doc (first 3 unread)
    {
      id: 'notif-001',
      type: 'new_doc',
      title: 'Новый документ',
      message: 'Новый документ ЭТрН-2026-001 от ООО "АгроТрейд" требует вашей подписи',
      timestamp: new Date(now - 2 * hour).toISOString(),
      read: false,
      documentId: 'doc-001',
    },
    {
      id: 'notif-002',
      type: 'new_doc',
      title: 'Новый документ',
      message: 'Новый документ ЭТрН-2026-002 от ООО "СтройБаза" требует вашей подписи',
      timestamp: new Date(now - 5 * hour).toISOString(),
      read: false,
      documentId: 'doc-002',
    },
    {
      id: 'notif-003',
      type: 'new_doc',
      title: 'Новый документ',
      message: 'Новый документ ЭТрН-2026-003 от ООО "ТехноПарк" требует вашей подписи',
      timestamp: new Date(now - 8 * hour).toISOString(),
      read: false,
      documentId: 'doc-003',
    },
    // 2x signed
    {
      id: 'notif-004',
      type: 'signed',
      title: 'Документ подписан',
      message: 'Документ ЭТрН-2026-006 подписан всеми сторонами',
      timestamp: new Date(now - 1 * day).toISOString(),
      read: true,
      documentId: 'doc-006',
    },
    {
      id: 'notif-005',
      type: 'signed',
      title: 'Документ подписан',
      message: 'Документ ЭТрН-2026-007 подписан всеми сторонами',
      timestamp: new Date(now - 1 * day - 3 * hour).toISOString(),
      read: true,
      documentId: 'doc-007',
    },
    // 1x cert_expiry
    {
      id: 'notif-006',
      type: 'cert_expiry',
      title: 'Сертификат истекает',
      message: 'Сертификат УКЭП истекает через 14 дней. Продлите сертификат для продолжения работы.',
      timestamp: new Date(now - 2 * day).toISOString(),
      read: true,
      action: '/cert-issue',
    },
    // 1x mcd_expiry
    {
      id: 'notif-007',
      type: 'mcd_expiry',
      title: 'МЧД истекает',
      message: 'МЧД от ООО ТрансЛогистик истекает через 7 дней. Обновите доверенность.',
      timestamp: new Date(now - 2 * day - 2 * hour).toISOString(),
      read: true,
      action: '/profile',
    },
    // 1x payment
    {
      id: 'notif-008',
      type: 'payment',
      title: 'Подписка продлена',
      message: 'Подписка продлена до 31.12.2026. Спасибо за использование eTRN!',
      timestamp: new Date(now - 3 * day).toISOString(),
      read: true,
    },
    // 1x system
    {
      id: 'notif-009',
      type: 'system',
      title: 'Обновление приложения',
      message: 'Обновление приложения eTRN 1.1 доступно. Новые функции и исправления.',
      timestamp: new Date(now - 3 * day - 4 * hour).toISOString(),
      read: true,
    },
  ]
}
