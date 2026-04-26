import { test, expect, Browser, BrowserContext, Page } from '@playwright/test'
import * as fs from 'fs'

const BASE = 'https://lasamb.tw1.ru/app'
const PIN = '1234'
const TEST_DIGITS = '9000000001'
const STATE_FILE = '/tmp/pw-auth-state.json'

// ─── одна авторизация на весь suite ───────────────────────────────────────────

let authContext: BrowserContext
let authPage: Page

test.beforeAll(async ({ browser }) => {
  authContext = await browser.newContext({ ignoreHTTPSErrors: true })
  authPage = await authContext.newPage()

  // Clear storage
  await authPage.goto(BASE + '/#/')
  await authPage.evaluate(() => { localStorage.clear(); sessionStorage.clear() })

  // Auth page
  await authPage.goto(BASE + '/#/auth')
  await authPage.waitForLoadState('load')
  await authPage.waitForTimeout(1000)

  // Enter phone
  const phoneInput = authPage.locator('input[type="tel"]')
  await phoneInput.click()
  await phoneInput.fill('')
  await phoneInput.type(TEST_DIGITS, { delay: 50 })
  await authPage.screenshot({ path: 'e2e/screenshots/01-phone.png' })

  await authPage.locator('button:has-text("Получить код")').click()
  await expect(authPage.locator('h1:has-text("Введите код")')).toBeVisible({ timeout: 10000 })
  await authPage.screenshot({ path: 'e2e/screenshots/02-code-phase.png' })

  // Enter OTP
  await authPage.locator('input[inputmode="numeric"]').fill('111111')
  await authPage.locator('button:has-text("Подтвердить")').click()
  await authPage.waitForTimeout(3000)
  await authPage.screenshot({ path: 'e2e/screenshots/03-after-verify.png' })

  // After OTP verify, tokens are saved. Now patch localStorage to skip PIN + onboarding.
  await authPage.evaluate(({ pin }) => {
    // Set PIN so app doesn't redirect to pin-setup
    localStorage.setItem('etrn_pin', pin)

    // Mark onboarding complete
    const userRaw = localStorage.getItem('etrn_user')
    const user = userRaw ? JSON.parse(userRaw) : {}
    user.onboardingCompleted = true
    user.name = user.name || 'Тест Тестов'
    user.company = user.company || 'ООО Тест'
    localStorage.setItem('etrn_user', JSON.stringify(user))
  }, { pin: PIN })

  // Navigate to dashboard
  await authPage.goto(BASE + '/#/dashboard')
  await authPage.waitForLoadState('networkidle')
  await authPage.waitForTimeout(2000)
  await authPage.screenshot({ path: 'e2e/screenshots/04-dashboard.png' })
  console.log('Auth complete, URL:', authPage.url())

  // Save storage state for reuse
  await authContext.storageState({ path: STATE_FILE })
})

test.afterAll(async () => {
  await authContext.close()
  if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE)
})

// ─── хелпер: новая вкладка с готовой сессией ────────────────────────────────

async function openPage(browser: Browser, path: string): Promise<Page> {
  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true,
    storageState: STATE_FILE,
  })
  const page = await ctx.newPage()
  await page.goto(BASE + '/#' + path)
  await page.waitForLoadState('load')
  await page.waitForTimeout(3000)
  return page
}

// ─── тесты ──────────────────────────────────────────────────────────────────

test('Dashboard', async ({ browser }) => {
  const page = await openPage(browser, '/dashboard')
  await page.screenshot({ path: 'e2e/screenshots/page-dashboard.png' })
  console.log('URL:', page.url())
  await expect(page.locator('body')).not.toContainText('Uncaught')
  await page.context().close()
})

test('Documents list', async ({ browser }) => {
  const page = await openPage(browser, '/documents')
  await page.screenshot({ path: 'e2e/screenshots/page-documents.png' })
  console.log('URL:', page.url())
  // Check for API errors
  const errors = await page.locator('[class*="error"], [role="alert"]').count()
  console.log('Error elements:', errors)
  await page.context().close()
})

test('Archive', async ({ browser }) => {
  const page = await openPage(browser, '/archive')
  await page.screenshot({ path: 'e2e/screenshots/page-archive.png' })
  console.log('URL:', page.url())
  await page.context().close()
})

test('Profile', async ({ browser }) => {
  const page = await openPage(browser, '/profile')
  await page.screenshot({ path: 'e2e/screenshots/page-profile.png' })
  const toasts = await page.locator('[class*="toast"], [role="alert"]').count()
  console.log('Profile toasts:', toasts)
  if (toasts > 0) console.log('Toast text:', await page.locator('[class*="toast"], [role="alert"]').first().textContent())
  await page.context().close()
})

test('Notifications', async ({ browser }) => {
  const page = await openPage(browser, '/notifications')
  await page.screenshot({ path: 'e2e/screenshots/page-notifications.png' })
  console.log('URL:', page.url())
  await page.context().close()
})

test('Stats', async ({ browser }) => {
  const page = await openPage(browser, '/stats')
  await page.screenshot({ path: 'e2e/screenshots/page-stats.png' })
  console.log('URL:', page.url())
  await page.context().close()
})

test('Payment', async ({ browser }) => {
  const page = await openPage(browser, '/payment')
  await page.screenshot({ path: 'e2e/screenshots/page-payment.png' })
  console.log('URL:', page.url())
  await page.context().close()
})

test('MCD landing', async ({ browser }) => {
  const page = await openPage(browser, '/mcd')
  await page.screenshot({ path: 'e2e/screenshots/page-mcd.png' })
  console.log('URL:', page.url())
  await page.context().close()
})
