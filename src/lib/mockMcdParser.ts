// Мок-парсер XML-МЧД.
// В проде здесь будет настоящий парсер XML по схеме ФНС.
// Сейчас — возвращает правдоподобные фейковые данные после "чтения" файла.

import { EKP_CATALOG } from './constants'
import type { Mcd, McdPower } from './constants'
import { getItem } from './storage'
import { STORAGE_KEYS } from './constants'
import type { UserProfile } from './constants'

export interface ParsedMcd {
  number: string
  principal: { companyName: string; inn: string }
  trustedPerson: string
  validUntil: string
  powers: McdPower[]
  fileName: string
}

// Набор "компаний-доверителей" для фейкового парсинга
const MOCK_PRINCIPALS = [
  { companyName: 'ООО "ТрансЛогистик"', inn: '7712345678' },
  { companyName: 'ООО "АгроТрейд"', inn: '7701234567' },
  { companyName: 'ООО "МегаЛогистика"', inn: '7743210987' },
  { companyName: 'ООО "СтройПеревозки"', inn: '5024156789' },
]

// Наборы полномочий, которые "встречаются" в файлах
const POWER_SETS: string[][] = [
  ['02.08'],                               // только ЭТрН
  ['02.08', '02.09'],                      // ЭТрН + ЭЗЗ
  ['02.08', '02.09', '02.10'],             // полный транспорт
  ['02.08', '01.02', '04.01'],             // ЭТрН + СФ + акты
  ['02.08', '02.09', '01.01', '01.02', '04.01', '06.01'], // максимум
]

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function codesToPowers(codes: string[]): McdPower[] {
  return codes.map(code => ({
    code,
    name: EKP_CATALOG[code] || `Полномочие ${code}`,
  }))
}

/**
 * "Парсит" XML-файл МЧД. В демо использует имя файла как сид,
 * чтобы результаты были стабильными для одного и того же файла.
 */
export function parseMcdFile(fileName: string, fileSize: number): ParsedMcd {
  const seed = hashString(fileName + fileSize)
  const principal = MOCK_PRINCIPALS[seed % MOCK_PRINCIPALS.length]
  const powerSet = POWER_SETS[seed % POWER_SETS.length]
  const user = getItem<UserProfile>(STORAGE_KEYS.USER)

  // Случайный срок действия — от 6 до 18 месяцев вперёд
  const validUntil = new Date()
  validUntil.setMonth(validUntil.getMonth() + 6 + (seed % 12))

  return {
    number: `МЧД-2026-${String(10000 + (seed % 90000))}`,
    principal,
    trustedPerson: user?.name || 'Иванов Сергей Петрович',
    validUntil: validUntil.toISOString().split('T')[0],
    powers: codesToPowers(powerSet),
    fileName,
  }
}

/**
 * Проверяет, что у пользователя есть МЧД с нужным полномочием
 * для подписания документа указанного типа.
 */
export function findMcdForPower(
  mcds: Mcd[],
  requiredCode: string,
  principalInn?: string,
): Mcd | null {
  return mcds.find(m => {
    if (m.status !== 'linked') return false
    if (m.validUntil && new Date(m.validUntil) < new Date()) return false
    if (principalInn && m.principal?.inn !== principalInn) return false
    const powers = Array.isArray(m.powers) ? m.powers : []
    return powers.some(p => {
      // defensive: на случай мигрированных/старых данных
      const code = typeof p === 'string' ? 'LEGACY' : p?.code
      return code === requiredCode
    })
  }) || null
}

export function parsedToMcd(parsed: ParsedMcd): Mcd {
  return {
    status: 'linked',
    number: parsed.number,
    principal: parsed.principal,
    trustedPerson: parsed.trustedPerson,
    validUntil: parsed.validUntil,
    powers: parsed.powers,
    fileName: parsed.fileName,
    uploadedAt: new Date().toISOString(),
  }
}
