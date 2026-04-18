// Мок-сервис ДаДаты (DaData Suggestions API).
// В проде: POST https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party
// Здесь — возвращает правдоподобные данные по ИНН на базе преднастроенных записей
// + fallback для любого другого ИНН с детерминированной генерацией.

import type { UserKind } from './constants'

export interface DadataResult {
  kind: UserKind
  inn: string
  ogrn?: string          // ОГРН (10 цифр для юрлица) / ОГРНИП (15 для ИП)
  name: string           // официальное название (ООО «…», ИП Иванов И.И.) или ФИО для ФЛ
  shortName?: string     // краткое для отображения
  management?: string    // ФИО руководителя для юрлица
  address?: string
  status?: 'active' | 'liquidated' | 'bankruptcy'
}

// Преднастроенные «известные» записи для демо
const PRESETS: Record<string, DadataResult> = {
  // Юрлица (10 цифр)
  '7712345678': {
    kind: 'ul',
    inn: '7712345678',
    ogrn: '1027700123456',
    name: 'Общество с ограниченной ответственностью «ТрансЛогистик»',
    shortName: 'ООО «ТрансЛогистик»',
    management: 'Смирнов Алексей Николаевич',
    address: 'г. Москва, ул. Тверская, д. 12',
    status: 'active',
  },
  '7701234567': {
    kind: 'ul',
    inn: '7701234567',
    ogrn: '1027700456789',
    name: 'Общество с ограниченной ответственностью «АгроТрейд»',
    shortName: 'ООО «АгроТрейд»',
    management: 'Петрова Мария Сергеевна',
    address: 'г. Москва, Дмитровское шоссе, д. 45',
    status: 'active',
  },
  '7743210987': {
    kind: 'ul',
    inn: '7743210987',
    ogrn: '1157746123987',
    name: 'Общество с ограниченной ответственностью «МегаЛогистика»',
    shortName: 'ООО «МегаЛогистика»',
    management: 'Козлов Виктор Степанович',
    address: 'г. Москва, МКАД 84-й км, вл. 1',
    status: 'active',
  },
  // ИП (12 цифр с признаком)
  '771234567890': {
    kind: 'ip',
    inn: '771234567890',
    ogrn: '320774600123456',
    name: 'Индивидуальный предприниматель Иванов Сергей Петрович',
    shortName: 'ИП Иванов С. П.',
    address: 'г. Москва',
    status: 'active',
  },
  '505123456789': {
    kind: 'ip',
    inn: '505123456789',
    ogrn: '319508100012345',
    name: 'Индивидуальный предприниматель Морозов Андрей Викторович',
    shortName: 'ИП Морозов А. В.',
    address: 'Московская область, г. Люберцы',
    status: 'active',
  },
  // Физлица (12 цифр)
  '123456789012': {
    kind: 'fl',
    inn: '123456789012',
    name: 'Петров Иван Алексеевич',
    shortName: 'Петров И. А.',
  },
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

// Детерминированная генерация для любого ИНН, не попавшего в preset
function generate(inn: string): DadataResult {
  const seed = hash(inn)
  const names = [
    'Иванов Иван Иванович',
    'Петров Сергей Николаевич',
    'Сидоров Алексей Дмитриевич',
    'Козлов Дмитрий Олегович',
    'Морозов Виктор Николаевич',
  ]
  const companies = [
    'ТрансЛогистик', 'АгроТрейд', 'МегаЛогистика', 'СтройПеревозки',
    'СеверГруз', 'ЮгПуть', 'ЦентрТранс', 'ВосточнаяЛиния',
  ]
  const name = names[seed % names.length]

  if (inn.length === 10) {
    const c = companies[seed % companies.length]
    return {
      kind: 'ul',
      inn,
      ogrn: `10277${String(10000000 + (seed % 90000000)).padStart(8, '0')}`.slice(0, 13),
      name: `Общество с ограниченной ответственностью «${c}»`,
      shortName: `ООО «${c}»`,
      management: name,
      address: 'г. Москва',
      status: 'active',
    }
  }

  // 12 цифр — различаем ИП и ФЛ по чётности seed (условно для демо)
  if (seed % 2 === 0) {
    return {
      kind: 'ip',
      inn,
      ogrn: `31977${String(1000000 + (seed % 9000000)).padStart(7, '0')}`.slice(0, 15),
      name: `Индивидуальный предприниматель ${name}`,
      shortName: `ИП ${name.split(' ')[0]} ${name.split(' ')[1]?.[0]}. ${name.split(' ')[2]?.[0]}.`,
      status: 'active',
    }
  }

  const parts = name.split(' ')
  return {
    kind: 'fl',
    inn,
    name,
    shortName: `${parts[0]} ${parts[1]?.[0]}. ${parts[2]?.[0]}.`,
  }
}

/**
 * Имитирует вызов DaData API. Возвращает Promise с искусственной задержкой.
 */
export async function lookupByInn(inn: string): Promise<DadataResult | null> {
  await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 400))

  const clean = inn.replace(/\D/g, '')
  if (clean.length !== 10 && clean.length !== 12) return null

  return PRESETS[clean] ?? generate(clean)
}

/**
 * Проверка контрольной суммы ИНН (упрощённая для прототипа — в проде полноценный
 * алгоритм контрольных цифр ФНС). Здесь просто длина.
 */
export function validateInn(inn: string): string | null {
  const clean = inn.replace(/\D/g, '')
  if (!clean) return 'ИНН обязателен'
  if (clean.length !== 10 && clean.length !== 12) {
    return 'ИНН должен содержать 10 цифр (юр.лицо) или 12 цифр (физлицо/ИП)'
  }
  return null
}
