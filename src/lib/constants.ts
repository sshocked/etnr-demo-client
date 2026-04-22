export enum DocumentStatus {
  NEED_SIGN = 'NEED_SIGN',
  IN_PROGRESS = 'IN_PROGRESS',
  SIGNED = 'SIGNED',
  SIGNED_WITH_RESERVATIONS = 'SIGNED_WITH_RESERVATIONS',
  REFUSED = 'REFUSED',
  ERROR = 'ERROR',
}

// ЭДО операторы
export type EdoOperator = 'sbis' | 'sberkorus' | 'astral' | 'kontur'

export const EDO_OPERATORS: Record<EdoOperator, { name: string; fullName: string; description: string }> = {
  sbis: { name: 'СБИС', fullName: 'Тензор (СБИС)', description: 'Роуминг с 27+ операторами, мобильная подпись' },
  sberkorus: { name: 'СберКорус', fullName: 'СберКорус (Сфера)', description: '60% всех ЭТрН, интеграция со Сбером' },
  astral: { name: 'Астрал', fullName: 'Калуга Астрал', description: 'Аккредитованный УЦ, коннекторы 1С/SAP' },
  kontur: { name: 'Контур', fullName: 'Контур.Диадок', description: 'Онлайн-регистрация, сервис Логистика' },
}

// Титулы ЭТрН
export interface TitleStatus {
  title: number
  name: string
  signer: string
  status: 'pending' | 'signed' | 'signed_with_reservations' | 'refused'
  signedAt: string | null
  reservations?: string
}

export const TITLE_NAMES = [
  'Сведения о грузе (грузоотправитель)',
  'Приём груза (перевозчик)',
  'Сдача груза (грузополучатель)',
  'Выдача груза (перевозчик)',
]

// Сертификат ЭП
export interface Certificate {
  id: string
  owner: string
  issuer: string // УЦ
  serialNumber: string
  validFrom: string
  validTo: string
  status: 'active' | 'expired' | 'revoked'
  provider: 'cryptopro' | 'vipnet'
}

export type DocumentType = 'trn'

export const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  trn: 'Электронная транспортная накладная',
}

export const STATUS_LABELS: Record<DocumentStatus, string> = {
  [DocumentStatus.NEED_SIGN]: 'Требует подписи',
  [DocumentStatus.IN_PROGRESS]: 'В работе',
  [DocumentStatus.SIGNED]: 'Подписан',
  [DocumentStatus.SIGNED_WITH_RESERVATIONS]: 'С оговоркой',
  [DocumentStatus.REFUSED]: 'Отказано',
  [DocumentStatus.ERROR]: 'Ошибка',
}

export const STATUS_COLORS: Record<DocumentStatus, { bg: string; text: string }> = {
  [DocumentStatus.NEED_SIGN]: { bg: 'bg-brand-50', text: 'text-brand-700' },
  [DocumentStatus.IN_PROGRESS]: { bg: 'bg-blue-50', text: 'text-blue-700' },
  [DocumentStatus.SIGNED]: { bg: 'bg-green-50', text: 'text-green-700' },
  [DocumentStatus.SIGNED_WITH_RESERVATIONS]: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
  [DocumentStatus.REFUSED]: { bg: 'bg-red-50', text: 'text-red-700' },
  [DocumentStatus.ERROR]: { bg: 'bg-red-50', text: 'text-red-700' },
}

export type SubscriptionStatus = 'active' | 'expired' | 'unpaid'

export const SUB_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: 'Активна',
  expired: 'Просрочена',
  unpaid: 'Не оплачена',
}

export const SUB_STATUS_COLORS: Record<SubscriptionStatus, { bg: string; text: string }> = {
  active: { bg: 'bg-green-50', text: 'text-green-700' },
  expired: { bg: 'bg-red-50', text: 'text-red-700' },
  unpaid: { bg: 'bg-orange-50', text: 'text-orange-700' },
}

export type McdStatus = 'linked' | 'none' | 'expired' | 'invalid' | 'insufficient'

export const MCD_STATUS_LABELS: Record<McdStatus, string> = {
  linked: 'Привязана',
  none: 'Нет',
  expired: 'Истекла',
  invalid: 'Неверная',
  insufficient: 'Недостаточно полномочий',
}

export const MCD_STATUS_COLORS: Record<McdStatus, { bg: string; text: string }> = {
  linked: { bg: 'bg-green-50', text: 'text-green-700' },
  none: { bg: 'bg-gray-100', text: 'text-gray-600' },
  expired: { bg: 'bg-red-50', text: 'text-red-700' },
  invalid: { bg: 'bg-red-50', text: 'text-red-700' },
  insufficient: { bg: 'bg-orange-50', text: 'text-orange-700' },
}

export interface GeoLocation {
  lat: number
  lng: number
  address?: string
}

export interface HistoryEvent {
  id: string
  timestamp: string
  action: 'created' | 'sent' | 'viewed' | 'signed' | 'rejected' | 'error'
  actor: string
  description: string
  location?: GeoLocation
}

export interface FileAttachment {
  id: string
  name: string
  size: number
  type: string
  downloadUrl?: string
}

export interface Trip {
  id: string
  name: string       // e.g. "Москва → Казань"
  date: string        // ISO date
  vehiclePlate: string
  driverName: string
}

export interface DocRecord {
  id: string
  number: string
  title: string
  type: DocumentType
  status: DocumentStatus
  createdAt: string
  updatedAt: string
  signedAt: string | null
  sender: { name: string; inn: string }
  receiver: { name: string; inn: string }
  driver: { name: string; phone: string; vehiclePlate: string }
  route: { from: string; to: string }
  cargo: { description: string; weight: number; volume: number; packages: number }
  amount: number
  history: HistoryEvent[]
  files: FileAttachment[]
  titles?: TitleStatus[]
  reservations?: string
  edoOperator?: EdoOperator
  tripId?: string
  assignedTo?: string      // driver name for delegation
  assignedAt?: string      // ISO date
  signLocation?: GeoLocation
}

export type UserKind = 'ul' | 'ip' | 'fl'  // юр.лицо / ИП / физлицо

export interface UserProfile {
  id: string
  phone: string
  name: string                          // ФИО физлица (подписанта)
  email: string                         // личный email (может отличаться от корпоративного)
  inn: string                           // ИНН пользователя (10 или 12 цифр)
  kind: UserKind                        // тип: юрлицо / ИП / физлицо
  company: string                       // название: для ФЛ = ФИО; для ИП = "ИП Иванов И.И."; для ЮЛ = название ООО
  ogrn?: string                         // ОГРН / ОГРНИП
  onboardingCompleted: boolean
  edoOperators?: EdoOperator[]
  certificate?: Certificate
}

export interface Subscription {
  companyName: string
  companyInn: string
  status: SubscriptionStatus
  periodFrom: string
  periodTo: string
  plan: string
  used: number
  limit: number | null
}

export interface McdPower {
  code: string          // код из ЕКП, напр. "02.08"
  name: string          // человекочитаемое наименование
}

export interface Mcd {
  status: McdStatus
  number: string | null
  principal: { companyName: string; inn: string }
  trustedPerson: string
  validUntil: string | null
  powers: McdPower[]
  fileName?: string
  uploadedAt?: string
}

// Справочник ЕКП (Единый классификатор полномочий ФНС) — стартовый набор
// под транспортный ЭДО. Будет дополняться по мере появления реальных XML-МЧД.
export const EKP_CATALOG: Record<string, string> = {
  '01.01': 'Подписание УПД',
  '01.02': 'Подписание счетов-фактур',
  '02.08': 'Подписание электронных транспортных накладных (ЭТрН)',
  '02.09': 'Подписание заказ-нарядов (ЭЗЗ)',
  '02.10': 'Подписание товарно-транспортных накладных (ТТН)',
  '04.01': 'Подписание актов выполненных работ',
  '06.01': 'Просмотр электронных документов',
}

// Маппинг типа документа → требуемый код полномочия из ЕКП.
// Используется при проверке МЧД перед подписанием.
export const DOC_TYPE_REQUIRED_POWER: Record<DocumentType, string> = {
  trn: '02.08',
}

export interface ActivityLogEntry {
  id: string
  timestamp: string
  type: 'sign' | 'view' | 'receive' | 'error'
  documentId: string
  documentNumber: string
  message: string
}

export interface AppSettings {
  simulateErrors: boolean
  simulateDelay: boolean
  delayMs: number
  darkMode: boolean
}

export type NotificationType = 'new_doc' | 'signed' | 'cert_expiry' | 'mcd_expiry' | 'payment' | 'system' | 'assigned'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: string
  read: boolean
  documentId?: string
  action?: string // route to navigate to
}

export const STORAGE_KEYS = {
  AUTH: 'etrn_auth',
  USER: 'etrn_user',
  DOCUMENTS: 'etrn_documents',
  ACTIVITY: 'etrn_activity',
  SETTINGS: 'etrn_settings',
  SUBSCRIPTION: 'etrn_subscription',
  MCD: 'etrn_mcd',
  CERTIFICATE: 'etrn_certificate',
  PIN: 'etrn_pin',
  BIOMETRICS: 'etrn_biometrics',
  ONBOARDING_STEP: 'etrn_onboarding_step',
  CERT_STEP: 'etrn_cert_step',
  NOTIFICATIONS: 'etrn_notifications',
  TRIPS: 'etrn_trips',
} as const
