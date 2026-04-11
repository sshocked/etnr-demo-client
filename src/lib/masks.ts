// Input masks and validation

/** SNILS: 123-456-789 01 */
export function maskSnils(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  let result = ''
  for (let i = 0; i < digits.length; i++) {
    if (i === 3 || i === 6) result += '-'
    if (i === 9) result += ' '
    result += digits[i]
  }
  return result
}

/** Phone: +7 (999) 123-45-67 */
export function maskPhone(value: string): string {
  let digits = value.replace(/\D/g, '')
  // Always start with 7
  if (digits.startsWith('8')) digits = '7' + digits.slice(1)
  if (!digits.startsWith('7')) digits = '7' + digits
  digits = digits.slice(0, 11)

  let result = '+7'
  if (digits.length > 1) result += ' (' + digits.slice(1, 4)
  if (digits.length >= 4) result += ')'
  if (digits.length > 4) result += ' ' + digits.slice(4, 7)
  if (digits.length > 7) result += '-' + digits.slice(7, 9)
  if (digits.length > 9) result += '-' + digits.slice(9, 11)
  return result
}

/** INN: 77 12 345678 (10 digits for org) or 7712 3456 7890 12 (12 digits for individual) */
export function maskInn(value: string, maxLen: number = 10): string {
  return value.replace(/\D/g, '').slice(0, maxLen)
}

/** OGRN: up to 13 or 15 digits */
export function maskOgrn(value: string): string {
  return value.replace(/\D/g, '').slice(0, 15)
}

/** Region code: up to 2 digits */
export function maskRegion(value: string): string {
  return value.replace(/\D/g, '').slice(0, 2)
}

/** Extract raw digits from masked value */
export function unmaskDigits(value: string): string {
  return value.replace(/\D/g, '')
}

// Validators

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Обязательное поле'
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!re.test(email)) return 'Некорректный email'
  return null
}

export function validateSnils(snils: string): string | null {
  const digits = unmaskDigits(snils)
  if (!digits) return 'Обязательное поле'
  if (digits.length !== 11) return 'СНИЛС должен содержать 11 цифр'
  return null
}

export function validatePhone(phone: string): string | null {
  const digits = unmaskDigits(phone)
  if (!digits) return 'Обязательное поле'
  if (digits.length !== 11) return 'Введите номер полностью'
  return null
}

export function validateInn(inn: string, length: number = 10): string | null {
  const digits = unmaskDigits(inn)
  if (!digits) return 'Обязательное поле'
  if (digits.length !== length) return `ИНН должен содержать ${length} цифр`
  return null
}

export function validateRequired(value: string): string | null {
  if (!value.trim()) return 'Обязательное поле'
  return null
}
