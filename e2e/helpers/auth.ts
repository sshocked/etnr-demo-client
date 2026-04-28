import { Browser, BrowserContext, Page } from '@playwright/test'
import * as fs from 'fs'

export const BASE = 'http://lasamb.tw1.ru'
export const APP = BASE + '/app'
export const PIN = '1111'
export const STATE_FILE = '/tmp/pw-auth-state.json'
export const DEVICE_ID = 'e2e-playwright-001'

export function attachErrorListeners(page: Page, label: string) {
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[${label}] CONSOLE ERROR:`, msg.text())
  })
  page.on('requestfailed', req => {
    console.log(`[${label}] REQUEST FAILED:`, req.url(), req.failure()?.errorText)
  })
  page.on('response', res => {
    if (res.url().startsWith(BASE) && res.status() >= 400) {
      console.log(`[${label}] HTTP ${res.status()}:`, res.url())
    }
  })
}

export async function bootstrapAuth(browser: Browser): Promise<BrowserContext> {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  attachErrorListeners(page, 'AUTH')

  await page.goto(APP + '/#/auth')
  await page.waitForLoadState('load')
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await page.reload()
  await page.waitForLoadState('networkidle')

  const phoneInput = page.locator('input[type="tel"]')
  await phoneInput.waitFor({ state: 'visible', timeout: 10_000 })
  await phoneInput.fill('+7 999 123-45-67')

  const sendBtn = page.locator('button:has-text("Получить код")')
  const [otpRes] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/auth/otp/send'), { timeout: 15_000 }),
    sendBtn.click(),
  ])
  const otpStatus = otpRes.status()
  if (otpStatus !== 200) {
    const body = await otpRes.json().catch(() => ({}))
    throw new Error(`OTP send failed ${otpStatus}: ${JSON.stringify(body)}`)
  }

  const codeInput = page.locator('input[inputmode="numeric"]')
  await codeInput.waitFor({ state: 'visible', timeout: 10_000 })
  await codeInput.fill('111111')

  const verifyBtn = page.locator('button:has-text("Подтвердить")')
  const [verifyRes] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/auth/otp/verify'), { timeout: 15_000 }),
    verifyBtn.click(),
  ])
  const verifyStatus = verifyRes.status()
  if (verifyStatus !== 200) {
    const body = await verifyRes.json().catch(() => ({}))
    throw new Error(`OTP verify failed ${verifyStatus}: ${JSON.stringify(body)}`)
  }

  await page.waitForURL(u => !String(u).includes('/auth'), { timeout: 15_000 })

  if (page.url().includes('/pin-setup')) {
    for (let i = 0; i < 4; i++) {
      await page.locator('button').filter({ hasText: '1' }).first().click()
      await page.waitForTimeout(100)
    }
    await page.waitForURL(u => !String(u).includes('/pin-setup'), { timeout: 15_000 }).catch(() => null)
  }

  await page.evaluate(({ pin }: { pin: string }) => {
    localStorage.setItem('etrn_pin', pin)
    const userRaw = localStorage.getItem('etrn_user')
    const user = userRaw ? JSON.parse(userRaw) : {}
    user.onboardingCompleted = true
    user.name = user.name || 'Тест Тестов'
    user.company = user.company || 'ООО Тест'
    user.inn = user.inn || '7707083893'
    localStorage.setItem('etrn_user', JSON.stringify(user))
  }, { pin: PIN })

  await page.goto(APP + '/#/dashboard')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)

  await ctx.storageState({ path: STATE_FILE })
  await page.close()
  return ctx
}

export async function openPage(browser: Browser, path: string): Promise<Page> {
  const ctx = await browser.newContext({ storageState: STATE_FILE })
  const page = await ctx.newPage()
  attachErrorListeners(page, path)
  await page.goto(APP + '/#' + path)
  // SSE connections keep networkidle from resolving — use load + fixed wait
  await page.waitForLoadState('load')
  await page.waitForTimeout(2000)
  return page
}

export function cleanupAuth() {
  if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE)
}
